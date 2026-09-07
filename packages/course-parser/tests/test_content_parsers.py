from datetime import date
from pathlib import Path

import pytest

from course_parser.models import Attempt, ExerciseSet
from course_parser.parsers.exercises import (
    parse_attempt,
    parse_exercise_file,
    parse_exercise_set,
)
from course_parser.parsers.lesson import parse_lesson

FIXTURES_DIR = Path(__file__).parent / 'fixtures'
JAVA = 'java-para-quem-programa'


def _read_fixture(relative_path: str) -> str:
    return (FIXTURES_DIR / relative_path).read_text()


class TestParseLesson:
    def test_parses_fixture(self):
        lesson = parse_lesson(_read_fixture(f'{JAVA}/lessons/1-1-jvm-jdk-modelo-de-execucao.md'))

        assert lesson.course == JAVA
        assert lesson.topic == '1.1'
        assert lesson.title == 'JVM, JDK e o modelo de execução'
        assert lesson.generated == date(2026, 8, 30)
        assert lesson.covers == ['1.1.1', '1.1.2', '1.1.3']

    def test_content_is_body_without_frontmatter_or_leading_blank_lines(self):
        lesson = parse_lesson(_read_fixture(f'{JAVA}/lessons/1-1-jvm-jdk-modelo-de-execucao.md'))

        assert lesson.content.startswith('# 1.1 — JVM, JDK e o modelo de execução\n')
        assert '## Key takeaways' in lesson.content
        assert 'covers:' not in lesson.content

    def test_missing_required_field_raises(self):
        text = '---\ncourse: "c"\ntopic: "1.1"\n---\n# Body\n'

        with pytest.raises(ValueError):
            parse_lesson(text)


class TestParseExerciseSet:
    def test_parses_fixture(self):
        exercise_set = parse_exercise_set(
            _read_fixture(f'{JAVA}/exercises/1-1-jvm-jdk-modelo-de-execucao.md')
        )

        assert exercise_set.course == JAVA
        assert exercise_set.topic == '1.1'
        assert exercise_set.generated == date(2026, 8, 30)
        assert exercise_set.difficulty_target == 2
        assert exercise_set.content.startswith(
            '# Exercises — 1.1 JVM, JDK e o modelo de execução\n'
        )
        assert '## Challenge' in exercise_set.content


class TestParseAttempt:
    def test_parses_fixture(self):
        attempt = parse_attempt(_read_fixture(f'{JAVA}/exercises/1-1-attempt-1.md'))

        assert attempt.course == JAVA
        assert attempt.topic == '1.1'
        assert attempt.attempt == 1
        assert attempt.date == date(2026, 8, 31)
        assert attempt.score == '5/7'
        assert attempt.result == 'mixed'
        assert attempt.weak_points == [
            'invoca `java` com a extensão `.class`',
            'papel do JIT na execução do bytecode',
        ]
        assert attempt.content.startswith('# Attempt 1 — 1.1 JVM, JDK e o modelo de execução\n')


class TestParseExerciseFile:
    def test_dispatches_to_attempt_when_attempt_field_present(self):
        parsed = parse_exercise_file(_read_fixture(f'{JAVA}/exercises/1-1-attempt-1.md'))

        assert isinstance(parsed, Attempt)

    def test_dispatches_to_exercise_set_otherwise(self):
        parsed = parse_exercise_file(
            _read_fixture(f'{JAVA}/exercises/1-1-jvm-jdk-modelo-de-execucao.md')
        )

        assert isinstance(parsed, ExerciseSet)
