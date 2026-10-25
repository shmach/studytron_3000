import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from local_server.app import app
from local_server.routes import courses
from local_server.services.job_store import JobStore

# The parser package already ships real courses as fixtures; reuse them instead of copying.
FIXTURES_DIR = (
    Path(__file__).parents[3] / "packages" / "course-parser" / "tests" / "fixtures"
)
SLUG = "java-para-quem-programa"


@pytest.fixture
def vault_dir(tmp_path, monkeypatch):
    """A throw-away vault. `env.VAULT_PATH` is read at import time, so it is patched in place;
    this also guarantees the tests never touch the real vault from `.env`."""
    shutil.copytree(FIXTURES_DIR / SLUG, tmp_path / SLUG)
    monkeypatch.setattr(courses.env, "VAULT_PATH", str(tmp_path))
    return tmp_path


@pytest.fixture(autouse=True)
def fresh_job_store(monkeypatch):
    """Jobs live in a module-level singleton; give every test an empty one so a job left
    running by one test cannot block another."""
    monkeypatch.setattr(courses, "job_store", JobStore())


@pytest.fixture
def client(vault_dir):
    return TestClient(app)
