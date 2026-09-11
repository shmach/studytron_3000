"""FastAPI application factory: the local storage adapter exposed over HTTP.

Routes implement the same contract described in `skill/references/storage-adapters.md`
for the `remote` adapter, so the frontend talks to this server exactly as it will
talk to the hosted API later.
"""

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from local_server.routes import courses, vault

DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app = FastAPI(
    title="course-builder local server",
    version="0.1.0",
    description="Serves the course-builder vault (Markdown files) as structured JSON.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEV_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(router=vault.router)
app.include_router(router=courses.router)


@app.get("/", include_in_schema=False)
def hello_world():
    return {"Hello": "World"}
