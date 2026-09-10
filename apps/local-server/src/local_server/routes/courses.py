import os
from pathlib import Path

from course_parser import CourseBundle, ExerciseSet, Lesson, vault
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

load_dotenv()

router = APIRouter(prefix="/courses", tags=["courses"])

vault_path = os.getenv("VAULT_PATH") or None


def _load_course_or_404(slug: str) -> CourseBundle:
    """Resolve `slug` inside the vault, translating filesystem errors into HTTP ones."""
    if not vault_path:
        raise HTTPException(500, "VAULT_PATH is not configured")
    # A slug is a single folder name; refuse anything that could escape the vault.
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
