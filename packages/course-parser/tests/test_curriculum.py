from datetime import date
from pathlib import Path

import pytest

from course_parser.parsers.curriculum import parse_curriculum

FIXTURES_DIR = Path(__file__).parent / 'fixtures'


def _read_fixture(relative_path: str) -> str:
    return (FIXTURES_DIR / relative_path).read_text()


@pytest.fixture(scope='module')
def java_course():
    return parse_curriculum(_read_fixture('java-para-quem-programa/00-curriculum.md'))


@pytest.fixture(scope='module')
def arduino_course():
    return parse_curriculum(_read_fixture('arduino-cpp/00-curriculum.md'))


class TestJavaFixture:
    def test_frontmatter_and_overview(self, java_course):
        assert java_course.slug == 'java-para-quem-programa'
        assert java_course.created == date(2026, 8, 30)
        assert java_course.depth == 'standard'
        assert java_course.overview.startswith('Curso para quem já sabe programar')
        assert java_course.overview.endswith('por conta própria.')
        assert '>' not in java_course.overview

    def test_module_structure(self, java_course):
        assert len(java_course.modules) == 7
        assert sum(len(m.topics) for m in java_course.modules) == 19
        assert sum(len(t.subtopics) for m in java_course.modules for t in m.topics) == 51

    def test_module_title_and_description(self, java_course):
        module = java_course.modules[0]

        assert module.title == 'Ecossistema e primeiros programas'
        assert module.description.startswith('Antes de escrever Java "de verdade"')
        assert module.description.endswith('que o aluno já conhece.')
        assert '\n' not in module.description

    def test_topic_meta_is_parsed(self, java_course):
        topic = java_course.modules[0].topics[0]

        assert topic.meta.id == '1.1'
        assert topic.title == 'JVM, JDK e o modelo de execução'
        assert topic.meta.status == 'completed'
        assert topic.meta.perceived_difficulty is None
        assert topic.meta.weak_points == []
        assert topic.meta.last_reviewed == date(2026, 8, 30)

    def test_pending_topic_has_defaults(self, java_course):
        topic = java_course.modules[0].topics[1]

        assert topic.meta.id == '1.2'
        assert topic.meta.status == 'pending'
        assert topic.meta.last_reviewed is None

    def test_subtopics_join_wrapped_description(self, java_course):
        subtopic = java_course.modules[0].topics[0].subtopics[1]

        assert subtopic.id == '1.1.2'
        assert subtopic.title == 'Compilando e executando pela linha de comando'
        assert subtopic.completed is False
        assert subtopic.description == (
            'usar `javac` e `java` diretamente, sem IDE, para o aluno entender '
            'o que a IDE faz por baixo dos panos.'
        )

    def test_topic_ids_are_sequential_within_modules(self, java_course):
        for module_index, module in enumerate(java_course.modules, start=1):
            for topic_index, topic in enumerate(module.topics, start=1):
                assert topic.meta.id == f'{module_index}.{topic_index}'
                for subtopic_index, subtopic in enumerate(topic.subtopics, start=1):
                    assert subtopic.id == f'{topic.meta.id}.{subtopic_index}'


class TestArduinoFixture:
    def test_module_structure(self, arduino_course):
        assert arduino_course.slug == 'arduino-cpp'
        assert arduino_course.depth == 'quick'
        assert len(arduino_course.modules) == 4
        assert sum(len(t.topics) for t in arduino_course.modules) == 13
        assert sum(len(t.subtopics) for m in arduino_course.modules for t in m.topics) == 38

    def test_all_topics_pending(self, arduino_course):
        statuses = {t.meta.status for m in arduino_course.modules for t in m.topics}

        assert statuses == {'pending'}


MINIMAL_CURRICULUM = """---
course: "Test"
slug: "test"
created: 2026-01-01
depth: quick
level: beginner
goal: "g"
language: en
---

# Test

> Overview line one
> overview line two.

## Module 1 — First

Module description.

### 1.1 Topic A

```topic-meta
id: "1.1"
status: review
perceived_difficulty: hard
weak_points: ["thing one", "thing two"]
last_reviewed: 2026-01-02
```

- [x] **1.1.1 Done sub** — done description.
- [ ] **1.1.2 Open sub** — open description
  continues here.
- [ ] **1.1.3 Dash at line end** —
  description starts on the next line.
"""


class TestSyntheticCurriculum:
    def test_checked_checkbox_marks_subtopic_completed(self):
        course = parse_curriculum(MINIMAL_CURRICULUM)
        topic = course.modules[0].topics[0]

        assert topic.subtopics[0].completed is True
        assert topic.subtopics[1].completed is False
        assert topic.subtopics[1].description == 'open description continues here.'
        assert topic.subtopics[2].title == 'Dash at line end'
        assert topic.subtopics[2].description == 'description starts on the next line.'

    def test_review_meta_with_weak_points(self):
        course = parse_curriculum(MINIMAL_CURRICULUM)
        meta = course.modules[0].topics[0].meta

        assert meta.status == 'review'
        assert meta.perceived_difficulty == 'hard'
        assert meta.weak_points == ['thing one', 'thing two']
        assert meta.last_reviewed == date(2026, 1, 2)

    def test_multiline_overview_is_joined(self):
        course = parse_curriculum(MINIMAL_CURRICULUM)

        assert course.overview == 'Overview line one overview line two.'

    def test_mismatched_topic_meta_id_raises(self):
        text = MINIMAL_CURRICULUM.replace('id: "1.1"', 'id: "9.9"')

        with pytest.raises(ValueError, match='does not match'):
            parse_curriculum(text)

    def test_topic_without_meta_block_raises(self):
        text = MINIMAL_CURRICULUM.replace(
            '```topic-meta\nid: "1.1"\nstatus: review\nperceived_difficulty: hard\n'
            'weak_points: ["thing one", "thing two"]\nlast_reviewed: 2026-01-02\n```\n',
            '',
        )

        with pytest.raises(ValueError, match='topic-meta'):
            parse_curriculum(text)
