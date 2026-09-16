import os
from pathlib import Path


def _existing_slugs() -> set[str]:
    vault_path = os.getenv("VAULT_PATH") or None

    if not vault_path:
        return set()
    return {p.name for p in Path(vault_path).iterdir() if p.is_dir()}
