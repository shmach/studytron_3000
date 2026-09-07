from course_parser.models import Attempt, ExerciseSet
from course_parser.parsers.frontmatter import split_frontmatter


def parse_exercise_set(text: str) -> ExerciseSet:
    metadata, body = split_frontmatter(text)
    return ExerciseSet(**metadata, content=body.lstrip('\n'))


def parse_attempt(text: str) -> Attempt:
    metadata, body = split_frontmatter(text)
    return Attempt(**metadata, content=body.lstrip('\n'))


def parse_exercise_file(text: str) -> ExerciseSet | Attempt:
    """Parse any file under `exercises/`, telling sets and attempts apart by front matter.

    Attempt records carry an `attempt` field; exercise sets never do.
    """
    metadata, body = split_frontmatter(text)
    content = body.lstrip('\n')
    if 'attempt' in metadata:
        return Attempt(**metadata, content=content)
    return ExerciseSet(**metadata, content=content)
