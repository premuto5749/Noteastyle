from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


# --- Shop ---
class ShopCreate(BaseModel):
    name: str
    shop_type: str
    address: str | None = None
    phone: str | None = None


class ShopResponse(BaseModel):
    id: UUID
    name: str
    shop_type: str
    address: str | None
    phone: str | None
    subscription_plan: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Designer ---
class DesignerCreate(BaseModel):
    name: str
    role: str = "designer"
    phone: str | None = None


class DesignerResponse(BaseModel):
    id: UUID
    shop_id: UUID
    name: str
    role: str
    phone: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Customer ---
class CustomerCreate(BaseModel):
    name: str
    phone: str | None = None
    gender: str | None = None
    birth_date: str | None = None
    notes: str | None = None
    naver_booking_id: str | None = None


class CustomerResponse(BaseModel):
    id: UUID
    shop_id: UUID
    name: str
    phone: str | None
    gender: str | None
    birth_date: str | None
    notes: str | None
    visit_count: int
    last_visit: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CustomerListResponse(BaseModel):
    id: UUID
    name: str
    phone: str | None
    visit_count: int
    last_visit: datetime | None

    model_config = {"from_attributes": True}


# --- Treatment ---
class ProductUsed(BaseModel):
    brand: str
    code: str | None = None
    area: str | None = None


class TreatmentCreate(BaseModel):
    customer_id: UUID
    designer_id: UUID | None = None
    service_type: str
    service_detail: str | None = None
    products_used: list[ProductUsed] | None = None
    area: str | None = None
    duration_minutes: int | None = None
    price: int | None = None
    satisfaction: str | None = None
    customer_notes: str | None = None
    next_visit_recommendation: str | None = None


class TreatmentResponse(BaseModel):
    id: UUID
    customer_id: UUID
    designer_id: UUID | None
    shop_id: UUID
    service_type: str
    service_detail: str | None
    products_used: list[ProductUsed] | None
    area: str | None
    duration_minutes: int | None
    price: int | None
    satisfaction: str | None
    customer_notes: str | None
    ai_summary: str | None
    next_visit_recommendation: str | None
    created_at: datetime
    photos: list["PhotoResponse"]

    model_config = {"from_attributes": True}


# --- Photo ---
class PhotoResponse(BaseModel):
    id: UUID
    treatment_id: UUID
    photo_url: str
    photo_type: str
    face_swapped_url: str | None
    is_portfolio: bool
    caption: str | None
    taken_at: datetime

    model_config = {"from_attributes": True}


# --- Portfolio ---
class PortfolioCreate(BaseModel):
    photo_id: UUID
    title: str | None = None
    description: str | None = None
    tags: list[str] | None = None


class PortfolioResponse(BaseModel):
    id: UUID
    shop_id: UUID
    photo_id: UUID
    title: str | None
    description: str | None
    tags: list[str] | None
    is_published: bool
    created_at: datetime
    photo: PhotoResponse

    model_config = {"from_attributes": True}


# --- Voice Memo ---
class VoiceMemoResponse(BaseModel):
    customer_name: str | None = None
    service_type: str | None = None
    products_used: list[ProductUsed] | None = None
    area: str | None = None
    duration_minutes: int | None = None
    satisfaction: str | None = None
    next_visit_recommendation: str | None = None
    summary: str | None = None


# --- Quick Record (Big Button) ---
class QuickRecordCreate(BaseModel):
    customer_id: UUID
    service_type: str
    products: list[ProductUsed] | None = None
    photo_ids: list[UUID] | None = None
