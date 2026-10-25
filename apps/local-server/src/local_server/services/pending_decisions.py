"""Turn the agent's closing "Pending status decision" lines into checked decisions.

When the skill runs with nobody to ask, it leaves the topics the student was studying as
`in_progress` and ends its answer with one line per topic, in the format the lesson prompt
asks for (see `prompts.PENDING_DECISION_PREFIX`). The app then asks the student and answers
through the status route.

The agent's text is only a hint. What the student is asked comes from the curriculum.
"""

import re

from course_parser import CourseBundle

from local_server.prompts import PENDING_DECISION_PREFIX
from local_server.services.job_store import PendingDecision

# One line, e.g. `Pending status decision: 1.1 JVM, JDK e o modelo de execução`. The model
# sometimes dresses the line up even when asked for plain text, so a leading list marker and
# `**` or backticks around the prefix are tolerated. The id must be a topic id ("1", "1.2",
# "1.2.3") followed by a space, a closing mark or the end of the line.
_LINE = re.compile(
    rf"^(?:[-*•]\s+)?[`*]*{re.escape(PENDING_DECISION_PREFIX)}[`*]*\s*"
    r"(?P<id>\d+(?:\.\d+)*)(?=[\s`*]|$)"
)


def parse_pending_decision_ids(output: str) -> list[str]:
    """Topic ids named by `Pending status decision:` lines, in order, without repeats."""
    ids: list[str] = []
    for line in output.splitlines():
        match = _LINE.match(line.strip())
        if match and match["id"] not in ids:
            ids.append(match["id"])
    return ids


def pending_decisions_from(
    output: str, course: CourseBundle, *, generated_topic_id: str
) -> list[PendingDecision]:
    """Decisions to ask the student, checked against the curriculum as it is now.

    A topic is kept only if it exists, is `in_progress` right now, and is not the topic whose
    lesson was just generated (the agent marks that one `in_progress` itself, but the student
    has not studied it yet). The title comes from the curriculum, not from the agent's line.
    """
    topics = {t.meta.id: t for m in course.course.modules for t in m.topics}

    decisions: list[PendingDecision] = []
    for topic_id in parse_pending_decision_ids(output):
        topic = topics.get(topic_id)
        if topic is None or topic_id == generated_topic_id:
            continue
        if topic.meta.status != "in_progress":
            continue
        decisions.append(PendingDecision(topic_id=topic_id, title=topic.title))
    return decisions
