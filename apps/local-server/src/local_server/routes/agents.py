from fastapi import APIRouter
from pydantic import BaseModel

from local_server.services.agent_check import AgentCheck, check_agent
from local_server.services.agents import AGENTS, AgentId

router = APIRouter(prefix="/agents", tags=["agents"])


class AgentInfo(BaseModel):
    id: AgentId
    display_name: str
    # Lives here, not in the frontend, so the install text has a single owner.
    install_hint: str
    skill_install_hint: str


@router.get("", operation_id="list_agents")
def list_agents() -> list[AgentInfo]:
    return [
        AgentInfo(
            id=agent.id,
            display_name=agent.display_name,
            install_hint=agent.install_hint,
            skill_install_hint=agent.skill_install_hint,
        )
        for agent in AGENTS.values()
    ]


@router.post("/{agent_id}/check", operation_id="check_agent")
def check_agent_route(agent_id: AgentId) -> AgentCheck:
    """Always `200`: a missing agent is the answer (`available=false`), not a failed request.

    A plain `def`, so FastAPI runs it in a worker thread and the blocking `--version`
    call does not stall the event loop.
    """
    return check_agent(agent_id)
