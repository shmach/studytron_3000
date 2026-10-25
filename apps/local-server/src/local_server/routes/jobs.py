from fastapi import APIRouter

from local_server.services.job_store import Job, job_store

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", operation_id="list_jobs")
def list_jobs(slug: str | None = None, active: bool | None = None) -> list[Job]:
    """Jobs of this server run, newest first (at most 50).

    Finished jobs are included on purpose: the app compares one answer with the next to tell
    whether a job that left the "active" list ended well or badly. `output` never leaves the
    server (see `Job`).
    """
    return job_store.list_jobs(slug=slug, active=active)
