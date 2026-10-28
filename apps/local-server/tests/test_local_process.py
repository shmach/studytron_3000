import asyncio
import json
import subprocess

import pytest
from local_server.services import local_process
from local_server.services.local_process import (
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

        with pytest.raises(CliTimeoutError, match="timed out after 300s") as caught:
            asyncio.run(LocalProcess(prompt="hi").run(cwd="."))

        # Callers that only know about `RuntimeError` must keep treating it as a CLI failure.
        assert isinstance(caught.value, RuntimeError)
