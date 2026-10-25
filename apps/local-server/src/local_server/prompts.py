"""Prompts the server sends to the agent CLI.

They live here, away from the routes, so the rules for non-interactive runs (no person on the
other end of the call) are written in one place and are easy to keep in sync.
"""

import re

# "1", "1.2", "1.2.3". Anything else (spaces, quotes, newlines...) could smuggle extra
# instructions into the prompt, so it is refused before being interpolated.
_TOPIC_ID = re.compile(r"^\d+(\.\d+)*$")
# Letters, digits, "_" and "-" only: no path separators, dots or whitespace.
_SLUG = re.compile(r"^[\w-]+$")

PENDING_DECISION_PREFIX = "Pending status decision:"


def build_course_prompt(user_prompt: str) -> str:
    return (
        "Create a structured course using the skill course-builder. "
        "This is a non-interactive, single-shot call — you cannot ask the user "
        "follow-up questions and no one will answer them this turn. If the skill "
        "would normally ask about target depth, starting level, or goal, infer "
        "reasonable defaults from the request below instead of asking, and state "
        "the assumptions you made in your final summary. Proceed directly to "
        f"generating the curriculum.\n\nUser's request: {user_prompt}"
    )


def build_lesson_prompt(slug: str, topic_id: str) -> str:
    if not _SLUG.fullmatch(slug):
        raise ValueError(f"Invalid course slug: {slug!r}")
    if not _TOPIC_ID.fullmatch(topic_id):
        raise ValueError(f"Invalid topic id: {topic_id!r}")

    return (
        "Using the skill course-builder, generate the lesson for topic "
        f"{topic_id} of the course in the folder `{slug}` (inside the current directory).\n\n"
        "This is a non-interactive, single-shot call: no user is present, you cannot ask "
        "questions and no one will answer them. Follow the skill's non-interactive rules:\n"
        "- Never ask a question. Use the defaults defined in the workflow.\n"
        "- Leave every topic whose status is `in_progress` unchanged. Do not mark any topic "
        "`completed` or `review` on the student's behalf.\n"
        "- Generate only the lesson, not the exercises.\n\n"
        "End your final answer with one line for each topic that still needs a status "
        "decision from the student, in exactly this format, as plain text (no bullet, no "
        f"quotes, no code formatting): `{PENDING_DECISION_PREFIX} <topic id> <topic title>`. "
        "If no topic needs a decision, write no such line."
    )
