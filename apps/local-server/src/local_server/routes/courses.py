import os

from course_parser import CourseBundle, ExerciseSet, Lesson, vault
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

load_dotenv()

router = APIRouter(prefix="/courses", tags=["courses"])

vault_path = os.getenv("VAULT_PATH") or None


@router.get("/")
def get_vault_path() -> list[CourseBundle]:
    vault_content = vault.load_vault(vault_path)
    return vault_content


@router.get("/{slug}")
def get_course_by_slug(slug: str) -> CourseBundle:
    course_path = f"{vault_path}/{slug}"
    course_content = vault.load_course(course_path)
    return course_content


@router.get("/{slug}/lessons/{topic_id}")
def get_lesson_by_topic(slug: str, topic_id: str) -> Lesson:
    course_path = f"{vault_path}/{slug}"
    course_content: CourseBundle = vault.load_course(course_path)

    lesson = next((l for l in course_content.lessons if l.topic == topic_id), None)
    if not lesson:
        raise HTTPException(404, "Lesson not found")

    return lesson


@router.get("/{slug}/exercises/{topic_id}")
def get_exercise_by_topic(slug: str, topic_id: str) -> ExerciseSet:
    course_path = f"{vault_path}/{slug}"
    course_content: CourseBundle = vault.load_course(course_path)

    exercise = next(
        (e for e in course_content.exercise_sets if e.topic == topic_id), None
    )
    if not exercise:
        raise HTTPException(404, "Exercise not found")

    return exercise
