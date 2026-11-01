from pathlib import Path

from local_server.services.settings_store import settings_store


def _existing_slugs() -> set[str]:
    vault_path = settings_store.vault_path()

    if not vault_path:
        return set()
    return {p.name for p in Path(vault_path).iterdir() if p.is_dir()}
