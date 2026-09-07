"""course-parser: turns course-builder Markdown files into Pydantic models."""

from course_parser.cli import main
from course_parser.models import (
    Attempt,
    Course,
    CourseBundle,
    ExerciseSet,
    Lesson,
    Module,
    Subtopic,
    Topic,
    TopicMeta,
)
from course_parser.parsers.curriculum import parse_curriculum
from course_parser.parsers.exercises import parse_attempt, parse_exercise_file, parse_exercise_set
from course_parser.parsers.lesson import parse_lesson
from course_parser.vault import list_course_dirs, load_course, load_vault

__all__ = [
    'Attempt',
    'Course',
    'CourseBundle',
    'ExerciseSet',
    'Lesson',
    'Module',
    'Subtopic',
    'Topic',
    'TopicMeta',
    'list_course_dirs',
    'load_course',
    'load_vault',
    'main',
    'parse_attempt',
    'parse_curriculum',
    'parse_exercise_file',
    'parse_exercise_set',
    'parse_lesson',
]
