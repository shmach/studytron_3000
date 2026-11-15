import json

import pytest
from fastapi.testclient import TestClient
from local_server.app import app
from local_server.services.settings_store import (
    MAX_RECENT_VAULT_PATHS,
    SettingsStore,
)


@pytest.fixture
def store(tmp_path):
    return SettingsStore(tmp_path / "config" / "settings.json")


class TestDefaults:
    def test_missing_file_gives_the_defaults(self, store):
        settings = store.get()

        assert settings.agent == "claude"
        assert settings.vault_path is None
        assert settings.recent_vault_paths == []

    def test_broken_file_gives_the_defaults(self, store):
        store.path.parent.mkdir(parents=True)
        store.path.write_text("{not json", encoding="utf-8")

        assert store.get().agent == "claude"

    def test_unknown_agent_in_the_file_gives_the_defaults(self, store):
        store.path.parent.mkdir(parents=True)
        store.path.write_text(json.dumps({"agent": "emacs"}), encoding="utf-8")

        assert store.get().agent == "claude"


class TestUpdate:
    def test_creates_the_folder_and_persists_between_instances(self, store):
        store.update(agent="antigravity")

        assert SettingsStore(store.path).get().agent == "antigravity"

    def test_none_leaves_a_field_alone(self, store):
        store.update(agent="antigravity", vault_path="/vault")

        store.update(vault_path="/other")

        settings = store.get()
        assert settings.agent == "antigravity"
        assert settings.vault_path == "/other"

    def test_recent_paths_put_the_latest_first_without_duplicates(self, store):
        for path in ["/a", "/b", "/a"]:
            store.update(vault_path=path)

        assert store.get().recent_vault_paths == ["/a", "/b"]

    def test_recent_paths_are_capped(self, store):
        for number in range(MAX_RECENT_VAULT_PATHS + 3):
            store.update(vault_path=f"/vault-{number}")

        recent = store.get().recent_vault_paths
        assert len(recent) == MAX_RECENT_VAULT_PATHS
        assert recent[0] == f"/vault-{MAX_RECENT_VAULT_PATHS + 2}"


class TestVaultPath:
    def test_falls_back_to_the_environment_variable(self, store, monkeypatch):
        monkeypatch.setenv("VAULT_PATH", "/from-env")

        assert store.vault_path() == "/from-env"

    def test_the_chosen_path_wins_over_the_environment(self, store, monkeypatch):
        monkeypatch.setenv("VAULT_PATH", "/from-env")
        store.update(vault_path="/chosen")

        assert store.vault_path() == "/chosen"

    def test_none_when_nothing_is_set(self, store, monkeypatch):
        monkeypatch.delenv("VAULT_PATH", raising=False)

        assert store.vault_path() is None


class TestRoutesUseTheStore:
    def test_no_vault_configured_is_a_500(self):
        response = TestClient(app).get("/courses")

        assert response.status_code == 500
        assert "not configured" in response.json()["detail"]

    def test_the_vault_chosen_in_the_store_is_the_one_listed(self, vault_dir):
        courses = TestClient(app).get("/courses").json()

        assert [course["course"]["slug"] for course in courses] == [
            "java-para-quem-programa"
        ]
