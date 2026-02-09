from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import Customer
from app.schemas.schemas import CustomerCreate, CustomerResponse, CustomerListResponse

router = APIRouter(prefix="/shops/{shop_id}/customers", tags=["customers"])


@router.post("/", response_model=CustomerResponse)
async def create_customer(
    shop_id: UUID, data: CustomerCreate, db: AsyncSession = Depends(get_db)
):
    customer = Customer(shop_id=shop_id, **data.model_dump())
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


@router.get("/", response_model=list[CustomerListResponse])
async def list_customers(
    shop_id: UUID,
    search: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Customer).where(Customer.shop_id == shop_id)
    if search:
        query = query.where(Customer.name.ilike(f"%{search}%"))
    query = query.order_by(Customer.last_visit.desc().nullslast()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/count")
async def count_customers(shop_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.count()).select_from(Customer).where(Customer.shop_id == shop_id)
    )
    return {"count": result.scalar()}


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    shop_id: UUID, customer_id: UUID, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.shop_id == shop_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    shop_id: UUID,
    customer_id: UUID,
    data: CustomerCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.shop_id == shop_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    await db.commit()
    await db.refresh(customer)
    return customer
