import threading
from pathlib import Path

from course_parser import (
    CourseBundle,
    ExerciseSet,
    Lesson,
    Topic,
    TopicNotFoundError,
    TopicStatus,
    set_topic_status,
    vault,
)
from dotenv import load_dotenv
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from local_server.config.env import Env
from local_server.services.job_store import CourseCreationJob, job_store
from local_server.services.local_process import InvalidPromptException, LocalProcess
from local_server.utils.atomic_write import read_text_exact, write_text_atomic
from local_server.utils.existing_slugs import _existing_slugs

load_dotenv()

router = APIRouter(prefix="/courses", tags=["courses"])

env = Env()

# Status updates read the curriculum, change one line and write it back. Without a lock, two
# requests at the same time could both read the old text and the second write would undo the
# first. One lock for the whole process is enough: the local server runs a single worker.
_curriculum_write_lock = threading.Lock()


class TopicStatusUpdate(BaseModel):
    status: TopicStatus


def _course_dir_or_404(slug: str) -> Path:
    """Map `slug` to its folder inside the vault, rejecting anything that could escape it."""
    if not env.VAULT_PATH:
        raise HTTPException(500, "VAULT_PATH is not configured")
    if slug in ("", ".", "..") or "/" in slug or "\\" in slug:
        raise HTTPException(404, "Course not found")

    return Path(env.VAULT_PATH) / slug


def _load_course_or_404(slug: str) -> CourseBundle:
    """Resolve `slug` inside the vault, translating filesystem errors into HTTP ones."""
    course_dir = _course_dir_or_404(slug)

    try:
        return vault.load_course(course_dir)
    except FileNotFoundError as exc:
        raise HTTPException(404, "Course not found") from exc


@router.get("", operation_id="list_courses")
def list_courses() -> list[CourseBundle]:
    if not env.VAULT_PATH:
        raise HTTPException(500, "VAULT_PATH is not configured")
    try:
        return vault.load_vault(Path(env.VAULT_PATH))
    except FileNotFoundError as exc:
        raise HTTPException(500, f"vault not found: {env.VAULT_PATH}") from exc


@router.get("/{slug}", operation_id="get_course")
def get_course_by_slug(slug: str) -> CourseBundle:
    return _load_course_or_404(slug)


@router.delete("/{slug}", operation_id="delete_course", status_code=204)
def delete_course(slug: str) -> None:
    course_dir = _course_dir_or_404(slug)

    try:
        vault.delete_course(course_dir)
    except FileNotFoundError as exc:
        raise HTTPException(404, "Course not found") from exc


@router.get("/{slug}/lessons/{topic_id}", operation_id="get_lesson")
def get_lesson_by_topic(slug: str, topic_id: str) -> Lesson:
    course_content = _load_course_or_404(slug)

    lesson = next((l for l in course_content.lessons if l.topic == topic_id), None)
    if not lesson:
        raise HTTPException(404, "Lesson not found")

    return lesson


@router.get("/{slug}/exercises/{topic_id}", operation_id="get_exercise_set")
def get_exercise_by_topic(slug: str, topic_id: str) -> ExerciseSet:
    course_content = _load_course_or_404(slug)

    exercise = next(
        (e for e in course_content.exercise_sets if e.topic == topic_id), None
    )
    if not exercise:
        raise HTTPException(404, "Exercise not found")

    return exercise


def _find_topic(course: CourseBundle, topic_id: str) -> Topic | None:
    return next(
        (t for m in course.course.modules for t in m.topics if t.meta.id == topic_id),
        None,
    )


@router.patch("/{slug}/topics/{topic_id}/status", operation_id="update_topic_status")
def update_topic_status(slug: str, topic_id: str, body: TopicStatusUpdate) -> Topic:
    course_content = _load_course_or_404(slug)

    if _find_topic(course_content, topic_id) is None:
        raise HTTPException(404, "Topic not found")

    # A topic is only `in_progress` while its lesson is being studied (docs/SPEC.md, section 3).
    if body.status == "in_progress" and not any(
        lesson.topic == topic_id for lesson in course_content.lessons
    ):
        raise HTTPException(
            409, "Generate the lesson before marking the topic as in progress"
        )

    curriculum_path = _course_dir_or_404(slug) / vault.CURRICULUM_FILENAME

    with _curriculum_write_lock:
        try:
            updated_text = set_topic_status(
                read_text_exact(curriculum_path), topic_id, body.status
            )
        except TopicNotFoundError as exc:
            raise HTTPException(404, "Topic not found") from exc
        except ValueError as exc:
            raise HTTPException(500, f"Malformed curriculum: {exc}") from exc

        write_text_atomic(curriculum_path, updated_text)

    # Answer with what the file says now, not with what we expect it to say.
    topic = _find_topic(_load_course_or_404(slug), topic_id)
    if topic is None:
        raise HTTPException(500, "Topic disappeared after the update")
    return topic


async def _run_course_creation(job_id: str, prompt: str) -> None:
    job_store.mark_running(job_id)
    before = _existing_slugs()

    try:
        local_process = LocalProcess(tool="claude", prompt=prompt)
        await local_process.create_course_subprocess(cwd=env.VAULT_PATH)
        # print(f"[create_course] CLI result: {result}") # TODO: apagar depois
    except (InvalidPromptException, RuntimeError) as exc:
        job_store.mark_error(job_id, str(exc))
        return

    new_slugs = _existing_slugs() - before
    job_store.mark_done(job_id, slug=next(iter(new_slugs), None))


@router.post("", operation_id="create_course")
async def create_course(
    user_prompt: str, background_tasks: BackgroundTasks
) -> CourseCreationJob:
    if not user_prompt:
        raise HTTPException(400, "Prompt must have a content")

    if not env.VAULT_PATH:
        raise HTTPException(500, "VAULT PATH is not configured")

    prompt = (
        "Create a structured course using the skill course-builder. "
        "This is a non-interactive, single-shot call — you cannot ask the user "
        "follow-up questions and no one will answer them this turn. If the skill "
        "would normally ask about target depth, starting level, or goal, infer "
        "reasonable defaults from the request below instead of asking, and state "
        "the assumptions you made in your final summary. Proceed directly to "
        f"generating the curriculum.\n\nUser's request: {user_prompt}"
    )

    job = job_store.create()
    print(f"job: {job}")
    background_tasks.add_task(_run_course_creation, job.id, prompt)

    return job


@router.get("/jobs/{job_id}", operation_id="get_course_creation_job")
def get_course_creation_job(job_id: str) -> CourseCreationJob:
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job
