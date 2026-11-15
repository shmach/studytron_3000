import json

from conftest import SLUG
from local_server.routes import courses
from local_server.services import local_process

ANTIGRAVITY_OK = json.dumps({"status": "SUCCESS", "response": "all done"})


def _install_recorder(monkeypatch, stdout):
    """Replace the CLI with a fake that records which agent was asked to run."""
    tools: list[str] = []

    async def fake_run(self, cwd):
        tools.append(self.tool)
        return stdout

    monkeypatch.setattr(courses.LocalProcess, "run", fake_run)
    return tools


def _job(client, job_id):
    return client.get(f"/courses/jobs/{job_id}").json()


class TestGenerationUsesTheChosenAgent:
    def test_lesson_runs_the_agent_from_the_settings(self, client, monkeypatch):
        tools = _install_recorder(monkeypatch, ANTIGRAVITY_OK)
        client.patch("/settings", json={"agent": "antigravity"})

        created = client.post(f"/courses/{SLUG}/topics/1.2/lesson").json()

        assert tools == ["antigravity"]
        # The answer was read with Antigravity's parser (the Claude one rejects this shape),
        # so the job reached the "no file was written" check and quoted the agent's answer.
        assert "Its answer: all done" in _job(client, created["id"])["error"]

    def test_exercises_run_the_agent_from_the_settings(
        self, client, monkeypatch, vault_dir
    ):
        # Topic 1.1 has a lesson and exercises in the fixture; drop the exercises so it is
        # eligible to have them generated.
        for path in (vault_dir / SLUG / "exercises").glob("1-1-*.md"):
            path.unlink()
        tools = _install_recorder(monkeypatch, ANTIGRAVITY_OK)
        client.patch("/settings", json={"agent": "antigravity"})

        created = client.post(f"/courses/{SLUG}/topics/1.1/exercises").json()

        assert tools == ["antigravity"]
        assert "Its answer: all done" in _job(client, created["id"])["error"]

    def test_course_creation_runs_the_agent_from_the_settings(
        self, client, monkeypatch
    ):
        tools = _install_recorder(monkeypatch, ANTIGRAVITY_OK)
        client.patch("/settings", json={"agent": "antigravity"})

        client.post("/courses", params={"user_prompt": "Rust"})

        assert tools == ["antigravity"]

    def test_claude_is_the_default(self, client, monkeypatch):
        tools = _install_recorder(monkeypatch, json.dumps({"result": "ok"}))

        client.post("/courses", params={"user_prompt": "Rust"})

        assert tools == ["claude"]


class TestMissingAgentIsRefusedBeforeAnyJob:
    def _uninstall(self, monkeypatch):
        monkeypatch.setattr(local_process.shutil, "which", lambda name: None)

    def test_lesson(self, client, monkeypatch, fresh_job_store):
        self._uninstall(monkeypatch)
        client.patch("/settings", json={"agent": "antigravity"})

        response = client.post(f"/courses/{SLUG}/topics/1.2/lesson")

        assert response.status_code == 422
        assert "Antigravity is not installed" in response.json()["detail"]
        assert "agy" in response.json()["detail"]
        assert fresh_job_store.list_jobs() == []

    def test_course_creation(self, client, monkeypatch, fresh_job_store):
        self._uninstall(monkeypatch)

        response = client.post("/courses", params={"user_prompt": "Rust"})

        assert response.status_code == 422
        assert "Claude Code is not installed" in response.json()["detail"]
        assert fresh_job_store.list_jobs() == []
