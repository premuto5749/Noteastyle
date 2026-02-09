# Note-a-Style

뷰티샵 시술 기록 & 포트폴리오 플랫폼 - "시술 기록의 신"

## Overview

Note-a-Style은 헤어/네일/피부/두피관리 뷰티샵을 위한 시술 기록 관리 플랫폼입니다.

### MVP 핵심 기능

- **빠른 시술 기록** - 큰 버튼 탭으로 1초 만에 기록
- **상세 시술 기록** - 제품, 부위, 시간 등 꼼꼼한 기록
- **음성 메모** - 30초 음성으로 AI가 자동 구조화 (OpenAI Whisper + GPT-4o Structured Output)
- **AI 페이스 스왑** - AKOOL API를 활용한 초상권 보호 포트폴리오
- **포트폴리오 자동 생성** - 페이스 스왑된 시술 사진으로 SNS 포트폴리오
- **고객 관리** - 고객 정보, 방문 기록, 시술 히스토리

## Tech Stack

### Frontend
- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **PWA** (Progressive Web App - 모바일 최적화)

### Backend
- **FastAPI** (Python 3.12)
- **SQLAlchemy 2.0** (async)
- **PostgreSQL 16**
- **Alembic** (migrations)

### AI / External APIs
- **OpenAI Whisper** - 음성 → 텍스트 변환
- **GPT-4o Structured Output** - 텍스트 → 구조화된 시술 데이터
- **AKOOL API** - AI 페이스 스왑

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 22+ (for local frontend dev)
- Python 3.12+ (for local backend dev)

### Quick Start with Docker

```bash
# Clone and start all services
docker compose up -d

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Local Development

#### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | OpenAI API key for Whisper + GPT-4o |
| `AKOOL_API_KEY` | AKOOL API key for face swap |
| `AKOOL_CLIENT_ID` | AKOOL client ID |
| `SECRET_KEY` | App secret key |

## Project Structure

```
Noteastyle/
├── backend/
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   │   ├── shops.py
│   │   │   ├── customers.py
│   │   │   ├── treatments.py
│   │   │   ├── voice_memo.py
│   │   │   ├── portfolio.py
│   │   │   └── face_swap.py
│   │   ├── core/           # Config, database
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   │   ├── akool.py          # AKOOL face swap
│   │   │   ├── openai_service.py # Whisper + GPT-4o
│   │   │   └── storage.py        # File storage
│   │   └── main.py         # FastAPI app
│   ├── alembic/            # DB migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js pages
│   │   │   ├── page.tsx              # Home dashboard
│   │   │   ├── record/page.tsx       # Quick record (big buttons)
│   │   │   ├── treatments/page.tsx   # Treatment list
│   │   │   ├── treatments/new/page.tsx # Detailed record
│   │   │   ├── customers/page.tsx    # Customer management
│   │   │   └── portfolio/page.tsx    # Portfolio gallery
│   │   ├── components/     # Reusable UI components
│   │   └── lib/api.ts      # API client
│   ├── public/
│   │   └── manifest.json   # PWA manifest
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/shops/` | Create shop |
| GET | `/api/shops/{id}` | Get shop |
| POST | `/api/shops/{id}/customers/` | Create customer |
| GET | `/api/shops/{id}/customers/` | List customers |
| POST | `/api/shops/{id}/treatments/` | Create treatment |
| GET | `/api/shops/{id}/treatments/` | List treatments |
| POST | `/api/shops/{id}/treatments/{id}/photos` | Upload photo |
| POST | `/api/voice/transcribe` | Voice memo → structured data |
| POST | `/api/face-swap/` | Start face swap |
| GET | `/api/face-swap/status/{id}` | Check face swap status |
| POST | `/api/shops/{id}/portfolio/` | Create portfolio item |
| GET | `/api/shops/{id}/portfolio/` | List portfolio |

## Pricing Model (Target)

| Plan | Price | Features |
|------|-------|----------|
| Basic | 49,000원/월 | 무제한 시술 기록, AI 페이스 스왑 30장, 기본 포트폴리오 |
| Premium | 79,000원/월 | Basic + AI 페이스 스왑 100장, 자동 SNS 포스팅, 우선 지원 |
