from dotenv import load_dotenv
from fastapi import APIRouter

from local_server.config.env import Env

load_dotenv()

router = APIRouter(prefix="/vault", tags=["vault"])


@router.get("/config", operation_id="get_vault_config")
def get_content_path() -> str | None:
    env = Env()
    return env.VAULT_PATH
