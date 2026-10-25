"""Surgical update of a topic's `status` inside 00-curriculum.md.

The vault is the source of truth and the student may have edited the file by
hand in Obsidian, so this module never re-renders the curriculum. It finds the
one `status:` line that belongs to the requested topic and replaces its value,
leaving every other byte of the file untouched.
"""

import re
from typing import get_args

from course_parser.models import TopicStatus

META_FENCE = '```topic-meta'
FENCE_END = '```'
STATUS_LINE = re.compile(r'^(status:\s*)(\S+)(.*)$')


class TopicNotFoundError(ValueError):
    """Raised when the curriculum has no topic with the requested id."""


def set_topic_status(text: str, topic_id: str, status: TopicStatus) -> str:
    """Return `text` with the `status` of topic `topic_id` set to `status`.

    Pure function: takes the file contents and returns the new contents. The
    caller decides how to read and write the file.
    """
    if status not in get_args(TopicStatus):
        raise ValueError(f'invalid topic status: {status!r}')

    # splitlines(keepends=True) keeps each line's own ending (\n or \r\n), so
    # joining the lines back reproduces the original file exactly.
    lines = text.splitlines(keepends=True)

    heading_index = _find_heading(lines, topic_id)
    fence_index = _find_meta_fence(lines, heading_index, topic_id)
    status_index = _find_status_line(lines, fence_index, topic_id)

    lines[status_index] = _with_new_status(lines[status_index], status)
    return ''.join(lines)


def _find_heading(lines: list[str], topic_id: str) -> int:
    # `\s` after the id (not `.`) makes "1.1" match only "### 1.1 ..." and never
    # "### 1.10 ...". re.escape protects the dots and any other special character.
    heading = re.compile(rf'^### {re.escape(topic_id)}\s')

    for index, line in enumerate(lines):
        if heading.match(line):
            return index

    raise TopicNotFoundError(f'topic {topic_id!r} not found')


def _find_meta_fence(lines: list[str], heading_index: int, topic_id: str) -> int:
    # The topic-meta block sits between the topic heading and the next heading.
    for index in range(heading_index + 1, len(lines)):
        line = lines[index]
        if line.startswith(('## ', '### ')):
            break
        if line.strip() == META_FENCE:
            return index

    raise ValueError(f'topic {topic_id!r} has no topic-meta block')


def _find_status_line(lines: list[str], fence_index: int, topic_id: str) -> int:
    for index in range(fence_index + 1, len(lines)):
        line = lines[index]
        if line.strip() == FENCE_END:
            break
        if line.startswith('status:'):
            return index

    raise ValueError(f'topic {topic_id!r} has no status line in topic-meta')


def _with_new_status(line: str, status: str) -> str:
    # Split the line into content and its ending, so the ending survives as-is.
    content = line.rstrip('\r\n')
    ending = line[len(content) :]

    match = STATUS_LINE.match(content)
    if match is None:
        raise ValueError(f'malformed status line: {content!r}')

    prefix, _old_value, suffix = match.groups()
    # `suffix` keeps any trailing comment, e.g. "# pending | in_progress | ...".
    return f'{prefix}{status}{suffix}{ending}'
