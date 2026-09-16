from enum import Enum
from uuid import uuid4

from pydantic import BaseModel


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"


class CourseCreationJob(BaseModel):
    id: str
    status: JobStatus
    slug: str | None = None
    error: str | None = None


class JobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, CourseCreationJob] = {}

    def create(self) -> CourseCreationJob:
        job = CourseCreationJob(id=str(uuid4()), status=JobStatus.PENDING)
        self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> CourseCreationJob | None:
        return self._jobs.get(job_id)

    def mark_running(self, job_id: str) -> None:
        self._jobs[job_id].status = JobStatus.RUNNING

    def mark_done(self, job_id: str, slug: str | None) -> None:
        self._jobs[job_id].status = JobStatus.DONE
        self._jobs[job_id].slug = slug

    def mark_error(self, job_id: str, error: str) -> None:
        self._jobs[job_id].status = JobStatus.ERROR
        self._jobs[job_id].error = error


job_store = JobStore()
