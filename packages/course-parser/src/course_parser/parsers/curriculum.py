import re

import yaml

from course_parser.models import Course, Module, Subtopic, Topic, TopicMeta
from course_parser.parsers.frontmatter import split_frontmatter

MODULE_HEADING = re.compile(r'^## Module \d+ — (.+)$')
TOPIC_HEADING = re.compile(r'^### ([\d.]+) (.+)$')
TOPIC_META_FENCE = '```topic-meta'
FENCE_END = '```'
SUBTOPIC_START = re.compile(r'^- \[( |x)\] \*\*([\d.]+) (.+?)\*\* —(?: (.*))?$')


def parse_curriculum(text: str) -> Course:
    metadata, body = split_frontmatter(text)
    lines = body.replace('\r\n', '\n').split('\n')

    overview_parts: list[str] = []
    modules: list[Module] = []

    current_module: dict | None = None
    current_topic: dict | None = None
    in_topic_meta = False

    def flush_topic() -> None:
        nonlocal current_topic
        if current_topic is None:
            return

        if not current_topic['meta_lines']:
            raise ValueError(
                f'topic {current_topic["heading_id"]!r} is missing its topic-meta block'
            )

        meta_dict = yaml.safe_load('\n'.join(current_topic['meta_lines'])) or {}
        meta = TopicMeta(**meta_dict)
        if meta.id != current_topic['heading_id']:
            raise ValueError(
                f'topic heading id {current_topic["heading_id"]!r} does not match '
                f'topic-meta id {meta.id!r}'
            )

        subtopics = [
            Subtopic(
                id=s['id'],
                title=s['title'],
                description=' '.join(s['description_parts']).strip(),
                completed=s['completed'],
            )
            for s in current_topic['subtopics']
        ]
        topic = Topic(meta=meta, title=current_topic['title'], subtopics=subtopics)
        current_module['topics'].append(topic)
        current_topic = None

    def flush_module() -> None:
        nonlocal current_module
        if current_module is None:
            return

        flush_topic()
        modules.append(
            Module(
                title=current_module['title'],
                description=' '.join(current_module['description']).strip(),
                topics=current_module['topics'],
            )
        )
        current_module = None

    for raw_line in lines:
        line = raw_line.rstrip()

        if in_topic_meta:
            if line.strip() == FENCE_END:
                in_topic_meta = False
            else:
                current_topic['meta_lines'].append(line)
            continue

        module_match = MODULE_HEADING.match(line)
        if module_match:
            flush_module()
            current_module = {
                'title': module_match.group(1).strip(),
                'description': [],
                'topics': [],
            }
            continue

        topic_match = TOPIC_HEADING.match(line)
        if topic_match:
            flush_topic()
            current_topic = {
                'heading_id': topic_match.group(1),
                'title': topic_match.group(2).strip(),
                'meta_lines': [],
                'subtopics': [],
            }
            continue

        if line.strip() == TOPIC_META_FENCE:
            in_topic_meta = True
            continue

        subtopic_match = SUBTOPIC_START.match(line)
        if subtopic_match:
            current_topic['subtopics'].append(
                {
                    'completed': subtopic_match.group(1) == 'x',
                    'id': subtopic_match.group(2),
                    'title': subtopic_match.group(3).strip(),
                    'description_parts': [(subtopic_match.group(4) or '').strip()],
                }
            )
            continue

        stripped = line.strip()
        if not stripped:
            continue

        if current_module is None:
            if stripped.startswith('>'):
                overview_parts.append(stripped.lstrip('>').strip())
            continue

        if current_topic is None:
            current_module['description'].append(stripped)
            continue

        if current_topic['subtopics']:
            current_topic['subtopics'][-1]['description_parts'].append(stripped)

    flush_module()

    return Course(
        **metadata,
        overview=' '.join(overview_parts).strip(),
        modules=modules,
    )
