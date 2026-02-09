from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import Portfolio, TreatmentPhoto
from app.schemas.schemas import PortfolioCreate, PortfolioResponse

router = APIRouter(prefix="/shops/{shop_id}/portfolio", tags=["portfolio"])


@router.post("/", response_model=PortfolioResponse)
async def create_portfolio_item(
    shop_id: UUID, data: PortfolioCreate, db: AsyncSession = Depends(get_db)
):
    # Verify photo exists
    result = await db.execute(
        select(TreatmentPhoto).where(TreatmentPhoto.id == data.photo_id)
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    # Mark photo as portfolio
    photo.is_portfolio = True

    portfolio = Portfolio(
        shop_id=shop_id,
        photo_id=data.photo_id,
        title=data.title,
        description=data.description,
        tags=data.tags,
    )
    db.add(portfolio)
    await db.commit()
    await db.refresh(portfolio)

    # Re-fetch with photo
    result = await db.execute(
        select(Portfolio)
        .options(selectinload(Portfolio.photo))
        .where(Portfolio.id == portfolio.id)
    )
    return result.scalar_one()


@router.get("/", response_model=list[PortfolioResponse])
async def list_portfolio(
    shop_id: UUID,
    published_only: bool = True,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Portfolio)
        .options(selectinload(Portfolio.photo))
        .where(Portfolio.shop_id == shop_id)
    )
    if published_only:
        query = query.where(Portfolio.is_published.is_(True))
    query = query.order_by(Portfolio.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/{portfolio_id}/publish", response_model=PortfolioResponse)
async def toggle_publish(
    shop_id: UUID, portfolio_id: UUID, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Portfolio)
        .options(selectinload(Portfolio.photo))
        .where(Portfolio.id == portfolio_id, Portfolio.shop_id == shop_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    item.is_published = not item.is_published
    await db.commit()
    await db.refresh(item)
    return item
