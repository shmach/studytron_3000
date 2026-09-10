"""Dump the OpenAPI schema to a file so the frontend can generate TS types offline.

Usage:
    uv run export-openapi --out apps/web/openapi.json
"""

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("openapi.json"),
        help="destination file (default: ./openapi.json)",
    )
    args = parser.parse_args()

    # Imported lazily so `--help` works without loading FastAPI or reading .env.
    from local_server.app import app

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(app.openapi(), indent=2) + "\n", encoding="utf-8")
    print(f"OpenAPI schema written to {args.out}")


if __name__ == "__main__":
    main()
