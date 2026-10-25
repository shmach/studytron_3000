import os
import tempfile
from pathlib import Path


def read_text_exact(path: Path) -> str:
    """Read `path` as UTF-8 without translating line endings.

    `Path.read_text()` converts `\\r\\n` to `\\n`; decoding the raw bytes keeps the file
    exactly as the student (or Obsidian) saved it.
    """
    return path.read_bytes().decode("utf-8")


def write_text_atomic(path: Path, text: str) -> None:
    """Replace `path` with `text` so readers never see a half-written file.

    The text goes to a temporary file in the same folder first, then `os.replace` swaps it
    in. Writing bytes (instead of `Path.write_text()`) avoids Windows turning `\\n` into
    `\\r\\n`. The temporary name starts with a dot and does not end in `.md`, so the vault
    loader ignores it if the process dies mid-write.
    """
    fd, tmp_name = tempfile.mkstemp(
        dir=path.parent, prefix=f".{path.name}.", suffix=".tmp"
    )
    try:
        with os.fdopen(fd, "wb") as tmp_file:
            tmp_file.write(text.encode("utf-8"))
        os.replace(tmp_name, path)
    except BaseException:
        Path(tmp_name).unlink(missing_ok=True)
        raise
