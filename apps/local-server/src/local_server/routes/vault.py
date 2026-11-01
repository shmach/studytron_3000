from dotenv import load_dotenv
from fastapi import APIRouter

from local_server.services.settings_store import settings_store

load_dotenv()

router = APIRouter(prefix="/vault", tags=["vault"])


@router.get("/config", operation_id="get_vault_config")
def get_content_path() -> str | None:
    return settings_store.vault_path()
