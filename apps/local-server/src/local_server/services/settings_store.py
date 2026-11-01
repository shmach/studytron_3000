"""The app's own settings, kept in a JSON file outside the vault.

The vault is the source of truth for the student's study; these are settings of the app
itself (which agent to run, where the vault is). The vault path cannot live inside the vault,
so the file sits in the user's config folder.
"""

import json
import logging
import os
import threading
from pathlib import Path

from platformdirs import user_config_dir
from pydantic import BaseModel, Field, ValidationError

from local_server.services.agents import AgentId
from local_server.utils.atomic_write import read_text_exact, write_text_atomic

logger = logging.getLogger(__name__)

MAX_RECENT_VAULT_PATHS = 5


class Settings(BaseModel):
    agent: AgentId = "claude"
    # `None` means "not chosen in the app yet": the `VAULT_PATH` environment variable decides.
    vault_path: str | None = None
    recent_vault_paths: list[str] = Field(default_factory=list)


def default_settings_path() -> Path:
    return Path(user_config_dir("studytron", appauthor=False)) / "settings.json"


class SettingsStore:
    def __init__(self, path: Path):
        self.path = path
        # Updates read the file, change it and write it back; the lock keeps two requests
        # from undoing each other (same reasoning as the curriculum write lock).
        self._lock = threading.Lock()

    def get(self) -> Settings:
        """Read the settings. A missing or broken file means the defaults, never a crash."""
        try:
            return Settings.model_validate_json(read_text_exact(self.path))
        except FileNotFoundError:
            return Settings()
        except (ValidationError, ValueError, OSError) as exc:
            logger.warning("Ignoring unreadable settings file %s: %s", self.path, exc)
            return Settings()

    def vault_path(self) -> str | None:
        """The vault in use: the one chosen in the app, else the `VAULT_PATH` variable."""
        return self.get().vault_path or os.getenv("VAULT_PATH") or None

    def update(
        self, *, agent: AgentId | None = None, vault_path: str | None = None
    ) -> Settings:
        """Change the given fields (`None` leaves a field alone) and return the result."""
        with self._lock:
            settings = self.get()
            if agent is not None:
                settings.agent = agent
            if vault_path is not None:
                settings.vault_path = vault_path
                recent = [p for p in settings.recent_vault_paths if p != vault_path]
                settings.recent_vault_paths = [vault_path, *recent][
                    :MAX_RECENT_VAULT_PATHS
                ]

            self.path.parent.mkdir(parents=True, exist_ok=True)
            write_text_atomic(
                self.path,
                json.dumps(settings.model_dump(), indent=2, ensure_ascii=False),
            )
            return settings


settings_store = SettingsStore(default_settings_path())
