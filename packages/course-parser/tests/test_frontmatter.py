from datetime import date
from pathlib import Path

import pytest

from course_parser.parsers.frontmatter import split_frontmatter

FIXTURES_DIR = Path(__file__).parent / 'fixtures'


def _read_fixture(relative_path: str) -> str:
    return (FIXTURES_DIR / relative_path).read_text()


def test_splits_metadata_and_body():
    text = '---\ntitle: "Hello"\ncount: 3\n---\n# Body\n\nSome content.\n'

    metadata, body = split_frontmatter(text)

    assert metadata == {'title': 'Hello', 'count': 3}
    assert body == '# Body\n\nSome content.\n'


def test_raises_when_frontmatter_missing():
    text = '# Just a heading\n\nNo frontmatter here.\n'

    with pytest.raises(ValueError, match='front matter'):
        split_frontmatter(text)


def test_normalizes_crlf_line_endings():
    text = '---\r\ntitle: "Hello"\r\n---\r\nBody line\r\n'

    metadata, body = split_frontmatter(text)

    assert metadata == {'title': 'Hello'}
    assert body == 'Body line\n'


def test_empty_frontmatter_block_returns_empty_dict():
    text = '---\n---\nBody only\n'

    metadata, body = split_frontmatter(text)

    assert metadata == {}
    assert body == 'Body only\n'


def test_ignores_comments_inline_with_values():
    text = '---\ndepth: standard          # quick | standard | deep\n---\nBody\n'

    metadata, _ = split_frontmatter(text)

    assert metadata == {'depth': 'standard'}


def test_parses_java_curriculum_fixture_frontmatter():
    text = _read_fixture('java-para-quem-programa/00-curriculum.md')

    metadata, body = split_frontmatter(text)

    assert metadata == {
        'course': 'Java para quem já programa',
        'slug': 'java-para-quem-programa',
        'created': date(2026, 8, 30),
        'depth': 'standard',
        'level': 'beginner',
        'goal': (
            'Aprender Java com solidez (sintaxe, OOP, coleções, exceções, streams) '
            'para uso geral, sem repetir fundamentos de programação já conhecidos'
        ),
        'language': 'pt-BR',
    }
    assert body.startswith('\n# Java para quem já programa\n')


def test_parses_arduino_curriculum_fixture_frontmatter():
    text = _read_fixture('arduino-cpp/00-curriculum.md')

    metadata, _ = split_frontmatter(text)

    assert metadata['slug'] == 'arduino-cpp'
    assert metadata['depth'] == 'quick'
    assert metadata['level'] == 'beginner'


def test_parses_lesson_fixture_frontmatter():
    text = _read_fixture('java-para-quem-programa/lessons/1-1-jvm-jdk-modelo-de-execucao.md')

    metadata, body = split_frontmatter(text)

    assert metadata == {
        'course': 'java-para-quem-programa',
        'topic': '1.1',
        'title': 'JVM, JDK e o modelo de execução',
        'generated': date(2026, 8, 30),
        'covers': ['1.1.1', '1.1.2', '1.1.3'],
    }
    assert body.startswith('\n# 1.1 — JVM, JDK e o modelo de execução\n')


def test_parses_exercise_fixture_frontmatter():
    text = _read_fixture('java-para-quem-programa/exercises/1-1-jvm-jdk-modelo-de-execucao.md')

    metadata, body = split_frontmatter(text)

    assert metadata == {
        'course': 'java-para-quem-programa',
        'topic': '1.1',
        'generated': date(2026, 8, 30),
        'difficulty_target': 2,
    }
    assert body.startswith('\n# Exercises — 1.1')
