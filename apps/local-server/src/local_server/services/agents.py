"""Registry of the coding-agent CLIs the server can drive.

Every agent is run the same way (a one-shot prompt that prints JSON), but each one builds its
arguments and writes its answer in its own shape. An `Agent` bundles those differences so the
rest of the server never branches on "which CLI is it".
"""

import json
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal

AgentId = Literal["claude", "antigravity"]


def _load_payload(stdout: str, name: str, field: str) -> dict:
    """Parse the JSON object an agent prints, or raise a `RuntimeError` naming the agent."""
    try:
        payload = json.loads(stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{name} printed output that is not JSON") from exc

    if not isinstance(payload, dict):
        # Bad output from the external tool, not a type bug of our caller: not a TypeError.
        raise RuntimeError(f"{name} output has no `{field}` text")  # noqa: TRY004
    return payload


def parse_claude_result(stdout: str) -> str:
    """Return the final text from `claude -p --output-format json`.

    The CLI prints one JSON object with `type: "result"`, an `is_error` flag and the final
    answer in `result`.
    """
    payload = _load_payload(stdout, "claude", "result")

    result = payload.get("result")
    if not isinstance(result, str):
        raise RuntimeError("claude output has no `result` text")  # noqa: TRY004
    if payload.get("is_error"):
        raise RuntimeError(f"claude reported an error: {result}")

    return result


def parse_antigravity_result(stdout: str) -> str:
    """Return the final text from `agy -p --output-format json`.

    The CLI prints one JSON object with a `status` (`SUCCESS` or `ERROR`) and the final answer
    in `response`. On failure `response` is empty and the reason is in `error`.
    """
    payload = _load_payload(stdout, "antigravity", "response")

    if payload.get("status") != "SUCCESS":
        reason = payload.get("error") or payload.get("status") or "unknown error"
        raise RuntimeError(f"antigravity reported an error: {reason}")

    response = payload.get("response")
    if not isinstance(response, str):
        raise RuntimeError("antigravity output has no `response` text")  # noqa: TRY004

    return response


def _print_mode_args(prompt: str) -> list[str]:
    # Both CLIs take the same flags for "run once, no questions, print JSON".
    return [
        "-p",
        prompt,
        "--output-format",
        "json",
        "--dangerously-skip-permissions",
    ]


@dataclass(frozen=True)
class Agent:
    id: AgentId
    display_name: str
    executable: str
    install_hint: str
    build_args: Callable[[str], list[str]]
    parse_result: Callable[[str], str]


AGENTS: dict[AgentId, Agent] = {
    "claude": Agent(
        id="claude",
        display_name="Claude Code",
        executable="claude",
        install_hint="Install Claude Code: https://claude.com/claude-code",
        build_args=_print_mode_args,
        parse_result=parse_claude_result,
    ),
    "antigravity": Agent(
        id="antigravity",
        display_name="Antigravity",
        # The Antigravity CLI is installed as `agy`, not `antigravity`.
        executable="agy",
        install_hint="Install the Antigravity CLI (the `agy` command) and put it on your PATH",
        build_args=_print_mode_args,
        parse_result=parse_antigravity_result,
    ),
}
