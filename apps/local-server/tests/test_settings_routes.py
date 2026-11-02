import pytest
from fastapi.testclient import TestClient
from local_server.app import app
from local_server.services.job_store import JobKind
from local_server.services.settings_store import SettingsStore


class TestGetSettings:
    def test_returns_the_defaults_and_the_vault_in_use(self, client, vault_dir):
        response = client.get("/settings")

        assert response.status_code == 200
        assert response.json() == {
            "agent": "claude",
            "vault_path": str(vault_dir),
            "recent_vault_paths": [str(vault_dir)],
        }

    def test_vault_falls_back_to_the_environment_variable(
        self, isolated_settings, monkeypatch, tmp_path
    ):
        monkeypatch.setenv("VAULT_PATH", str(tmp_path))

        response = TestClient(app).get("/settings")

        assert response.json()["vault_path"] == str(tmp_path)


class TestUpdateSettings:
    def test_changes_only_the_fields_sent(self, client, vault_dir):
        response = client.patch("/settings", json={"agent": "antigravity"})

        assert response.status_code == 200
        assert response.json()["agent"] == "antigravity"
        assert response.json()["vault_path"] == str(vault_dir)

    def test_unknown_agent_is_rejected(self, client):
        response = client.patch("/settings", json={"agent": "rm -rf"})

        assert response.status_code == 422

    def test_new_vault_becomes_the_current_and_the_first_recent(
        self, client, tmp_path_factory
    ):
        other = tmp_path_factory.mktemp("other")

        response = client.patch("/settings", json={"vault_path": str(other)})

        assert response.status_code == 200
        assert response.json()["vault_path"] == str(other)
        assert response.json()["recent_vault_paths"][0] == str(other)

    @pytest.mark.parametrize(
        ("make_path", "reason"),
        [
            (lambda tmp: "relative/folder", "absolute"),
            (lambda tmp: str(tmp / "missing"), "does not exist"),
            (lambda tmp: str(tmp / "file.txt"), "not a folder"),
        ],
    )
    def test_invalid_vault_is_rejected_with_the_reason(
        self, client, tmp_path_factory, make_path, reason
    ):
        folder = tmp_path_factory.mktemp("invalid")
        (folder / "file.txt").write_text("x")

        response = client.patch("/settings", json={"vault_path": make_path(folder)})

        assert response.status_code == 422
        assert reason in response.json()["detail"]

    def test_invalid_vault_leaves_the_settings_untouched(self, client, vault_dir):
        client.patch("/settings", json={"vault_path": "relative"})

        assert client.get("/settings").json()["vault_path"] == str(vault_dir)

    def test_vault_cannot_change_while_a_job_runs(
        self, client, fresh_job_store, tmp_path_factory, vault_dir
    ):
        fresh_job_store.create(JobKind.COURSE_CREATION)
        other = tmp_path_factory.mktemp("other")

        response = client.patch("/settings", json={"vault_path": str(other)})

        assert response.status_code == 409
        assert client.get("/settings").json()["vault_path"] == str(vault_dir)

    def test_agent_can_change_while_a_job_runs(self, client, fresh_job_store):
        fresh_job_store.create(JobKind.COURSE_CREATION)

        response = client.patch("/settings", json={"agent": "antigravity"})

        assert response.status_code == 200

    def test_choosing_the_same_vault_while_a_job_runs_is_allowed(
        self, client, fresh_job_store, vault_dir
    ):
        fresh_job_store.create(JobKind.COURSE_CREATION)

        response = client.patch("/settings", json={"vault_path": str(vault_dir)})

        assert response.status_code == 200

    def test_changes_survive_a_new_store_instance(
        self, client, isolated_settings, tmp_path_factory
    ):
        other = tmp_path_factory.mktemp("other")
        client.patch(
            "/settings", json={"agent": "antigravity", "vault_path": str(other)}
        )

        reopened = SettingsStore(isolated_settings.path).get()

        assert reopened.agent == "antigravity"
        assert reopened.vault_path == str(other)


class TestListAgents:
    def test_lists_every_supported_agent_with_its_install_hint(self, client):
        response = client.get("/agents")

        assert response.status_code == 200
        agents = {a["id"]: a for a in response.json()}
        assert set(agents) == {"claude", "antigravity"}
        assert agents["antigravity"]["display_name"] == "Antigravity"
        assert "agy" in agents["antigravity"]["install_hint"]

    def test_each_agent_says_how_to_install_the_skill_its_own_way(self, client):
        agents = {a["id"]: a for a in client.get("/agents").json()}

        assert "~/.claude/skills" in agents["claude"]["skill_install_hint"]
        assert "agy plugin install" in agents["antigravity"]["skill_install_hint"]


def test_vault_config_route_is_gone(client):
    assert client.get("/vault/config").status_code == 404
