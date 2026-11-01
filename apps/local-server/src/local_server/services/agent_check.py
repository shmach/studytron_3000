"""Check that an agent CLI is installed and answers, without spending any tokens."""

import shutil
import subprocess

from pydantic import BaseModel

from local_server.services.agents import AGENTS, AgentId

CHECK_TIMEOUT_SECONDS = 5


class AgentCheck(BaseModel):
    available: bool
    # First line of `<executable> --version`; only set when the agent is available.
    version: str | None = None
    # Why the agent is not available, ready to show to the student.
    error: str | None = None


def check_agent(agent_id: AgentId) -> AgentCheck:
    """Look for the executable on the `PATH`, then ask it for its version.

    Never raises: every way of failing becomes `available=False` with a message, because
    "the agent is missing" is an answer to this question, not an error of the request.
    """
    agent = AGENTS[agent_id]

    # `which` first: it needs no process, so a missing agent is answered immediately.
    executable = shutil.which(agent.executable)
    if executable is None:
        return AgentCheck(
            available=False,
            error=(
                f"{agent.display_name} is not installed: `{agent.executable}` was not "
                f"found on the PATH. {agent.install_hint}"
            ),
        )

    try:
        result = subprocess.run(
            [executable, "--version"],
            # A non-zero exit is handled below as an answer, not raised.
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=CHECK_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return AgentCheck(
            available=False,
            error=(
                f"{agent.display_name} did not answer `--version` within "
                f"{CHECK_TIMEOUT_SECONDS}s"
            ),
        )
    except OSError as exc:
        return AgentCheck(
            available=False,
            error=f"{agent.display_name} could not be started: {exc}",
        )

    if result.returncode != 0:
        detail = result.stderr.strip() or f"exit code {result.returncode}"
        return AgentCheck(
            available=False,
            error=f"`{agent.executable} --version` failed: {detail}",
        )

    output = result.stdout.strip()
    # Some CLIs print the version on stderr; an empty answer is still a working CLI.
    version = (output or result.stderr.strip()).splitlines()
    return AgentCheck(available=True, version=version[0] if version else None)
