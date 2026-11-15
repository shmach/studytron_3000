from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from local_server.routes import jobs
from local_server.services.agents import AgentId
from local_server.services.settings_store import settings_store

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsResponse(BaseModel):
    agent: AgentId
    # The vault in use, which may come from `VAULT_PATH` when none was chosen in the app.
    vault_path: str | None
    recent_vault_paths: list[str]


class SettingsUpdate(BaseModel):
    """Every field is optional: only the ones sent are changed (`PATCH` semantics).

    `agent` is a `Literal`, so FastAPI answers `422` for anything but a known agent. It is
    never a free command string: the server runs it with permissions skipped.
    """

    agent: AgentId | None = None
    vault_path: str | None = None


def _current() -> SettingsResponse:
    settings = settings_store.get()
    return SettingsResponse(
        agent=settings.agent,
        vault_path=settings_store.vault_path(),
        recent_vault_paths=settings.recent_vault_paths,
    )


def _validate_vault_path(raw: str) -> str:
    """Return the path to save, or raise `422` saying why it cannot be a vault."""
    path = Path(raw.strip())
    if not path.is_absolute():
        raise HTTPException(422, "The vault path must be absolute")
    if not path.exists():
        raise HTTPException(422, "The vault folder does not exist")
    if not path.is_dir():
        raise HTTPException(422, "The vault path is not a folder")
    return str(path)


@router.get("", operation_id="get_settings")
def get_settings() -> SettingsResponse:
    return _current()


@router.patch("", operation_id="update_settings")
def update_settings(body: SettingsUpdate) -> SettingsResponse:
    vault_path = None
    if body.vault_path is not None:
        vault_path = _validate_vault_path(body.vault_path)
        # A running job writes into the old folder and its result is checked there; moving
        # the vault under it would make it look like the agent wrote nothing.
        if vault_path != settings_store.vault_path() and jobs.job_store.has_active():
            raise HTTPException(
                409, "Wait for the running job to finish before changing the vault"
            )

    settings_store.update(agent=body.agent, vault_path=vault_path)
    return _current()
