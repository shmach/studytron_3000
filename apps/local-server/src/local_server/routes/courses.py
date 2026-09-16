import os
from pathlib import Path

from course_parser import CourseBundle, ExerciseSet, Lesson, vault
from dotenv import load_dotenv
from fastapi import APIRouter, BackgroundTasks, HTTPException

from local_server.services.job_store import CourseCreationJob, job_store
from local_server.services.local_process import InvalidPromptException, LocalProcess
from local_server.utils.existing_slugs import _existing_slugs

load_dotenv()

router = APIRouter(prefix="/courses", tags=["courses"])

vault_path = os.getenv("VAULT_PATH") or None


def _load_course_or_404(slug: str) -> CourseBundle:
    """Resolve `slug` inside the vault, translating filesystem errors into HTTP ones."""
    if not vault_path:
        raise HTTPException(500, "VAULT_PATH is not configured")
    if slug in ("", ".", "..") or "/" in slug or "\\" in slug:
        raise HTTPException(404, "Course not found")

    try:
        return vault.load_course(Path(vault_path) / slug)
    except FileNotFoundError as exc:
        raise HTTPException(404, "Course not found") from exc


@router.get("", operation_id="list_courses")
def list_courses() -> list[CourseBundle]:
    if not vault_path:
        raise HTTPException(500, "VAULT_PATH is not configured")
    try:
        return vault.load_vault(Path(vault_path))
    except FileNotFoundError as exc:
        raise HTTPException(500, f"vault not found: {vault_path}") from exc


@router.get("/{slug}", operation_id="get_course")
def get_course_by_slug(slug: str) -> CourseBundle:
    return _load_course_or_404(slug)


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


async def _run_course_creation(job_id: str, prompt: str) -> None:
    job_store.mark_running(job_id)
    before = _existing_slugs()

    try:
        local_process = LocalProcess(tool="claude", prompt=prompt)
        await local_process.create_course_subprocess(cwd=vault_path)
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

    if not vault_path:
        raise HTTPException(500, "VAULT_PATH is not configured")

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
