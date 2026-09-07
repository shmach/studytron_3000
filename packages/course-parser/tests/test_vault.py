import shutil
from pathlib import Path

import pytest

from course_parser.models import CourseBundle
from course_parser.vault import list_course_dirs, load_course, load_vault

FIXTURES_DIR = Path(__file__).parent / 'fixtures'
JAVA = 'java-para-quem-programa'


class TestListCourseDirs:
    def test_finds_every_dir_with_a_curriculum(self):
        dirs = list_course_dirs(FIXTURES_DIR)

        assert [d.name for d in dirs] == ['arduino-cpp', JAVA]

    def test_ignores_dirs_without_curriculum(self, tmp_path):
        (tmp_path / 'notes').mkdir()
        (tmp_path / 'notes' / 'random.md').write_text('# hi\n')
        shutil.copytree(FIXTURES_DIR / 'arduino-cpp', tmp_path / 'arduino-cpp')

        assert [d.name for d in list_course_dirs(tmp_path)] == ['arduino-cpp']

    def test_missing_root_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            list_course_dirs(tmp_path / 'nope')


class TestLoadCourse:
    def test_bundles_curriculum_lessons_and_exercises(self):
        bundle = load_course(FIXTURES_DIR / JAVA)

        assert isinstance(bundle, CourseBundle)
        assert bundle.course.slug == JAVA
        assert [lesson.topic for lesson in bundle.lessons] == ['1.1']
        assert [ex.topic for ex in bundle.exercise_sets] == ['1.1']
        assert [(a.topic, a.attempt) for a in bundle.attempts] == [('1.1', 1)]

    def test_course_without_lessons_or_exercises_dirs(self):
        bundle = load_course(FIXTURES_DIR / 'arduino-cpp')

        assert bundle.course.slug == 'arduino-cpp'
        assert bundle.lessons == []
        assert bundle.exercise_sets == []
        assert bundle.attempts == []

    def test_lessons_are_sorted_by_topic_id(self, tmp_path):
        course_dir = tmp_path / JAVA
        shutil.copytree(FIXTURES_DIR / JAVA, course_dir)
        original = (course_dir / 'lessons' / '1-1-jvm-jdk-modelo-de-execucao.md').read_text()
        (course_dir / 'lessons' / '1-10-late.md').write_text(
            original.replace('topic: "1.1"', 'topic: "1.10"')
        )
        (course_dir / 'lessons' / '1-2-second.md').write_text(
            original.replace('topic: "1.1"', 'topic: "1.2"')
        )

        bundle = load_course(course_dir)

        assert [lesson.topic for lesson in bundle.lessons] == ['1.1', '1.2', '1.10']

    def test_non_markdown_files_are_ignored(self, tmp_path):
        course_dir = tmp_path / JAVA
        shutil.copytree(FIXTURES_DIR / JAVA, course_dir)
        (course_dir / 'lessons' / 'scratch.txt').write_text('not markdown')
        (course_dir / 'lessons' / '.hidden.md').write_text('no frontmatter')

        bundle = load_course(course_dir)

        assert len(bundle.lessons) == 1

    def test_missing_curriculum_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            load_course(tmp_path)

    def test_bad_lesson_reports_file_path(self, tmp_path):
        course_dir = tmp_path / JAVA
        shutil.copytree(FIXTURES_DIR / JAVA, course_dir)
        (course_dir / 'lessons' / 'broken.md').write_text('# no front matter\n')

        with pytest.raises(ValueError, match='broken.md'):
            load_course(course_dir)


class TestLoadVault:
    def test_loads_every_course_under_root(self):
        bundles = load_vault(FIXTURES_DIR)

        assert [b.course.slug for b in bundles] == ['arduino-cpp', JAVA]
