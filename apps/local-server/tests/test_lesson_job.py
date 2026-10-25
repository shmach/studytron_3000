import json
import shutil

import pytest
from conftest import FIXTURES_DIR, SLUG
from fastapi.testclient import TestClient
from local_server.app import app
from local_server.routes import courses
from local_server.services.job_store import JobKind

# Topic 1.1 already has a lesson in the fixture; 1.2 and 1.3 do not.
TOPIC_WITH_LESSON = "1.1"
TOPIC = "1.2"
OTHER_TOPIC = "1.3"
EXISTING_LESSON = "lessons/1-1-jvm-jdk-modelo-de-execucao.md"


def _fake_cli(
    monkeypatch,
    vault_dir,
    *,
    topic_id=TOPIC,
    write_lesson=True,
    result="Lesson written.",
    is_error=False,
    raises=None,
):
    """Replace the real agent CLI. Returns the list of prompts it was called with.

    When `write_lesson` is true it does what the skill would: write the lesson file.
    """
    prompts: list[str] = []

    async def fake_run(self, cwd):
        prompts.append(self.prompt)
        if raises is not None:
            raise raises
        if write_lesson:
            original = (vault_dir / SLUG / EXISTING_LESSON).read_bytes().decode("utf-8")
            text = original.replace('topic: "1.1"', f'topic: "{topic_id}"')
            lesson_path = (
                vault_dir / SLUG / "lessons" / f"{topic_id.replace('.', '-')}-fake.md"
            )
            lesson_path.write_bytes(text.encode("utf-8"))
        return json.dumps({"type": "result", "is_error": is_error, "result": result})

    monkeypatch.setattr(courses.LocalProcess, "run", fake_run)
    return prompts


def _post(client: TestClient, topic_id: str = TOPIC, slug: str = SLUG):
    return client.post(f"/courses/{slug}/topics/{topic_id}/lesson")


def _job(client: TestClient, job_id: str) -> dict:
    response = client.get(f"/courses/jobs/{job_id}")
    assert response.status_code == 200
    return response.json()


class TestGenerateLesson:
    def test_creates_the_lesson_and_finishes_the_job(
        self, client, vault_dir, monkeypatch
    ):
        prompts = _fake_cli(monkeypatch, vault_dir)

        response = _post(client)

        assert response.status_code == 202
        created = response.json()
        assert created["kind"] == "lesson_generation"
        assert created["slug"] == SLUG
        assert created["topic_id"] == TOPIC

        # The TestClient runs background tasks before returning, so the job is finished now.
        job = _job(client, created["id"])
        assert job["status"] == "done"
        assert job["error"] is None
        assert client.get(f"/courses/{SLUG}/lessons/{TOPIC}").status_code == 200

        assert len(prompts) == 1
        assert f"topic {TOPIC} " in prompts[0]
        assert f"`{SLUG}`" in prompts[0]
        assert "no user is present" in prompts[0]

    def test_fails_when_the_agent_wrote_no_lesson(self, client, vault_dir, monkeypatch):
        _fake_cli(monkeypatch, vault_dir, write_lesson=False, result="I did nothing")

        job = _job(client, _post(client).json()["id"])

        assert job["status"] == "error"
        assert f"no lesson for topic {TOPIC}" in job["error"]
        assert "I did nothing" in job["error"]

    def test_fails_when_the_cli_fails(self, client, vault_dir, monkeypatch):
        _fake_cli(
            monkeypatch, vault_dir, raises=RuntimeError("claude timed out after 300s")
        )

        job = _job(client, _post(client).json()["id"])

        assert job["status"] == "error"
        assert job["error"] == "claude timed out after 300s"

    def test_fails_when_the_cli_reports_an_error(self, client, vault_dir, monkeypatch):
        _fake_cli(
            monkeypatch,
            vault_dir,
            write_lesson=False,
            is_error=True,
            result="Rate limited",
        )

        job = _job(client, _post(client).json()["id"])

        assert job["status"] == "error"
        assert "Rate limited" in job["error"]

    def test_the_agent_output_is_not_exposed(self, client, vault_dir, monkeypatch):
        _fake_cli(monkeypatch, vault_dir, result="secret agent output")

        job = _job(client, _post(client).json()["id"])

        assert "output" not in job
        schema = app.openapi()["components"]["schemas"]["Job"]["properties"]
        assert "output" not in schema

    def test_unknown_course_is_404(self, client, vault_dir, monkeypatch):
        _fake_cli(monkeypatch, vault_dir)

        assert _post(client, slug="nope").status_code == 404

    def test_unknown_topic_is_404(self, client, vault_dir, monkeypatch):
        prompts = _fake_cli(monkeypatch, vault_dir)

        assert _post(client, topic_id="99.99").status_code == 404
        assert prompts == []

    def test_existing_lesson_is_a_conflict(self, client, vault_dir, monkeypatch):
        prompts = _fake_cli(monkeypatch, vault_dir)

        assert _post(client, topic_id=TOPIC_WITH_LESSON).status_code == 409
        assert prompts == []

    def test_a_running_job_for_the_course_is_a_conflict(
        self, client, vault_dir, monkeypatch
    ):
        prompts = _fake_cli(monkeypatch, vault_dir)
        courses.job_store.create_exclusive(JobKind.LESSON_GENERATION, SLUG, OTHER_TOPIC)

        assert _post(client).status_code == 409
        assert prompts == []

    def test_a_finished_job_does_not_block_the_next_one(
        self, client, vault_dir, monkeypatch
    ):
        _fake_cli(monkeypatch, vault_dir)
        assert _post(client).status_code == 202

        _fake_cli(monkeypatch, vault_dir, topic_id=OTHER_TOPIC)
        assert _post(client, topic_id=OTHER_TOPIC).status_code == 202

    def test_a_course_with_an_unsafe_slug_is_refused(
        self, client, vault_dir, monkeypatch
    ):
        prompts = _fake_cli(monkeypatch, vault_dir)
        shutil.copytree(FIXTURES_DIR / SLUG, vault_dir / "has space")

        response = _post(client, slug="has space")

        assert response.status_code == 422
        assert prompts == []


class TestCourseCreationStillWorks:
    """The job store was generalised for lessons; creating a course must behave as before."""

    @pytest.fixture(autouse=True)
    def _vault_env(self, vault_dir, monkeypatch):
        # `_existing_slugs` reads the environment variable, not `courses.env`.
        monkeypatch.setenv("VAULT_PATH", str(vault_dir))

    def test_job_finishes_with_the_new_slug(self, client, vault_dir, monkeypatch):
        async def fake_run(self, cwd):
            (vault_dir / "novo-curso").mkdir()
            return json.dumps({"type": "result", "is_error": False, "result": "ok"})

        monkeypatch.setattr(courses.LocalProcess, "run", fake_run)

        created = client.post(
            "/courses", params={"user_prompt": "Quero aprender Rust"}
        ).json()

        assert created["kind"] == "course_creation"
        job = _job(client, created["id"])
        assert job["status"] == "done"
        assert job["slug"] == "novo-curso"

    def test_cli_failure_becomes_an_error_job(self, client, vault_dir, monkeypatch):
        async def fake_run(self, cwd):
            raise RuntimeError("claude failed: boom")

        monkeypatch.setattr(courses.LocalProcess, "run", fake_run)

        created = client.post("/courses", params={"user_prompt": "Rust"}).json()

        job = _job(client, created["id"])
        assert job["status"] == "error"
        assert job["error"] == "claude failed: boom"

    def test_unknown_job_is_404(self, client):
        assert client.get("/courses/jobs/nope").status_code == 404
