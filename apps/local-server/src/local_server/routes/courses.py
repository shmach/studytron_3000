import asyncio
import logging
import threading
from collections.abc import Callable
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
from local_server.prompts import (
    build_course_prompt,
    build_exercises_prompt,
    build_lesson_prompt,
)
from local_server.services.job_store import Job, JobKind, job_store
from local_server.services.local_process import (
    CliTimeoutError,
    InvalidPromptException,
    LocalProcess,
    extract_result,
)
from local_server.services.pending_decisions import pending_decisions_from
from local_server.utils.atomic_write import read_text_exact, write_text_atomic
from local_server.utils.existing_slugs import _existing_slugs

load_dotenv()

logger = logging.getLogger(__name__)

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
        await local_process.run(cwd=env.VAULT_PATH)
    except (InvalidPromptException, RuntimeError) as exc:
        job_store.mark_error(job_id, str(exc))
        return
    except Exception as exc:  # noqa: BLE001 - see _mark_unexpected_error
        _mark_unexpected_error(job_id, exc)
        return

    new_slugs = _existing_slugs() - before
    job_store.mark_done(job_id, slug=next(iter(new_slugs), None))


def _mark_unexpected_error(job_id: str, exc: Exception) -> None:
    """Turn any exception of a background task into an `error` job.

    A background task has no caller to receive its exception: if one escapes, the task dies
    and the job stays `running` forever, which also blocks the course (one job per course).
    The details go to the server log; the job gets a short message.
    """
    logger.exception("Job %s failed unexpectedly", job_id, exc_info=exc)
    job_store.mark_error(job_id, f"Unexpected error: {exc!r}")


def _summarize(text: str, limit: int = 300) -> str:
    return text if len(text) <= limit else text[:limit] + "…"


async def _run_generation(
    job_id: str,
    slug: str,
    topic_id: str,
    prompt: str,
    artifact: str,
    produced: Callable[[CourseBundle], bool],
    collects_decisions: bool = False,
) -> None:
    """Run the agent for a lesson or an exercise set and check that it wrote the file.

    `artifact` names what is being generated (for messages); `produced` says whether the
    reloaded course already contains it. With `collects_decisions` (lessons only), the
    topics the agent left waiting for a status decision are saved in the job.
    """
    job_store.mark_running(job_id)

    timeout_error: CliTimeoutError | None = None
    try:
        local_process = LocalProcess(tool="claude", prompt=prompt)
        stdout = await local_process.run(cwd=env.VAULT_PATH)
        output = extract_result(stdout)
    except CliTimeoutError as exc:
        # The CLI can take minutes to exit after it has already written the file. The file is
        # the proof of the work, so keep going and check for it; the timeout only becomes the
        # job's error if the file is missing. The agent's answer is lost with the killed
        # process, so there is no output and no pending decisions to read.
        timeout_error = exc
        output = ""
    except (InvalidPromptException, RuntimeError) as exc:
        job_store.mark_error(job_id, str(exc))
        return
    except Exception as exc:  # noqa: BLE001 - see _mark_unexpected_error
        _mark_unexpected_error(job_id, exc)
        return

    job_store.set_output(job_id, output)

    # The generated file is the proof the work happened; the agent's own report is not.
    try:
        course_content = await asyncio.to_thread(
            vault.load_course, _course_dir_or_404(slug)
        )
    except (FileNotFoundError, ValueError) as exc:
        job_store.mark_error(job_id, f"Could not read the course afterwards: {exc}")
        return
    except Exception as exc:  # noqa: BLE001 - see _mark_unexpected_error
        _mark_unexpected_error(job_id, exc)
        return

    if not produced(course_content):
        if timeout_error is not None:
            job_store.mark_error(
                job_id,
                f"{timeout_error}, and no {artifact} for topic {topic_id} was written",
            )
            return
        job_store.mark_error(
            job_id,
            f"The agent finished but wrote no {artifact} for topic {topic_id}. "
            f"Its answer: {_summarize(output)}",
        )
        return

    if timeout_error is not None:
        logger.warning(
            "Job %s: %s, but the %s for topic %s was written; marking it done",
            job_id,
            timeout_error,
            artifact,
            topic_id,
        )

    if collects_decisions:
        job_store.set_pending_decisions(
            job_id,
            pending_decisions_from(output, course_content, generated_topic_id=topic_id),
        )

    job_store.mark_done(job_id)


def _topic_or_404(course: CourseBundle, topic_id: str) -> None:
    if _find_topic(course, topic_id) is None:
        raise HTTPException(404, "Topic not found")


def _start_generation(
    background_tasks: BackgroundTasks,
    *,  # Faz com que os próximos parametros sejam obrigatórios a nomeação
    kind: JobKind,
    slug: str,
    topic_id: str,
    prompt: str,
    artifact: str,
    produced: Callable[[CourseBundle], bool],
    collects_decisions: bool = False,
) -> Job:
    """Create the job (refusing a second one for the course) and queue the background run."""
    job = job_store.create_exclusive(kind, slug, topic_id)
    if job is None:
        raise HTTPException(409, "A generation is already running for this course")

    background_tasks.add_task(
        _run_generation,
        job.id,
        slug,
        topic_id,
        prompt,
        artifact,
        produced,
        collects_decisions,
    )
    return job


@router.post(
    "/{slug}/topics/{topic_id}/lesson", operation_id="generate_lesson", status_code=202
)
def generate_lesson(slug: str, topic_id: str, background_tasks: BackgroundTasks) -> Job:
    course_content = _load_course_or_404(slug)
    _topic_or_404(course_content, topic_id)

    if any(lesson.topic == topic_id for lesson in course_content.lessons):
        raise HTTPException(409, "This topic already has a lesson")

    try:
        prompt = build_lesson_prompt(slug, topic_id)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

    return _start_generation(
        background_tasks,
        kind=JobKind.LESSON_GENERATION,
        slug=slug,
        topic_id=topic_id,
        prompt=prompt,
        artifact="lesson",
        produced=lambda course: any(
            lesson.topic == topic_id for lesson in course.lessons
        ),
        collects_decisions=True,
    )


@router.post(
    "/{slug}/topics/{topic_id}/exercises",
    operation_id="generate_exercises",
    status_code=202,
)
def generate_exercises(
    slug: str, topic_id: str, background_tasks: BackgroundTasks
) -> Job:
    course_content = _load_course_or_404(slug)
    _topic_or_404(course_content, topic_id)

    # The skill reads the lesson before writing exercises, so without one the run would
    # fail at the end, after spending time and usage.
    if not any(lesson.topic == topic_id for lesson in course_content.lessons):
        raise HTTPException(409, "Generate the lesson before the exercises")

    if any(e.topic == topic_id for e in course_content.exercise_sets):
        raise HTTPException(409, "This topic already has exercises")

    try:
        prompt = build_exercises_prompt(slug, topic_id)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

    return _start_generation(
        background_tasks,
        kind=JobKind.EXERCISE_GENERATION,
        slug=slug,
        topic_id=topic_id,
        prompt=prompt,
        artifact="exercises",
        produced=lambda course: any(e.topic == topic_id for e in course.exercise_sets),
    )


@router.post("", operation_id="create_course")
async def create_course(user_prompt: str, background_tasks: BackgroundTasks) -> Job:
    if not user_prompt:
        raise HTTPException(400, "Prompt must have a content")

    if not env.VAULT_PATH:
        raise HTTPException(500, "VAULT PATH is not configured")

    prompt = build_course_prompt(user_prompt)

    job = job_store.create()
    background_tasks.add_task(_run_course_creation, job.id, prompt)

    return job


@router.get("/jobs/{job_id}", operation_id="get_job")
def get_job(job_id: str) -> Job:
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job
