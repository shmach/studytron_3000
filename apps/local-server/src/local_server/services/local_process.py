import asyncio
import json
import subprocess


class InvalidPromptException(Exception):
    """Raised when no prompt is provided"""


def extract_result(stdout: str) -> str:
    """Return the agent's final text from the JSON printed by `claude -p --output-format json`.

    The CLI prints one JSON object with `type: "result"`, an `is_error` flag and the final
    answer in `result`.
    """
    try:
        payload = json.loads(stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("claude printed output that is not JSON") from exc

    result = payload.get("result") if isinstance(payload, dict) else None
    if not isinstance(result, str):
        # Bad output from the external tool, not a type bug of our caller: not a TypeError.
        raise RuntimeError("claude output has no `result` text")  # noqa: TRY004
    if payload.get("is_error"):
        raise RuntimeError(f"claude reported an error: {result}")

    return result


class LocalProcess:
    def __init__(self, tool: str = "claude", prompt: str | None = None):
        self.tool = tool
        self.prompt = prompt

    def args_for_tool(self):
        if self.tool == "claude":
            return [
                "claude",
                "-p",
                self.prompt,
                "--output-format",
                "json",
                "--dangerously-skip-permissions",
            ]

        raise ValueError(f"Unknown tool: {self.tool}")

    async def run(self, cwd: str) -> str:
        """Run the agent CLI in `cwd` and return its raw stdout."""
        if not self.prompt:
            raise InvalidPromptException("Prompt is required.")

        command = self.args_for_tool()

        try:
            result = await asyncio.to_thread(
                subprocess.run, command, cwd=cwd, capture_output=True, timeout=300
            )
        except subprocess.TimeoutExpired:
            raise RuntimeError(f"{self.tool} timed out after 300s")

        if result.returncode == 0:
            return result.stdout.decode().strip()
        else:
            raise RuntimeError(f"{self.tool} failed: {result.stderr.decode().strip()}")
