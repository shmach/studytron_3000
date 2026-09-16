import asyncio
import subprocess


class InvalidPromptException(Exception):
    """Raised when no prompt is provided"""


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

    async def create_course_subprocess(self, cwd: str):
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
