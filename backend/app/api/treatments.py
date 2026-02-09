from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import Treatment, TreatmentPhoto, Customer
from app.schemas.schemas import TreatmentCreate, TreatmentResponse, PhotoResponse
from app.services.storage import save_file_local

router = APIRouter(prefix="/shops/{shop_id}/treatments", tags=["treatments"])


@router.post("/", response_model=TreatmentResponse)
async def create_treatment(
    shop_id: UUID, data: TreatmentCreate, db: AsyncSession = Depends(get_db)
):
    products_data = None
    if data.products_used:
        products_data = [p.model_dump() for p in data.products_used]

    treatment = Treatment(
        shop_id=shop_id,
        customer_id=data.customer_id,
        designer_id=data.designer_id,
        service_type=data.service_type,
        service_detail=data.service_detail,
        products_used=products_data,
        area=data.area,
        duration_minutes=data.duration_minutes,
        price=data.price,
        satisfaction=data.satisfaction,
        customer_notes=data.customer_notes,
        next_visit_recommendation=data.next_visit_recommendation,
    )
    db.add(treatment)

    # Update customer visit count
    result = await db.execute(select(Customer).where(Customer.id == data.customer_id))
    customer = result.scalar_one_or_none()
    if customer:
        customer.visit_count += 1
        customer.last_visit = datetime.utcnow()

    await db.commit()
    await db.refresh(treatment)

    # Re-fetch with photos loaded
    result = await db.execute(
        select(Treatment)
        .options(selectinload(Treatment.photos))
        .where(Treatment.id == treatment.id)
    )
    return result.scalar_one()


@router.get("/", response_model=list[TreatmentResponse])
async def list_treatments(
    shop_id: UUID,
    customer_id: UUID | None = None,
    service_type: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Treatment)
        .options(selectinload(Treatment.photos))
        .where(Treatment.shop_id == shop_id)
    )
    if customer_id:
        query = query.where(Treatment.customer_id == customer_id)
    if service_type:
        query = query.where(Treatment.service_type == service_type)
    query = query.order_by(Treatment.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{treatment_id}", response_model=TreatmentResponse)
async def get_treatment(
    shop_id: UUID, treatment_id: UUID, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Treatment)
        .options(selectinload(Treatment.photos))
        .where(Treatment.id == treatment_id, Treatment.shop_id == shop_id)
    )
    treatment = result.scalar_one_or_none()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    return treatment


@router.post("/{treatment_id}/photos", response_model=PhotoResponse)
async def upload_treatment_photo(
    shop_id: UUID,
    treatment_id: UUID,
    photo_type: str = Form(default="after"),
    caption: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    # Verify treatment exists
    result = await db.execute(
        select(Treatment).where(
            Treatment.id == treatment_id, Treatment.shop_id == shop_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Treatment not found")

    content = await file.read()
    file_path = await save_file_local(content, file.filename, subfolder="photos")

    photo = TreatmentPhoto(
        treatment_id=treatment_id,
        photo_url=file_path,
        photo_type=photo_type,
        caption=caption,
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return photo
