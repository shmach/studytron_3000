import asyncio
import shutil
import subprocess

from local_server.services.agents import AGENTS, AgentId


class InvalidPromptException(Exception):
    """Raised when no prompt is provided"""


class AgentNotInstalledError(RuntimeError):
    """Raised when the agent's executable is not on the `PATH`.

    A `RuntimeError` on purpose, like `CliTimeoutError`: callers that only care about "the CLI
    failed" turn it into an error job without knowing about this class.
    """


class CliTimeoutError(RuntimeError):
    """Raised when the agent CLI is killed for running longer than `CLI_TIMEOUT_SECONDS`.

    It is a `RuntimeError` on purpose: callers that only care about "the CLI failed" keep
    working. Callers that can still use the work done before the timeout (the agent may have
    written its file and only been slow to exit) catch this subclass first.
    """


CLI_TIMEOUT_SECONDS = 300


def extract_result(stdout: str, tool: AgentId = "claude") -> str:
    """Return the final text an agent printed in JSON mode (see `agents.py` for each format)."""
    return AGENTS[tool].parse_result(stdout)


def resolve_executable(tool: AgentId) -> str:
    """Return the full path of the agent's executable, or raise `AgentNotInstalledError`.

    `which` finds the real file, including Windows `.exe`/`.cmd` shims, and tells us up front
    when the agent is missing instead of failing inside `subprocess.run`. Routes call it too,
    to refuse a request before creating a job that could only fail.
    """
    agent = AGENTS[tool]
    executable = shutil.which(agent.executable)
    if executable is None:
        raise AgentNotInstalledError(
            f"{agent.display_name} is not installed: `{agent.executable}` was not found "
            f"on the PATH. {agent.install_hint}"
        )
    return executable


class LocalProcess:
    def __init__(self, tool: AgentId = "claude", prompt: str | None = None):
        if tool not in AGENTS:
            raise ValueError(f"Unknown tool: {tool}")
        self.tool = tool
        self.prompt = prompt

    def args_for_tool(self) -> list[str]:
        """The full command: the executable, resolved on the `PATH`, then the agent's flags."""
        return [
            resolve_executable(self.tool),
            *AGENTS[self.tool].build_args(self.prompt or ""),
        ]

    async def run(self, cwd: str) -> str:
        """Run the agent CLI in `cwd` and return its raw stdout."""
        if not self.prompt:
            raise InvalidPromptException("Prompt is required.")

        command = self.args_for_tool()

        try:
            result = await asyncio.to_thread(
                subprocess.run,
                command,
                cwd=cwd,
                capture_output=True,
                timeout=CLI_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired as exc:
            raise CliTimeoutError(
                f"{self.tool} timed out after {CLI_TIMEOUT_SECONDS}s"
            ) from exc

        if result.returncode == 0:
            return result.stdout.decode().strip()
        else:
            raise RuntimeError(f"{self.tool} failed: {result.stderr.decode().strip()}")
