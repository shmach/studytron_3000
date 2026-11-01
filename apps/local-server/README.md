# local-server

FastAPI wrapper around `course-parser`. Exposes a local vault (folder of
courses written by the `course-builder` skill) over the same HTTP contract the
hosted API will use later (`skill/references/storage-adapters.md`).

## Run it

From the repo root:

```sh
uv sync                                   # once
VAULT_PATH=/path/to/vault uv run fastapi dev apps/local-server/main.py
```

Or put `VAULT_PATH=...` in `apps/local-server/.env` (see `.env.example`) and
skip the inline variable. Swagger UI lives at http://localhost:8000/docs.

`uv run local-server` also works and runs uvicorn with reload.

## Routes

| Route | Returns |
| --- | --- |
| `GET /settings` | the agent, the vault in use and the recent vaults |
| `PATCH /settings` | changes the agent and/or the vault (422 if invalid, 409 while a job runs) |
| `GET /agents` | the supported agents, with display name and install hint |
| `GET /courses` | every course as a `CourseBundle` |
| `GET /courses/{slug}` | one `CourseBundle` (404 if the folder is missing) |
| `GET /courses/{slug}/lessons/{topic_id}` | one `Lesson` |
| `GET /courses/{slug}/exercises/{topic_id}` | one `ExerciseSet` |

CORS is enabled for the Vite dev origin (`http://localhost:5173`).

## OpenAPI export

The frontend generates its TypeScript types from this server's schema:

```sh
uv run export-openapi --out apps/client/openapi.json
```

`cd apps/client && npm run generate:types` runs that plus `openapi-typescript`.
