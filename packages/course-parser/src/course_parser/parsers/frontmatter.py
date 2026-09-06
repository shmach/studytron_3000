import re

import yaml

FRONTMATTER_PATTERN = re.compile(r'\A---\n(.*?)\n?---\n?', re.DOTALL)


def split_frontmatter(text: str) -> tuple[dict, str]:
    text = text.replace('\r\n', '\n')
    match = FRONTMATTER_PATTERN.match(text)
    if not match:
        raise ValueError('file is missing YAML front matter')

    metadata = yaml.safe_load(match.group(1)) or {}
    body = text[match.end() :]
    return metadata, body
