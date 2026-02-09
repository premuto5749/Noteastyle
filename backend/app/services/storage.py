"""File storage service - local filesystem for dev, S3 for production."""

import os
import uuid
from pathlib import Path

from app.core.config import settings

UPLOAD_DIR = Path(settings.UPLOAD_DIR)


def ensure_upload_dir():
    """Create upload directory if it doesn't exist."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def save_file_local(file_content: bytes, filename: str, subfolder: str = "") -> str:
    """Save file to local filesystem and return relative path."""
    ensure_upload_dir()
    target_dir = UPLOAD_DIR / subfolder if subfolder else UPLOAD_DIR
    target_dir.mkdir(parents=True, exist_ok=True)

    ext = os.path.splitext(filename)[1]
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = target_dir / unique_name

    with open(file_path, "wb") as f:
        f.write(file_content)

    return str(file_path)


async def get_file_url(file_path: str) -> str:
    """Get URL for a stored file. In dev, returns local path."""
    return f"/uploads/{file_path}"
