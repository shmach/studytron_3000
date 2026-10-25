import json
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


# Topic 1.1 of the fixture has a lesson, an exercise set and an attempt; they are copied to
# other topic ids to fake what the skill would write.
_SAMPLE_FILES = {
    "lesson": "lessons/1-1-jvm-jdk-modelo-de-execucao.md",
    "exercises": "exercises/1-1-jvm-jdk-modelo-de-execucao.md",
}


@pytest.fixture
def fake_cli(monkeypatch, vault_dir):
    """Replace the real agent CLI. `fake_cli(...)` returns the list of prompts it receives.

    `writes` is what the fake "skill" puts in the vault for `topic_id`: `"lesson"`,
    `"exercises"` or `None` (writes nothing). `raises` makes the CLI fail with that exception.
    """

    def install(
        *,
        writes=None,
        topic_id="1.2",
        result="Done.",
        is_error=False,
        raises=None,
    ):
        prompts: list[str] = []

        async def fake_run(self, cwd):
            prompts.append(self.prompt)
            if raises is not None:
                raise raises
            if writes is not None:
                # Read the sample from the fixtures, not from the vault copy, which a test
                # may have changed.
                sample = (FIXTURES_DIR / SLUG / _SAMPLE_FILES[writes]).read_bytes()
                text = sample.decode("utf-8").replace(
                    'topic: "1.1"', f'topic: "{topic_id}"'
                )
                folder = "lessons" if writes == "lesson" else "exercises"
                path = (
                    vault_dir / SLUG / folder / f"{topic_id.replace('.', '-')}-fake.md"
                )
                path.write_bytes(text.encode("utf-8"))
            return json.dumps(
                {"type": "result", "is_error": is_error, "result": result}
            )

        monkeypatch.setattr(courses.LocalProcess, "run", fake_run)
        return prompts

    return install
