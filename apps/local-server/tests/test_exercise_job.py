from conftest import SLUG
from fastapi.testclient import TestClient
from local_server.routes import courses
from local_server.services.job_store import JobKind
from local_server.services.local_process import CliTimeoutError

# In the fixture, topic 1.1 has a lesson and exercises; 1.2 and 1.3 have neither.
TOPIC_WITH_EXERCISES = "1.1"
TOPIC = "1.2"


def _post(client: TestClient, topic_id: str = TOPIC, slug: str = SLUG):
    return client.post(f"/courses/{slug}/topics/{topic_id}/exercises")


def _job(client: TestClient, job_id: str) -> dict:
    response = client.get(f"/courses/jobs/{job_id}")
    assert response.status_code == 200
    return response.json()


def _give_the_topic_a_lesson(vault_dir, topic_id: str = TOPIC) -> None:
    """The exercises route needs a lesson; copy the fixture's lesson to `topic_id`."""
    lessons = vault_dir / SLUG / "lessons"
    sample = (lessons / "1-1-jvm-jdk-modelo-de-execucao.md").read_bytes()
    text = sample.decode("utf-8").replace('topic: "1.1"', f'topic: "{topic_id}"')
    (lessons / f"{topic_id.replace('.', '-')}-lesson.md").write_bytes(
        text.encode("utf-8")
    )


def _remove_the_exercises(vault_dir) -> None:
    """Topic 1.1 has exercises in the fixture; remove them to make it eligible."""
    exercises = vault_dir / SLUG / "exercises"
    for path in exercises.glob("1-1-*.md"):
        path.unlink()


class TestGenerateExercises:
    def test_creates_the_exercises_and_finishes_the_job(
        self, client, vault_dir, fake_cli
    ):
        _give_the_topic_a_lesson(vault_dir)
        prompts = fake_cli(writes="exercises")

        response = _post(client)

        assert response.status_code == 202
        created = response.json()
        assert created["kind"] == "exercise_generation"
        assert created["slug"] == SLUG
        assert created["topic_id"] == TOPIC

        job = _job(client, created["id"])
        assert job["status"] == "done"
        assert job["error"] is None
        assert client.get(f"/courses/{SLUG}/exercises/{TOPIC}").status_code == 200

        assert len(prompts) == 1
        assert f"topic {TOPIC} " in prompts[0]
        assert f"`{SLUG}`" in prompts[0]
        assert "no user is present" in prompts[0]
        assert "Generate only the exercises" in prompts[0]
        assert "Pending status decision" not in prompts[0]

    def test_fails_when_the_agent_wrote_no_exercises(self, client, vault_dir, fake_cli):
        _give_the_topic_a_lesson(vault_dir)
        fake_cli(result="I did nothing")

        job = _job(client, _post(client).json()["id"])

        assert job["status"] == "error"
        assert f"no exercises for topic {TOPIC}" in job["error"]
        assert "I did nothing" in job["error"]

    def test_fails_when_the_cli_fails(self, client, vault_dir, fake_cli):
        _give_the_topic_a_lesson(vault_dir)
        fake_cli(raises=RuntimeError("claude timed out after 300s"))

        job = _job(client, _post(client).json()["id"])

        assert job["status"] == "error"
        assert job["error"] == "claude timed out after 300s"

    def test_a_timeout_after_the_exercises_were_written_is_done(
        self, client, vault_dir, fake_cli
    ):
        _give_the_topic_a_lesson(vault_dir)
        fake_cli(
            writes="exercises", raises=CliTimeoutError("claude timed out after 300s")
        )

        job = _job(client, _post(client).json()["id"])

        assert job["status"] == "done"
        assert job["error"] is None

    def test_a_timeout_with_no_exercises_written_is_an_error(
        self, client, vault_dir, fake_cli
    ):
        _give_the_topic_a_lesson(vault_dir)
        fake_cli(raises=CliTimeoutError("claude timed out after 300s"))

        job = _job(client, _post(client).json()["id"])

        assert job["status"] == "error"
        assert f"no exercises for topic {TOPIC} was written" in job["error"]

    def test_an_unexpected_exception_does_not_leave_the_job_running(
        self, client, vault_dir, fake_cli
    ):
        _give_the_topic_a_lesson(vault_dir)
        fake_cli(raises=FileNotFoundError("claude"))

        job = _job(client, _post(client).json()["id"])

        assert job["status"] == "error"
        assert "FileNotFoundError" in job["error"]

    def test_a_topic_without_a_lesson_is_a_conflict(self, client, fake_cli):
        prompts = fake_cli()

        response = _post(client)

        assert response.status_code == 409
        assert "lesson" in response.json()["detail"]
        assert prompts == []

    def test_a_topic_that_already_has_exercises_is_a_conflict(self, client, fake_cli):
        prompts = fake_cli()

        assert _post(client, topic_id=TOPIC_WITH_EXERCISES).status_code == 409
        assert prompts == []

    def test_unknown_course_is_404(self, client, fake_cli):
        fake_cli()

        assert _post(client, slug="nope").status_code == 404

    def test_unknown_topic_is_404(self, client, fake_cli):
        prompts = fake_cli()

        assert _post(client, topic_id="99.99").status_code == 404
        assert prompts == []

    def test_a_running_lesson_job_also_blocks_exercises(
        self, client, vault_dir, fake_cli
    ):
        _give_the_topic_a_lesson(vault_dir)
        prompts = fake_cli()
        courses.job_store.create_exclusive(JobKind.LESSON_GENERATION, SLUG, "1.3")

        assert _post(client).status_code == 409
        assert prompts == []

    def test_a_running_exercise_job_blocks_another_one(
        self, client, vault_dir, fake_cli
    ):
        _give_the_topic_a_lesson(vault_dir)
        prompts = fake_cli()
        courses.job_store.create_exclusive(JobKind.EXERCISE_GENERATION, SLUG, "1.3")

        assert _post(client).status_code == 409
        assert prompts == []

    def test_a_finished_job_does_not_block_the_next_one(
        self, client, vault_dir, fake_cli
    ):
        _give_the_topic_a_lesson(vault_dir)
        _give_the_topic_a_lesson(vault_dir, "1.3")
        fake_cli(writes="exercises")
        assert _post(client).status_code == 202

        fake_cli(writes="exercises", topic_id="1.3")
        assert _post(client, topic_id="1.3").status_code == 202

    def test_exercises_can_be_generated_for_a_topic_whose_exercises_were_removed(
        self, client, vault_dir, fake_cli
    ):
        _remove_the_exercises(vault_dir)
        fake_cli(writes="exercises", topic_id=TOPIC_WITH_EXERCISES)

        response = _post(client, topic_id=TOPIC_WITH_EXERCISES)

        assert response.status_code == 202
        assert _job(client, response.json()["id"])["status"] == "done"
