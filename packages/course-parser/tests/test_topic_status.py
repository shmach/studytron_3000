from pathlib import Path

import pytest

from course_parser.parsers.curriculum import parse_curriculum
from course_parser.writers import TopicNotFoundError, set_topic_status

FIXTURES_DIR = Path(__file__).parent / 'fixtures'

# Two topics whose ids share a prefix: "1.1" must not match "1.10".
TWO_TOPICS = """### 1.1 Primeiro
```topic-meta
id: "1.1"
status: pending
```

- [ ] **1.1.1 Subtópico** — escopo.

### 1.10 Décimo
```topic-meta
id: "1.10"
status: pending
```
"""


def _java_curriculum() -> str:
    return (FIXTURES_DIR / 'java-para-quem-programa' / '00-curriculum.md').read_text(
        encoding='utf-8'
    )


def _status_lines(text: str) -> list[str]:
    return [line for line in text.splitlines() if line.startswith('status:')]


class TestSetTopicStatus:
    def test_changes_only_the_status_line_of_the_topic(self):
        original = _java_curriculum()

        updated = set_topic_status(original, '1.2', 'completed')

        original_lines = original.splitlines(keepends=True)
        updated_lines = updated.splitlines(keepends=True)
        assert len(original_lines) == len(updated_lines)

        changed = [
            (old, new) for old, new in zip(original_lines, updated_lines, strict=True) if old != new
        ]
        assert len(changed) == 1
        old, new = changed[0]
        assert old.startswith('status:')
        assert new == 'status: completed\n'

    def test_result_parses_with_the_new_status(self):
        original = _java_curriculum()

        before = parse_curriculum(original)
        after = parse_curriculum(set_topic_status(original, '1.2', 'in_progress'))

        before_topic = before.modules[0].topics[1]
        after_topic = after.modules[0].topics[1]
        assert before_topic.meta.id == after_topic.meta.id == '1.2'
        assert after_topic.meta.status == 'in_progress'
        assert after_topic.model_dump(exclude={'meta'}) == before_topic.model_dump(exclude={'meta'})

    def test_does_not_touch_a_topic_with_a_longer_id(self):
        updated = set_topic_status(TWO_TOPICS, '1.1', 'completed')

        assert updated.count('status: completed') == 1
        assert 'status: pending' in updated.split('### 1.10')[1]

    def test_updates_the_second_topic_when_asked(self):
        updated = set_topic_status(TWO_TOPICS, '1.10', 'review')

        before_second = TWO_TOPICS.split('### 1.10')[1]
        after_second = updated.split('### 1.10')[1]
        assert before_second != after_second
        assert 'status: review' in after_second
        assert updated.split('### 1.10')[0] == TWO_TOPICS.split('### 1.10')[0]

    def test_keeps_crlf_line_endings(self):
        crlf_text = _java_curriculum().replace('\n', '\r\n')

        updated = set_topic_status(crlf_text, '1.2', 'review')

        assert '\r\n' in updated
        assert updated.count('\r\n') == crlf_text.count('\r\n')
        assert '\n' not in updated.replace('\r\n', '')
        assert 'status: review\r\n' in updated

    def test_keeps_trailing_comment_on_the_status_line(self):
        text = """### 2.1 Tópico
```topic-meta
id: "2.1"
status: pending          # pending | in_progress | completed | review
```
"""

        updated = set_topic_status(text, '2.1', 'completed')

        assert 'status: completed          # pending | in_progress | completed | review' in updated

    def test_unknown_topic_raises_not_found(self):
        with pytest.raises(TopicNotFoundError):
            set_topic_status(TWO_TOPICS, '9.9', 'completed')

    def test_invalid_status_is_rejected_before_touching_the_text(self):
        with pytest.raises(ValueError, match='invalid topic status'):
            set_topic_status(TWO_TOPICS, '1.1', 'done')  # type: ignore[arg-type]

    def test_topic_without_meta_block_raises(self):
        text = """### 3.1 Sem metadados

- [ ] **3.1.1 Subtópico** — escopo.
"""

        with pytest.raises(ValueError, match='no topic-meta block'):
            set_topic_status(text, '3.1', 'completed')

    def test_meta_block_without_status_raises(self):
        text = """### 4.1 Sem status
```topic-meta
id: "4.1"
last_reviewed:
```
"""

        with pytest.raises(ValueError, match='no status line'):
            set_topic_status(text, '4.1', 'completed')

    def test_topic_id_with_regex_characters_is_matched_literally(self):
        # The id is escaped, so a dot is a dot and not "any character".
        text = """### 1x1 Falso
```topic-meta
status: pending
```
"""

        with pytest.raises(TopicNotFoundError):
            set_topic_status(text, '1.1', 'completed')
