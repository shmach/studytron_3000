import asyncio
import json
import subprocess

import pytest
from local_server.services import local_process
from local_server.services.local_process import (
    AgentNotInstalledError,
    CliTimeoutError,
    LocalProcess,
    extract_result,
)

# Same shape as the real output of `claude -p ... --output-format json`, trimmed to the
# fields that matter here.
SUCCESS = {
    "type": "result",
    "subtype": "success",
    "is_error": False,
    "result": "Lesson written.\nPending status decision: 1.1 JVM, JDK e o modelo de execução",
}


class TestExtractResult:
    def test_returns_the_final_text(self):
        assert extract_result(json.dumps(SUCCESS)) == SUCCESS["result"]

    def test_keeps_pending_decision_lines_intact(self):
        result = extract_result(json.dumps(SUCCESS, ensure_ascii=False))

        assert result.splitlines()[-1] == (
            "Pending status decision: 1.1 JVM, JDK e o modelo de execução"
        )

    def test_not_json_is_an_error(self):
        with pytest.raises(RuntimeError, match="not JSON"):
            extract_result("Warning: something\n{broken")

    def test_json_without_result_is_an_error(self):
        with pytest.raises(RuntimeError, match="no `result` text"):
            extract_result(json.dumps({"type": "result", "is_error": False}))

    def test_json_that_is_not_an_object_is_an_error(self):
        with pytest.raises(RuntimeError, match="no `result` text"):
            extract_result(json.dumps(["result"]))

    def test_error_flag_is_an_error_with_the_message(self):
        payload = {**SUCCESS, "is_error": True, "result": "Credit balance is too low"}

        with pytest.raises(RuntimeError, match="Credit balance is too low"):
            extract_result(json.dumps(payload))


class TestRunTimeout:
    def test_a_timeout_raises_the_dedicated_error(self, monkeypatch):
        def hang(command, **kwargs):
            raise subprocess.TimeoutExpired(command, kwargs["timeout"])

        monkeypatch.setattr(local_process.subprocess, "run", hang)
        # The CLI may not be installed where the tests run; pretend it is.
        monkeypatch.setattr(local_process.shutil, "which", lambda name: name)

        with pytest.raises(CliTimeoutError, match="timed out after 300s") as caught:
            asyncio.run(LocalProcess(prompt="hi").run(cwd="."))

        # Callers that only know about `RuntimeError` must keep treating it as a CLI failure.
        assert isinstance(caught.value, RuntimeError)


# Same shape as the real output of `agy -p ... --output-format json`, trimmed.
AGY_SUCCESS = {"conversation_id": "abc", "status": "SUCCESS", "response": "ok\n"}
AGY_ERROR = {
    "conversation_id": "",
    "status": "ERROR",
    "response": "",
    "error": "invalid model selection",
}


class TestExtractResultAntigravity:
    def test_returns_the_response_text(self):
        assert extract_result(json.dumps(AGY_SUCCESS), "antigravity") == "ok\n"

    def test_error_status_is_an_error_with_the_message(self):
        with pytest.raises(RuntimeError, match="invalid model selection"):
            extract_result(json.dumps(AGY_ERROR), "antigravity")

    def test_not_json_is_an_error(self):
        with pytest.raises(RuntimeError, match="antigravity.*not JSON"):
            extract_result("{broken", "antigravity")

    def test_success_without_response_is_an_error(self):
        with pytest.raises(RuntimeError, match="no `response` text"):
            extract_result(json.dumps({"status": "SUCCESS"}), "antigravity")

    def test_the_claude_shape_is_not_accepted(self):
        # Guards against parsing one agent's output with the other agent's reader.
        with pytest.raises(RuntimeError):
            extract_result(json.dumps(SUCCESS), "antigravity")


class TestCommand:
    def test_claude_command(self, monkeypatch):
        monkeypatch.setattr(local_process.shutil, "which", lambda name: f"/bin/{name}")

        command = LocalProcess(tool="claude", prompt="hi").args_for_tool()

        assert command == [
            "/bin/claude",
            "-p",
            "hi",
            "--output-format",
            "json",
            "--dangerously-skip-permissions",
        ]

    def test_antigravity_runs_the_agy_executable(self, monkeypatch):
        monkeypatch.setattr(local_process.shutil, "which", lambda name: f"/bin/{name}")

        command = LocalProcess(tool="antigravity", prompt="hi").args_for_tool()

        assert command[0] == "/bin/agy"
        assert command[1:3] == ["-p", "hi"]

    def test_missing_executable_names_the_agent_and_how_to_install_it(
        self, monkeypatch
    ):
        monkeypatch.setattr(local_process.shutil, "which", lambda name: None)

        with pytest.raises(
            AgentNotInstalledError, match="Antigravity is not installed"
        ) as caught:
            asyncio.run(LocalProcess(tool="antigravity", prompt="hi").run(cwd="."))

        assert "agy" in str(caught.value)
        assert isinstance(caught.value, RuntimeError)

    def test_unknown_tool_is_rejected(self):
        with pytest.raises(ValueError, match="Unknown tool"):
            LocalProcess(tool="gemini", prompt="hi")  # type: ignore[arg-type]
