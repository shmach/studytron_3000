from pathlib import Path

from fastapi.testclient import TestClient

SLUG = "java-para-quem-programa"
CURRICULUM = "00-curriculum.md"

# In this fixture topic 1.1 has a lesson (status completed) and topic 1.2 has none (pending).
TOPIC_WITH_LESSON = "1.1"
TOPIC_WITHOUT_LESSON = "1.2"


def _curriculum_bytes(vault_dir: Path) -> bytes:
    return (vault_dir / SLUG / CURRICULUM).read_bytes()


def _patch(client: TestClient, topic_id: str, status: str):
    return client.patch(
        f"/courses/{SLUG}/topics/{topic_id}/status", json={"status": status}
    )


class TestUpdateTopicStatus:
    def test_changes_the_status_and_returns_the_topic(self, client, vault_dir):
        response = _patch(client, TOPIC_WITHOUT_LESSON, "completed")

        assert response.status_code == 200
        body = response.json()
        assert body["meta"]["id"] == TOPIC_WITHOUT_LESSON
        assert body["meta"]["status"] == "completed"

    def test_changes_only_one_line_of_the_file(self, client, vault_dir):
        before = _curriculum_bytes(vault_dir).splitlines(keepends=True)

        _patch(client, TOPIC_WITHOUT_LESSON, "review")

        after = _curriculum_bytes(vault_dir).splitlines(keepends=True)
        assert len(before) == len(after)
        changed = [(a, b) for a, b in zip(before, after, strict=True) if a != b]
        assert changed == [(b"status: pending\n", b"status: review\n")]

    def test_the_new_status_shows_up_in_the_course(self, client, vault_dir):
        _patch(client, TOPIC_WITHOUT_LESSON, "completed")

        course = client.get(f"/courses/{SLUG}").json()
        statuses = {
            t["meta"]["id"]: t["meta"]["status"]
            for m in course["course"]["modules"]
            for t in m["topics"]
        }
        assert statuses[TOPIC_WITHOUT_LESSON] == "completed"

    def test_in_progress_is_accepted_when_the_lesson_exists(self, client, vault_dir):
        response = _patch(client, TOPIC_WITH_LESSON, "in_progress")

        assert response.status_code == 200
        assert response.json()["meta"]["status"] == "in_progress"

    def test_in_progress_without_a_lesson_is_a_conflict(self, client, vault_dir):
        before = _curriculum_bytes(vault_dir)

        response = _patch(client, TOPIC_WITHOUT_LESSON, "in_progress")

        assert response.status_code == 409
        assert _curriculum_bytes(vault_dir) == before

    def test_other_statuses_do_not_need_a_lesson(self, client, vault_dir):
        for status in ("pending", "completed", "review"):
            assert _patch(client, TOPIC_WITHOUT_LESSON, status).status_code == 200

    def test_preserves_crlf_line_endings(self, client, vault_dir):
        path = vault_dir / SLUG / CURRICULUM
        path.write_bytes(path.read_bytes().replace(b"\n", b"\r\n"))
        before = path.read_bytes()

        _patch(client, TOPIC_WITHOUT_LESSON, "completed")

        after = path.read_bytes()
        assert after.count(b"\r\n") == before.count(b"\r\n")
        assert after.replace(b"\r\n", b"").count(b"\n") == 0

    def test_unknown_topic_is_404(self, client, vault_dir):
        assert _patch(client, "99.99", "completed").status_code == 404

    def test_unknown_course_is_404(self, client, vault_dir):
        response = client.patch(
            "/courses/nope/topics/1.1/status", json={"status": "completed"}
        )

        assert response.status_code == 404

    def test_invalid_status_is_422_and_leaves_the_file_alone(self, client, vault_dir):
        before = _curriculum_bytes(vault_dir)

        response = _patch(client, TOPIC_WITHOUT_LESSON, "done")

        assert response.status_code == 422
        assert _curriculum_bytes(vault_dir) == before

    def test_no_temporary_file_is_left_behind(self, client, vault_dir):
        _patch(client, TOPIC_WITHOUT_LESSON, "completed")

        assert sorted(p.name for p in (vault_dir / SLUG).iterdir() if p.is_file()) == [
            CURRICULUM
        ]


def test_cors_allows_patch_from_the_dev_origin(client):
    response = client.options(
        f"/courses/{SLUG}/topics/1.1/status",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "PATCH",
        },
    )

    assert response.status_code == 200
    assert "PATCH" in response.headers["access-control-allow-methods"]
