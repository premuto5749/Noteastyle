from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api import shops, customers, treatments, voice_memo, portfolio, face_swap

app = FastAPI(
    title=settings.APP_NAME,
    description="뷰티샵 시술 기록 및 포트폴리오 플랫폼",
    version="0.1.0",
)

# CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded photos (development)
app.mount("/uploads", StaticFiles(directory="uploads", check_dir=False), name="uploads")

# Routers
app.include_router(shops.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(treatments.router, prefix="/api")
app.include_router(voice_memo.router, prefix="/api")
app.include_router(portfolio.router, prefix="/api")
app.include_router(face_swap.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Note-a-Style API"}
