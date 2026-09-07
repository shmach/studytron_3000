from course_parser.models import Lesson
from course_parser.parsers.frontmatter import split_frontmatter


def parse_lesson(text: str) -> Lesson:
    metadata, body = split_frontmatter(text)
    return Lesson(**metadata, content=body.lstrip('\n'))
