from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import TreatmentPhoto
from app.services.akool import face_swap, get_face_swap_status

router = APIRouter(prefix="/face-swap", tags=["face-swap"])


@router.post("/")
async def start_face_swap(
    source_photo_id: UUID,
    target_photo_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Start a face swap job.
    - source_photo_id: photo with the face to use (stock/model face)
    - target_photo_id: treatment photo whose face will be replaced
    """
    source_result = await db.execute(
        select(TreatmentPhoto).where(TreatmentPhoto.id == source_photo_id)
    )
    source = source_result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source photo not found")

    target_result = await db.execute(
        select(TreatmentPhoto).where(TreatmentPhoto.id == target_photo_id)
    )
    target = target_result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target photo not found")

    result = await face_swap(source.photo_url, target.photo_url)
    return result


@router.get("/status/{job_id}")
async def check_face_swap_status(job_id: str):
    """Check the status of a face swap job."""
    result = await get_face_swap_status(job_id)
    return result


@router.post("/complete/{photo_id}")
async def save_face_swap_result(
    photo_id: UUID,
    face_swapped_url: str,
    db: AsyncSession = Depends(get_db),
):
    """Save the completed face swap result URL to the photo record."""
    result = await db.execute(
        select(TreatmentPhoto).where(TreatmentPhoto.id == photo_id)
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    photo.face_swapped_url = face_swapped_url
    await db.commit()
    await db.refresh(photo)
    return {"status": "ok", "photo_id": str(photo.id), "face_swapped_url": face_swapped_url}
