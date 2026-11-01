from fastapi import APIRouter
from pydantic import BaseModel

from local_server.services.agents import AGENTS, AgentId

router = APIRouter(prefix="/agents", tags=["agents"])


class AgentInfo(BaseModel):
    id: AgentId
    display_name: str
    # Lives here, not in the frontend, so the install text has a single owner.
    install_hint: str


@router.get("", operation_id="list_agents")
def list_agents() -> list[AgentInfo]:
    return [
        AgentInfo(
            id=agent.id,
            display_name=agent.display_name,
            install_hint=agent.install_hint,
        )
        for agent in AGENTS.values()
    ]
