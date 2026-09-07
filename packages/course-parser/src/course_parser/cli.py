"""`course-parser` command: dump a course (or a whole courses root) as JSON."""

import argparse
import json
import sys
from pathlib import Path

from course_parser.vault import CURRICULUM_FILENAME, load_course, load_vault


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog='course-parser',
        description=(
            'Parse course-builder Markdown into JSON. PATH may be a single course folder '
            f'(containing {CURRICULUM_FILENAME}) or a courses root holding several of them.'
        ),
    )
    parser.add_argument('path', type=Path, help='course folder or courses root')
    parser.add_argument(
        '--compact', action='store_true', help='single-line JSON instead of indented output'
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    try:
        if (args.path / CURRICULUM_FILENAME).is_file():
            payload = load_course(args.path).model_dump(mode='json')
        else:
            payload = [bundle.model_dump(mode='json') for bundle in load_vault(args.path)]
    except (FileNotFoundError, ValueError) as exc:
        print(f'course-parser: {exc}', file=sys.stderr)
        return 1

    indent = None if args.compact else 2
    print(json.dumps(payload, indent=indent, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
