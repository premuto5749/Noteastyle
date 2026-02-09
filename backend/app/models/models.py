import uuid
from datetime import datetime

from sqlalchemy import String, Text, Integer, Boolean, ForeignKey, DateTime, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Shop(Base):
    __tablename__ = "shops"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    shop_type: Mapped[str] = mapped_column(String(50))  # hair, nail, skin, scalp
    address: Mapped[str | None] = mapped_column(String(500))
    phone: Mapped[str | None] = mapped_column(String(20))
    subscription_plan: Mapped[str] = mapped_column(String(20), default="basic")  # basic, premium
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    designers: Mapped[list["Designer"]] = relationship(back_populates="shop", cascade="all, delete-orphan")
    customers: Mapped[list["Customer"]] = relationship(back_populates="shop", cascade="all, delete-orphan")


class Designer(Base):
    __tablename__ = "designers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shop_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shops.id"))
    name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(50), default="designer")  # owner, designer, assistant
    phone: Mapped[str | None] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    shop: Mapped["Shop"] = relationship(back_populates="designers")
    treatments: Mapped[list["Treatment"]] = relationship(back_populates="designer")


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shop_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shops.id"))
    name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(20))
    gender: Mapped[str | None] = mapped_column(String(10))
    birth_date: Mapped[str | None] = mapped_column(String(10))
    notes: Mapped[str | None] = mapped_column(Text)
    naver_booking_id: Mapped[str | None] = mapped_column(String(100))
    visit_count: Mapped[int] = mapped_column(Integer, default=0)
    last_visit: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    shop: Mapped["Shop"] = relationship(back_populates="customers")
    treatments: Mapped[list["Treatment"]] = relationship(back_populates="customer")


class Treatment(Base):
    __tablename__ = "treatments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"))
    designer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("designers.id"))
    shop_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shops.id"))

    # Treatment details
    service_type: Mapped[str] = mapped_column(String(50))  # cut, color, perm, treatment, etc.
    service_detail: Mapped[str | None] = mapped_column(String(200))
    products_used: Mapped[dict | None] = mapped_column(JSON)  # [{"brand": "로레알", "code": "7.1", "area": "뿌리"}]
    area: Mapped[str | None] = mapped_column(String(100))  # 뿌리, 전체, 앞머리 etc.
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    price: Mapped[int | None] = mapped_column(Integer)

    # Customer feedback
    satisfaction: Mapped[str | None] = mapped_column(String(20))  # high, medium, low
    customer_notes: Mapped[str | None] = mapped_column(Text)

    # AI-generated from voice memo
    voice_memo_url: Mapped[str | None] = mapped_column(String(500))
    ai_summary: Mapped[str | None] = mapped_column(Text)

    next_visit_recommendation: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    customer: Mapped["Customer"] = relationship(back_populates="treatments")
    designer: Mapped["Designer"] = relationship(back_populates="treatments")
    photos: Mapped[list["TreatmentPhoto"]] = relationship(back_populates="treatment", cascade="all, delete-orphan")


class TreatmentPhoto(Base):
    __tablename__ = "treatment_photos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    treatment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("treatments.id"))
    photo_url: Mapped[str] = mapped_column(String(500))
    photo_type: Mapped[str] = mapped_column(String(20))  # before, during, after
    face_swapped_url: Mapped[str | None] = mapped_column(String(500))
    is_portfolio: Mapped[bool] = mapped_column(Boolean, default=False)
    caption: Mapped[str | None] = mapped_column(String(300))
    taken_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    treatment: Mapped["Treatment"] = relationship(back_populates="photos")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shop_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shops.id"))
    photo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("treatment_photos.id"))
    title: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[dict | None] = mapped_column(JSON)  # ["염색", "로레알", "뿌리"]
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    photo: Mapped["TreatmentPhoto"] = relationship()
