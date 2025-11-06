import contextlib
import hashlib
import io
import mimetypes
import shutil
import sys
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

# Ensure project root and frontend are importable
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
FRONTEND_DIR = PROJECT_ROOT / "multi-agent-frontend"
if str(FRONTEND_DIR) not in sys.path:
    sys.path.append(str(FRONTEND_DIR))

from database import TeamDatabase  # type: ignore

UPLOAD_ROOT = (BACKEND_DIR / "data" / "uploads").resolve()
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

DB_PATH = (FRONTEND_DIR / "teams.db").resolve()
with contextlib.redirect_stdout(io.StringIO()):
    _db = TeamDatabase(str(DB_PATH))


def _compute_sha256(file_path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with file_path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _sanitize_identifier(value: Optional[str], fallback: str) -> str:
    import re

    raw = str(value).strip() if value else ""
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "_", raw)
    return cleaned or fallback


def register_artifact(
    file_path: str,
    *,
    display_name: Optional[str] = None,
    mime_type: Optional[str] = None,
    uploader: Optional[str] = None,
    team_id: Optional[str] = None,
    run_id: Optional[str] = None,
    visibility: str = "team",
) -> Dict[str, Any]:
    """
    Copy a local file into the shared artifact store and persist metadata.

    Returns the stored artifact metadata dictionary compatible with the upload API.
    """
    source = Path(file_path).expanduser().resolve()
    if not source.exists() or not source.is_file():
        raise FileNotFoundError(f"Artifact source file not found: {file_path}")

    file_id = uuid.uuid4().hex
    safe_team = _sanitize_identifier(team_id, "team") if team_id else "global"
    dest_dir = UPLOAD_ROOT / safe_team
    if run_id:
        dest_dir = dest_dir / _sanitize_identifier(run_id, "session")
    dest_dir.mkdir(parents=True, exist_ok=True)

    suffix = source.suffix
    storage_name = f"{file_id}{suffix}" if suffix else file_id
    destination = dest_dir / storage_name
    shutil.copy2(source, destination)

    size_bytes = destination.stat().st_size
    resolved_mime = mime_type or mimetypes.guess_type(destination.name)[0] or "application/octet-stream"
    checksum = _compute_sha256(destination)

    record = {
        "fileId": file_id,
        "fileName": destination.name,
        "displayName": display_name or source.name,
        "mimeType": resolved_mime,
        "storagePath": str(destination),
        "sizeBytes": size_bytes,
        "checksum": checksum,
        "uploader": uploader,
        "teamId": team_id,
        "runId": run_id,
        "visibility": visibility,
        "extra": {
            "originalPath": str(source),
        },
    }

    stored = _db.register_uploaded_file(record)
    stored["storageUri"] = stored.get("storagePath")
    stored["downloadUrl"] = f"/api/uploads/{stored['fileId']}"
    return stored
