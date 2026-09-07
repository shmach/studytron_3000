"""Filesystem loader: turns a course folder (or a whole courses root) into models.

This is the `local` storage adapter's read side. Layout, as defined by the skill:

    <courses_root>/
      <course-slug>/
        00-curriculum.md
        lessons/<topic-id>-<slug>.md
        exercises/<topic-id>-<slug>.md
        exercises/<topic-id>-attempt-<n>.md
"""

from collections.abc import Callable
from pathlib import Path

from course_parser.models import Attempt, CourseBundle, ExerciseSet
from course_parser.parsers.curriculum import parse_curriculum
from course_parser.parsers.exercises import parse_exercise_file
from course_parser.parsers.lesson import parse_lesson

CURRICULUM_FILENAME = '00-curriculum.md'
LESSONS_DIR = 'lessons'
EXERCISES_DIR = 'exercises'


def list_course_dirs(root: Path) -> list[Path]:
    """Return every direct child of `root` that holds a curriculum file, sorted by name."""
    root = Path(root)
    if not root.is_dir():
        raise FileNotFoundError(f'courses root not found: {root}')

    return sorted(child for child in root.iterdir() if (child / CURRICULUM_FILENAME).is_file())


def load_course(course_dir: Path) -> CourseBundle:
    course_dir = Path(course_dir)
    curriculum_path = course_dir / CURRICULUM_FILENAME
    if not curriculum_path.is_file():
        raise FileNotFoundError(f'curriculum not found: {curriculum_path}')

    course = _parse_file(curriculum_path, parse_curriculum)
    lessons = [
        _parse_file(path, parse_lesson) for path in _markdown_files(course_dir / LESSONS_DIR)
    ]

    exercise_sets: list[ExerciseSet] = []
    attempts: list[Attempt] = []
    for path in _markdown_files(course_dir / EXERCISES_DIR):
        parsed = _parse_file(path, parse_exercise_file)
        if isinstance(parsed, Attempt):
            attempts.append(parsed)
        else:
            exercise_sets.append(parsed)

    return CourseBundle(
        course=course,
        lessons=sorted(lessons, key=lambda lesson: _topic_sort_key(lesson.topic)),
        exercise_sets=sorted(exercise_sets, key=lambda ex: _topic_sort_key(ex.topic)),
        attempts=sorted(attempts, key=lambda a: (_topic_sort_key(a.topic), a.attempt)),
    )


def load_vault(root: Path) -> list[CourseBundle]:
    return [load_course(course_dir) for course_dir in list_course_dirs(root)]


def _markdown_files(directory: Path) -> list[Path]:
    if not directory.is_dir():
        return []
    return sorted(
        path
        for path in directory.iterdir()
        if path.is_file() and path.suffix == '.md' and not path.name.startswith('.')
    )


def _parse_file[T](path: Path, parser: Callable[[str], T]) -> T:
    try:
        return parser(path.read_text(encoding='utf-8'))
    except ValueError as exc:
        raise ValueError(f'{path}: {exc}') from exc


def _topic_sort_key(topic_id: str) -> tuple[tuple[int, int | str], ...]:
    """Sort '1.10' after '1.2' while still tolerating non-numeric ids."""
    return tuple((0, int(part)) if part.isdigit() else (1, part) for part in topic_id.split('.'))
