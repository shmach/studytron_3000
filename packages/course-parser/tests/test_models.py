from datetime import date
from pathlib import Path

import pytest
from pydantic import ValidationError

from course_parser.models import (
    Attempt,
    Course,
    ExerciseSet,
    Lesson,
    Module,
    Subtopic,
    Topic,
    TopicMeta,
)
from course_parser.parsers.frontmatter import split_frontmatter

FIXTURES_DIR = Path(__file__).parent / 'fixtures'


def _read_fixture(relative_path: str) -> str:
    return (FIXTURES_DIR / relative_path).read_text()


class TestTopicMeta:
    def test_defaults_to_pending_with_no_weak_points(self):
        meta = TopicMeta(id='1.1')

        assert meta.status == 'pending'
        assert meta.perceived_difficulty is None
        assert meta.weak_points == []
        assert meta.last_reviewed is None

    def test_accepts_completed_status_with_review_data(self):
        meta = TopicMeta(
            id='1.1',
            status='completed',
            perceived_difficulty='hard',
            weak_points=['generics', 'streams'],
            last_reviewed=date(2026, 8, 30),
        )

        assert meta.status == 'completed'
        assert meta.weak_points == ['generics', 'streams']

    def test_rejects_invalid_status(self):
        with pytest.raises(ValidationError):
            TopicMeta(id='1.1', status='done')


class TestTopicAndModule:
    def test_builds_topic_with_subtopics(self):
        topic = Topic(
            meta=TopicMeta(id='1.1'),
            title='JVM, JDK e o modelo de execução',
            subtopics=[
                Subtopic(id='1.1.1', title='O que é a JVM', description='...'),
                Subtopic(id='1.1.2', title='Compilando', description='...', completed=True),
            ],
        )

        assert topic.meta.id == '1.1'
        assert len(topic.subtopics) == 2
        assert topic.subtopics[1].completed is True

    def test_module_groups_topics(self):
        module = Module(
            title='Module 1 — Ecossistema e primeiros programas',
            description='...',
            topics=[
                Topic(meta=TopicMeta(id='1.1'), title='...', subtopics=[]),
            ],
        )

        assert len(module.topics) == 1


class TestCourse:
    def test_builds_course_from_curriculum_frontmatter(self):
        text = _read_fixture('java-para-quem-programa/00-curriculum.md')
        metadata, _ = split_frontmatter(text)

        course = Course(**metadata, overview='...', modules=[])

        assert course.slug == 'java-para-quem-programa'
        assert course.depth == 'standard'
        assert course.modules == []

    def test_rejects_invalid_depth(self):
        text = _read_fixture('java-para-quem-programa/00-curriculum.md')
        metadata, _ = split_frontmatter(text)
        metadata['depth'] = 'extreme'

        with pytest.raises(ValidationError):
            Course(**metadata, overview='...', modules=[])


class TestLesson:
    def test_builds_lesson_from_fixture_frontmatter_and_body(self):
        text = _read_fixture('java-para-quem-programa/lessons/1-1-jvm-jdk-modelo-de-execucao.md')
        metadata, body = split_frontmatter(text)

        lesson = Lesson(**metadata, content=body)

        assert lesson.course == 'java-para-quem-programa'
        assert lesson.topic == '1.1'
        assert lesson.covers == ['1.1.1', '1.1.2', '1.1.3']
        assert lesson.content == body


class TestExerciseSet:
    def test_builds_exercise_set_from_fixture_frontmatter_and_body(self):
        text = _read_fixture('java-para-quem-programa/exercises/1-1-jvm-jdk-modelo-de-execucao.md')
        metadata, body = split_frontmatter(text)

        exercise_set = ExerciseSet(**metadata, content=body)

        assert exercise_set.topic == '1.1'
        assert exercise_set.difficulty_target == 2
        assert exercise_set.content == body


class TestAttempt:
    def test_builds_attempt_with_weak_points(self):
        attempt = Attempt(
            course='java-para-quem-programa',
            topic='1.1',
            attempt=1,
            date=date(2026, 8, 30),
            score='4/6',
            result='mixed',
            weak_points=['javac vs java'],
            content='...',
        )

        assert attempt.result == 'mixed'
        assert attempt.weak_points == ['javac vs java']

    def test_rejects_invalid_result(self):
        with pytest.raises(ValidationError):
            Attempt(
                course='java-para-quem-programa',
                topic='1.1',
                attempt=1,
                date=date(2026, 8, 30),
                score='4/6',
                result='great',
                content='...',
            )
