import subprocess

import pytest
from local_server.services import agent_check


def _completed(returncode=0, stdout="", stderr=""):
    return subprocess.CompletedProcess([], returncode, stdout, stderr)


@pytest.fixture
def installed(monkeypatch):
    monkeypatch.setattr(agent_check.shutil, "which", lambda name: f"/bin/{name}")


def _run_returns(monkeypatch, result):
    calls = []

    def fake_run(command, **kwargs):
        calls.append((command, kwargs))
        return result

    monkeypatch.setattr(agent_check.subprocess, "run", fake_run)
    return calls


class TestCheckRoute:
    def test_available_agent_reports_its_version(self, client, installed, monkeypatch):
        calls = _run_returns(monkeypatch, _completed(stdout="2.1.312 (Claude Code)\n"))

        response = client.post("/agents/claude/check")

        assert response.status_code == 200
        assert response.json() == {
            "available": True,
            "version": "2.1.312 (Claude Code)",
            "error": None,
        }
        command, kwargs = calls[0]
        assert command == ["/bin/claude", "--version"]
        assert kwargs["timeout"] == agent_check.CHECK_TIMEOUT_SECONDS

    def test_antigravity_checks_the_agy_executable(
        self, client, installed, monkeypatch
    ):
        calls = _run_returns(monkeypatch, _completed(stdout="1.2.9"))

        client.post("/agents/antigravity/check")

        assert calls[0][0] == ["/bin/agy", "--version"]

    def test_missing_agent_is_a_200_with_how_to_install(self, client, monkeypatch):
        monkeypatch.setattr(agent_check.shutil, "which", lambda name: None)
        calls = _run_returns(monkeypatch, _completed())

        response = client.post("/agents/antigravity/check")

        assert response.status_code == 200
        body = response.json()
        assert body["available"] is False
        assert "Antigravity" in body["error"]
        assert "agy" in body["error"]
        assert calls == []  # no process is started for a missing executable

    def test_unknown_agent_is_rejected(self, client):
        assert client.post("/agents/rm/check").status_code == 422


class TestCheckAgent:
    def test_timeout_is_unavailable(self, installed, monkeypatch):
        def hang(command, **kwargs):
            raise subprocess.TimeoutExpired(command, kwargs["timeout"])

        monkeypatch.setattr(agent_check.subprocess, "run", hang)

        result = agent_check.check_agent("claude")

        assert result.available is False
        assert "did not answer" in result.error

    def test_nonzero_exit_is_unavailable_with_stderr(self, installed, monkeypatch):
        _run_returns(monkeypatch, _completed(returncode=1, stderr="broken install\n"))

        result = agent_check.check_agent("claude")

        assert result.available is False
        assert "broken install" in result.error

    def test_nonzero_exit_without_stderr_shows_the_code(self, installed, monkeypatch):
        _run_returns(monkeypatch, _completed(returncode=3))

        assert "exit code 3" in agent_check.check_agent("claude").error

    def test_process_that_cannot_start_is_unavailable(self, installed, monkeypatch):
        def refuse(command, **kwargs):
            raise PermissionError("denied")

        monkeypatch.setattr(agent_check.subprocess, "run", refuse)

        result = agent_check.check_agent("claude")

        assert result.available is False
        assert "denied" in result.error

    def test_version_on_stderr_is_used_when_stdout_is_empty(
        self, installed, monkeypatch
    ):
        _run_returns(monkeypatch, _completed(stderr="1.0.0\n"))

        assert agent_check.check_agent("claude").version == "1.0.0"

    def test_only_the_first_line_is_the_version(self, installed, monkeypatch):
        _run_returns(monkeypatch, _completed(stdout="1.2.9\nbuild abc\n"))

        assert agent_check.check_agent("antigravity").version == "1.2.9"
