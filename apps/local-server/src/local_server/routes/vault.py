import os

from dotenv import load_dotenv
from fastapi import APIRouter

load_dotenv()

router = APIRouter(prefix="/vault", tags=["vault"])


@router.get("/config")
def get_content_path() -> str | None:
    return os.getenv("VAULT_PATH")
