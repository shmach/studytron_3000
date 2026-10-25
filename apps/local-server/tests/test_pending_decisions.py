import pytest
from conftest import FIXTURES_DIR, SLUG
from course_parser import load_course, set_topic_status
from fastapi.testclient import TestClient
from local_server.app import app
from local_server.prompts import PENDING_DECISION_PREFIX
from local_server.services.job_store import JobKind, PendingDecision
from local_server.services.pending_decisions import (
    parse_pending_decision_ids,
    pending_decisions_from,
)

TITLE_1_1 = "JVM, JDK e o modelo de execução"
LINE_1_1 = f"{PENDING_DECISION_PREFIX} 1.1 {TITLE_1_1}"


class TestParsePendingDecisionIds:
    def test_reads_a_plain_line(self):
        assert parse_pending_decision_ids(LINE_1_1) == ["1.1"]

    def test_reads_the_line_at_the_end_of_a_longer_answer(self):
        output = (
            f"Gerei a aula do tópico 1.2.\n\n- Conteúdo: três subtópicos.\n\n{LINE_1_1}"
        )

        assert parse_pending_decision_ids(output) == ["1.1"]

    def test_reads_several_lines_in_order(self):
        output = "\n".join(
            [
                f"{PENDING_DECISION_PREFIX} 2.3 Outro",
                f"{PENDING_DECISION_PREFIX} 1.1 Primeiro",
            ]
        )

        assert parse_pending_decision_ids(output) == ["2.3", "1.1"]

    def test_repeated_ids_are_listed_once(self):
        output = f"{LINE_1_1}\n{LINE_1_1}"

        assert parse_pending_decision_ids(output) == ["1.1"]

    @pytest.mark.parametrize(
        "line",
        [
            f"- {LINE_1_1}",
            f"* {LINE_1_1}",
            f"• {LINE_1_1}",
            f"`{LINE_1_1}`",
            f"**{PENDING_DECISION_PREFIX}** 1.1 {TITLE_1_1}",
            f"  {LINE_1_1}  ",
            f"{PENDING_DECISION_PREFIX} 1.1",
            f"{PENDING_DECISION_PREFIX}1.1 {TITLE_1_1}",
        ],
    )
    def test_tolerates_the_decorations_the_model_may_add(self, line):
        assert parse_pending_decision_ids(line) == ["1.1"]

    def test_accepts_windows_line_endings(self):
        output = f"Pronto.\r\n{LINE_1_1}\r\n"

        assert parse_pending_decision_ids(output) == ["1.1"]

    @pytest.mark.parametrize("topic_id", ["1", "12", "1.2", "10.11.12"])
    def test_accepts_numeric_topic_ids(self, topic_id):
        assert parse_pending_decision_ids(
            f"{PENDING_DECISION_PREFIX} {topic_id} X"
        ) == [topic_id]

    @pytest.mark.parametrize(
        "line",
        [
            "",
            "Nenhum tópico precisa de decisão de status.",
            f"Veja: {LINE_1_1}",  # the prefix is not at the start of the line
            "Pending status decision 1.1 Título",  # no colon
            f"{PENDING_DECISION_PREFIX} Título sem id",
            f"{PENDING_DECISION_PREFIX} abc Título",
            f"{PENDING_DECISION_PREFIX} 1. Título",
            f"{PENDING_DECISION_PREFIX} 1.1. Título",
            f"{PENDING_DECISION_PREFIX} 1.1: Título",
            f"{PENDING_DECISION_PREFIX}",
            LINE_1_1.lower(),
            LINE_1_1.upper(),
        ],
    )
    def test_ignores_lines_that_are_not_a_decision(self, line):
        assert parse_pending_decision_ids(line) == []


@pytest.fixture
def course(vault_dir):
    """The fixture course as a bundle; topic 1.1 is `completed`, the rest `pending`."""
    return load_course(vault_dir / SLUG)


def _course_with(vault_dir, topic_id: str, status: str):
    curriculum = vault_dir / SLUG / "00-curriculum.md"
    text = curriculum.read_bytes().decode("utf-8")
    curriculum.write_bytes(set_topic_status(text, topic_id, status).encode("utf-8"))
    return load_course(vault_dir / SLUG)


class TestPendingDecisionsFrom:
    def test_keeps_an_in_progress_topic_with_the_curriculum_title(self, vault_dir):
        course = _course_with(vault_dir, "1.1", "in_progress")

        # The agent's own title is wrong on purpose: the curriculum's title wins.
        decisions = pending_decisions_from(
            f"{PENDING_DECISION_PREFIX} 1.1 titulo errado",
            course,
            generated_topic_id="1.2",
        )

        assert decisions == [PendingDecision(topic_id="1.1", title=TITLE_1_1)]

    @pytest.mark.parametrize("status", ["pending", "completed", "review"])
    def test_drops_a_topic_that_is_not_in_progress(self, vault_dir, status):
        course = _course_with(vault_dir, "1.1", status)

        assert pending_decisions_from(LINE_1_1, course, generated_topic_id="1.2") == []

    def test_drops_a_topic_that_does_not_exist(self, course):
        output = f"{PENDING_DECISION_PREFIX} 99.9 Inventado"

        assert pending_decisions_from(output, course, generated_topic_id="1.2") == []

    def test_drops_the_topic_that_was_just_generated(self, vault_dir):
        course = _course_with(vault_dir, "1.1", "in_progress")

        assert pending_decisions_from(LINE_1_1, course, generated_topic_id="1.1") == []

    def test_keeps_the_order_of_the_agent_lines(self, vault_dir):
        _course_with(vault_dir, "1.1", "in_progress")
        course = _course_with(vault_dir, "1.2", "in_progress")
        output = f"{PENDING_DECISION_PREFIX} 1.2 B\n{PENDING_DECISION_PREFIX} 1.1 A"

        decisions = pending_decisions_from(output, course, generated_topic_id="1.3")

        assert [d.topic_id for d in decisions] == ["1.2", "1.1"]

    def test_no_lines_means_no_decisions(self, vault_dir):
        course = _course_with(vault_dir, "1.1", "in_progress")

        assert (
            pending_decisions_from("Tudo certo.", course, generated_topic_id="1.2")
            == []
        )


def _make_in_progress(client: TestClient, topic_id: str) -> None:
    response = client.patch(
        f"/courses/{SLUG}/topics/{topic_id}/status", json={"status": "in_progress"}
    )
    assert response.status_code == 200


def _job(client: TestClient, job_id: str) -> dict:
    return client.get(f"/courses/jobs/{job_id}").json()


class TestLessonJobPendingDecisions:
    def test_the_job_carries_the_decision_for_the_previous_topic(
        self, client, fake_cli
    ):
        _make_in_progress(client, "1.1")
        fake_cli(writes="lesson", result=f"Aula gerada.\n\n{LINE_1_1}")

        created = client.post(f"/courses/{SLUG}/topics/1.2/lesson").json()

        job = _job(client, created["id"])
        assert job["status"] == "done"
        assert job["pending_decisions"] == [{"topic_id": "1.1", "title": TITLE_1_1}]

    def test_the_decisions_are_also_in_the_job_list(self, client, fake_cli):
        _make_in_progress(client, "1.1")
        fake_cli(writes="lesson", result=LINE_1_1)
        client.post(f"/courses/{SLUG}/topics/1.2/lesson")

        [listed] = client.get("/jobs").json()

        assert listed["pending_decisions"] == [{"topic_id": "1.1", "title": TITLE_1_1}]

    def test_no_decision_when_the_agent_names_a_topic_that_is_not_in_progress(
        self, client, fake_cli
    ):
        # Topic 1.1 is `completed` in the fixture.
        fake_cli(writes="lesson", result=LINE_1_1)

        created = client.post(f"/courses/{SLUG}/topics/1.2/lesson").json()

        assert _job(client, created["id"])["pending_decisions"] == []

    def test_no_decision_when_the_agent_writes_no_line(self, client, fake_cli):
        _make_in_progress(client, "1.1")
        fake_cli(writes="lesson", result="Aula gerada.")

        created = client.post(f"/courses/{SLUG}/topics/1.2/lesson").json()

        assert _job(client, created["id"])["pending_decisions"] == []

    def test_a_failed_lesson_job_has_no_decisions(self, client, fake_cli):
        _make_in_progress(client, "1.1")
        fake_cli(result=LINE_1_1)  # the agent wrote no lesson file

        created = client.post(f"/courses/{SLUG}/topics/1.2/lesson").json()

        job = _job(client, created["id"])
        assert job["status"] == "error"
        assert job["pending_decisions"] == []

    def test_exercise_jobs_never_have_decisions(self, client, vault_dir, fake_cli):
        _make_in_progress(client, "1.1")
        # Give topic 1.2 a lesson so the exercises route accepts it.
        lessons = vault_dir / SLUG / "lessons"
        sample = (
            FIXTURES_DIR / SLUG / "lessons" / "1-1-jvm-jdk-modelo-de-execucao.md"
        ).read_bytes()
        (lessons / "1-2-lesson.md").write_bytes(
            sample.decode("utf-8")
            .replace('topic: "1.1"', 'topic: "1.2"')
            .encode("utf-8")
        )
        fake_cli(writes="exercises", result=LINE_1_1)

        created = client.post(f"/courses/{SLUG}/topics/1.2/exercises").json()

        job = _job(client, created["id"])
        assert job["kind"] == JobKind.EXERCISE_GENERATION
        assert job["status"] == "done"
        assert job["pending_decisions"] == []

    def test_the_field_is_in_the_openapi_contract(self):
        schemas = app.openapi()["components"]["schemas"]

        assert "pending_decisions" in schemas["Job"]["properties"]
        assert set(schemas["PendingDecision"]["properties"]) == {"topic_id", "title"}
