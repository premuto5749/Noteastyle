from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import Shop
from app.schemas.schemas import ShopCreate, ShopResponse

router = APIRouter(prefix="/shops", tags=["shops"])


@router.post("/", response_model=ShopResponse)
async def create_shop(data: ShopCreate, db: AsyncSession = Depends(get_db)):
    shop = Shop(**data.model_dump())
    db.add(shop)
    await db.commit()
    await db.refresh(shop)
    return shop


@router.get("/{shop_id}", response_model=ShopResponse)
async def get_shop(shop_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Shop).where(Shop.id == shop_id))
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return shop
