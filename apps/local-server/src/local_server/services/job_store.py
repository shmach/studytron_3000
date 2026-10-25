import threading
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"


class JobKind(str, Enum):
    COURSE_CREATION = "course_creation"
    LESSON_GENERATION = "lesson_generation"
    EXERCISE_GENERATION = "exercise_generation"


class Job(BaseModel):
    id: str
    kind: JobKind = JobKind.COURSE_CREATION
    status: JobStatus
    # Course creation: filled when the job is done. Generation jobs: the course being edited.
    slug: str | None = None
    # Generation jobs only (lesson or exercises).
    topic_id: str | None = None
    error: str | None = None
    # Final text printed by the agent CLI. Internal: `exclude=True` keeps it out of API
    # responses (it can be long and is only meant for the server).
    output: str | None = Field(default=None, exclude=True)


_ACTIVE = (JobStatus.PENDING, JobStatus.RUNNING)


class JobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        # Guards "is there an active job? then create one" so two requests arriving together
        # cannot both pass the check.
        self._lock = threading.Lock()

    def create(
        self,
        kind: JobKind = JobKind.COURSE_CREATION,
        slug: str | None = None,
        topic_id: str | None = None,
    ) -> Job:
        job = Job(
            id=str(uuid4()),
            kind=kind,
            status=JobStatus.PENDING,
            slug=slug,
            topic_id=topic_id,
        )
        self._jobs[job.id] = job
        return job

    def create_exclusive(
        self, kind: JobKind, slug: str, topic_id: str | None = None
    ) -> Job | None:
        """Create a job unless any job is already active for `slug`, whatever its kind.

        Returns `None` when there is one. Used to keep a single agent run per course: lessons
        and exercises touch the same folders and the agent rewrites the same curriculum file.
        """
        with self._lock:
            if any(j.slug == slug and j.status in _ACTIVE for j in self._jobs.values()):
                return None
            return self.create(kind=kind, slug=slug, topic_id=topic_id)

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    def mark_running(self, job_id: str) -> None:
        self._jobs[job_id].status = JobStatus.RUNNING

    def set_output(self, job_id: str, output: str) -> None:
        self._jobs[job_id].output = output

    def mark_done(self, job_id: str, slug: str | None = None) -> None:
        self._jobs[job_id].status = JobStatus.DONE
        if slug is not None:
            self._jobs[job_id].slug = slug

    def mark_error(self, job_id: str, error: str) -> None:
        self._jobs[job_id].status = JobStatus.ERROR
        self._jobs[job_id].error = error


job_store = JobStore()
