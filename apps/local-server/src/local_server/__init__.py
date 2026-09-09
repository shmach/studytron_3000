"""local-server: FastAPI wrapper around course-parser for a local vault."""


def main() -> None:
    """Run the API with uvicorn (`uv run local-server`)."""
    import uvicorn

    uvicorn.run("local_server.app:app", host="127.0.0.1", port=8000, reload=True)
