from conftest import SLUG
from fastapi.testclient import TestClient
from local_server.app import app
from local_server.services.job_store import JobKind

OTHER_SLUG = "outro-curso"


def _get(client: TestClient, **params):
    response = client.get("/jobs", params=params)
    assert response.status_code == 200
    return response.json()


def _lesson(store, slug: str = SLUG, topic_id: str = "1.2"):
    return store.create(JobKind.LESSON_GENERATION, slug, topic_id)


class TestListJobs:
    def test_no_jobs_is_an_empty_list(self, client):
        assert _get(client) == []

    def test_newest_first(self, client, fresh_job_store):
        first = _lesson(fresh_job_store, topic_id="1.2")
        second = _lesson(fresh_job_store, topic_id="1.3")
        third = fresh_job_store.create()  # a course creation job

        ids = [job["id"] for job in _get(client)]

        assert ids == [third.id, second.id, first.id]

    def test_filters_by_course(self, client, fresh_job_store):
        mine = _lesson(fresh_job_store)
        _lesson(fresh_job_store, slug=OTHER_SLUG)
        fresh_job_store.create()  # course creation: no slug yet

        ids = [job["id"] for job in _get(client, slug=SLUG)]

        assert ids == [mine.id]

    def test_an_unknown_course_is_an_empty_list_not_an_error(
        self, client, fresh_job_store
    ):
        _lesson(fresh_job_store)

        assert _get(client, slug="nope") == []

    def test_active_keeps_only_pending_and_running(self, client, fresh_job_store):
        pending = _lesson(fresh_job_store, topic_id="1.2")
        running = _lesson(fresh_job_store, slug=OTHER_SLUG, topic_id="1.2")
        fresh_job_store.mark_running(running.id)
        done = _lesson(fresh_job_store, slug="terceiro", topic_id="1.2")
        fresh_job_store.mark_done(done.id)
        failed = _lesson(fresh_job_store, slug="quarto", topic_id="1.2")
        fresh_job_store.mark_error(failed.id, "boom")

        ids = {job["id"] for job in _get(client, active=True)}

        assert ids == {pending.id, running.id}

    def test_not_active_keeps_only_finished_jobs(self, client, fresh_job_store):
        _lesson(fresh_job_store, topic_id="1.2")
        done = _lesson(fresh_job_store, slug=OTHER_SLUG, topic_id="1.2")
        fresh_job_store.mark_done(done.id)
        failed = _lesson(fresh_job_store, slug="terceiro", topic_id="1.2")
        fresh_job_store.mark_error(failed.id, "boom")

        ids = {job["id"] for job in _get(client, active=False)}

        assert ids == {done.id, failed.id}

    def test_without_a_filter_finished_jobs_are_included(self, client, fresh_job_store):
        # The app needs them to tell whether a job that left the active list succeeded.
        job = _lesson(fresh_job_store)
        fresh_job_store.mark_error(job.id, "boom")

        listed = _get(client)

        assert [(j["id"], j["status"], j["error"]) for j in listed] == [
            (job.id, "error", "boom")
        ]

    def test_course_and_active_filters_combine(self, client, fresh_job_store):
        mine = _lesson(fresh_job_store)
        finished_mine = _lesson(fresh_job_store, topic_id="1.3")
        fresh_job_store.mark_done(finished_mine.id)
        _lesson(fresh_job_store, slug=OTHER_SLUG)

        ids = [job["id"] for job in _get(client, slug=SLUG, active=True)]

        assert ids == [mine.id]

    def test_returns_at_most_the_50_newest_jobs(self, client, fresh_job_store):
        created = [
            fresh_job_store.create(JobKind.LESSON_GENERATION, f"curso-{n}", "1.1")
            for n in range(55)
        ]

        ids = [job["id"] for job in _get(client)]

        assert len(ids) == 50
        assert ids == [job.id for job in reversed(created)][:50]

    def test_the_limit_applies_after_the_filters(self, client, fresh_job_store):
        mine = _lesson(fresh_job_store)
        for n in range(55):
            fresh_job_store.create(JobKind.LESSON_GENERATION, f"curso-{n}", "1.1")

        ids = [job["id"] for job in _get(client, slug=SLUG)]

        assert ids == [mine.id]

    def test_exposes_the_job_fields_but_not_the_agent_output(
        self, client, fresh_job_store
    ):
        job = _lesson(fresh_job_store)
        fresh_job_store.set_output(job.id, "secret agent output")

        [listed] = _get(client)

        assert listed == {
            "id": job.id,
            "kind": "lesson_generation",
            "status": "pending",
            "slug": SLUG,
            "topic_id": "1.2",
            "error": None,
            "pending_decisions": [],
        }

    def test_is_in_the_openapi_contract(self):
        operation = app.openapi()["paths"]["/jobs"]["get"]

        assert operation["operationId"] == "list_jobs"
        parameters = {p["name"] for p in operation["parameters"]}
        assert parameters == {"slug", "active"}

    def test_a_job_that_finishes_moves_out_of_the_active_list(
        self, client, fresh_job_store
    ):
        job = _lesson(fresh_job_store)
        assert [j["id"] for j in _get(client, active=True)] == [job.id]

        fresh_job_store.mark_done(job.id)

        assert _get(client, active=True) == []
        assert [j["status"] for j in _get(client)] == ["done"]
