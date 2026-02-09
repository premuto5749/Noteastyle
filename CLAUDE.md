# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project: Note-a-Style - 뷰티샵 시술 기록 & 포트폴리오 플랫폼

## 1. 프로젝트 목표

뷰티샵(헤어/네일/피부/두피관리)의 **시술 기록 관리와 AI 포트폴리오 생성**을 위한 플랫폼.

> **핵심 포지셔닝**: 기존 CRM(Handsos, 헤어짱 등) 위에 얹어지는 프리미엄 애드온. 예약이 아닌 **시술 내용 기록과 AI 포트폴리오**에 집중.

슬로건: **"시술 기록의 신"**

### 핵심 가치
- 초상권 침해 없이 AI 페이스 스왑으로 포트폴리오 생성 (AKOOL API)
- 시술 사진 위에 직접 시술 내용 기록 (AI 스타일 노트)
- 음성 메모 30초 → AI가 시술 데이터 자동 구조화 (Whisper + GPT-4o)
- 큰 버튼 탭 1초 만에 빠른 기록 (팔꿈치로도 가능)

### 산업 배경
- 2024년 기준 뷰티 관련 업장 약 120,000개 (부동산보다 많음)
- 예약관리에만 집중된 획일화된 솔루션 사용 중
- 관리 업무, 홍보/마케팅, 기자재 소싱을 모두 별도 관리 → 비용 증가
- K-뷰티는 세계적 영향력을 가지고 있으나 디지털/전산화가 부족

---

## 2. 프로젝트 문서 구조

이 프로젝트는 다음 문서들로 구성되어 있습니다:

### 핵심 문서

| 파일 | 역할 |
|------|------|
| **CLAUDE.md** (이 파일) | 개발 가이드라인 및 프로젝트 규칙 |
| **README.md** | 프로젝트 개요 및 Quick Start |

### 기초 문서 (docs/)

| 파일 | 내용 |
|------|------|
| `About_Note-a-Style_노터스타일에_대하여.pdf` | 프로젝트 비전, AI 기능 소개, Value Chain 설명 |
| `Pain_Point__Hurdle.pdf` | K-뷰티 산업 Pain Point, 비효율 분석, 악순환 구조 |
| `note-a-style-full-conversation.md` | 기획 대화 전체 요약 (기술 검토, 의사결정 과정, 비용 계산) |
| `노터스타일 기능 목록 *.csv` | 전체 기능 목록 (구분, 우선순위, 연관기능) |
| `노터스타일 기능 목록 *_all.csv` | 기능 목록 피벗 뷰 |
| `deployment-guide.md` | 프로덕션 배포 가이드 (Vercel + Railway + Supabase/Neon) |

---

## 3. 아키텍처 개요

### 시스템 구성 (Frontend + Backend 분리형)

```
┌────────────────────┐    HTTP/REST     ┌────────────────────┐    asyncpg    ┌──────────────┐
│  Next.js 15 (PWA)  │ ──────────────→ │  FastAPI (Python)  │ ──────────→ │ PostgreSQL 16│
│  localhost:3000     │ ←────────────── │  localhost:8000    │ ←────────── │ localhost:5432│
└────────────────────┘    JSON          └────────────────────┘             └──────────────┘
                                               │
                                     ┌─────────┼─────────┐
                                     ▼         ▼         ▼
                               ┌──────────┐ ┌──────┐ ┌──────────┐
                               │ OpenAI   │ │AKOOL │ │ AWS S3   │
                               │ Whisper  │ │Face  │ │ Photos   │
                               │ + GPT-4o │ │Swap  │ │          │
                               └──────────┘ └──────┘ └──────────┘
```

> **premuto 프로젝트와의 차이**: premuto는 Next.js 모놀리식(Supabase 직접 연결)이지만, Noteastyle은 **Frontend + Backend 분리 아키텍처**로 FastAPI가 모든 비즈니스 로직과 DB 접근을 담당합니다.

### 시술 기록 데이터 흐름 (Core Flow)

```
시술 완료
  │
  ├─ [방법 A] 큰 버튼 탭 (1초)
  │   └→ QuickRecordCreate → POST /api/shops/{id}/treatments/
  │
  ├─ [방법 B] 사진만 찍기 (0.5초)
  │   └→ POST /api/shops/{id}/treatments/{id}/photos → 나중에 상세 입력
  │
  └─ [방법 C] 음성 메모 (30초)
      └→ 녹음 → POST /api/voice/transcribe
          └→ Whisper 변환 → GPT-4o Structured Output → 구조화 데이터
              └→ 음성 파일 즉시 삭제 (프라이버시)
```

### AI 페이스 스왑 흐름

```
시술 사진 (before/after)
  └→ POST /api/face-swap/ (AKOOL API 호출)
      └→ 비동기 처리 → GET /api/face-swap/status/{id} (폴링)
          └→ 완료 시 face_swapped_url 저장
              └→ 포트폴리오 자동 생성 가능
```

---

## 4. 기술 스택

### Frontend
- **Next.js 15** (App Router) + **React 19**
- **TypeScript 5**
- **Tailwind CSS v4**
- **PWA** (Progressive Web App - 모바일/태블릿 최적화)

### Backend
- **FastAPI** (Python 3.12)
- **SQLAlchemy 2.0** (async, asyncpg)
- **PostgreSQL 16**
- **Alembic** (DB migrations)
- **Pydantic v2** + pydantic-settings

### AI / External APIs
- **OpenAI Whisper** → 음성을 텍스트로 변환 ($0.006/분)
- **GPT-4o Structured Output** → 텍스트를 구조화된 시술 데이터로 변환 (100% JSON 스키마 준수)
- **AKOOL API** → AI 페이스 스왑 (엔터프라이즈급, 4K 해상도, 상업적 라이선스)

### 인프라
- **Docker Compose** (db, backend, frontend 3개 서비스)
- **AWS S3** (사진 저장, ap-northeast-2)
- 개발 시 로컬 `uploads/` 디렉터리 사용

### 주요 Backend 의존성 (requirements.txt)
```
fastapi==0.115.6        # 웹 프레임워크
uvicorn[standard]       # ASGI 서버
sqlalchemy==2.0.36      # ORM (async)
asyncpg==0.30.0         # PostgreSQL async 드라이버
alembic==1.14.1         # DB 마이그레이션
pydantic==2.10.4        # 데이터 검증
openai==1.58.1          # Whisper + GPT-4o
httpx==0.28.1           # AKOOL API 호출
boto3==1.36.2           # AWS S3
Pillow==11.1.0          # 이미지 처리
python-jose             # JWT 토큰
passlib[bcrypt]         # 비밀번호 해싱
```

---

## 5. 프로젝트 구조

```
Noteastyle/
├── CLAUDE.md                  # 이 파일 (개발 가이드)
├── README.md                  # 프로젝트 개요
├── docker-compose.yml         # Docker 서비스 구성 (db, backend, frontend)
├── .gitignore
│
├── docs/                      # 기초 문서
│   ├── About_Note-a-Style_노터스타일에_대하여.pdf
│   ├── Pain_Point__Hurdle.pdf
│   ├── note-a-style-full-conversation.md
│   ├── deployment-guide.md    # 프로덕션 배포 가이드
│   ├── 노터스타일 기능 목록 *.csv
│   └── 노터스타일 기능 목록 *_all.csv
│
├── backend/                   # FastAPI Python Backend
│   ├── app/
│   │   ├── main.py            # FastAPI 앱 엔트리포인트, CORS, 라우터 등록
│   │   ├── api/               # API 엔드포인트 (도메인별 분리)
│   │   │   ├── shops.py       # 매장 CRUD
│   │   │   ├── customers.py   # 고객 CRUD
│   │   │   ├── treatments.py  # 시술 기록 CRUD
│   │   │   ├── voice_memo.py  # 음성 메모 → AI 구조화
│   │   │   ├── portfolio.py   # 포트폴리오 관리
│   │   │   └── face_swap.py   # AKOOL 페이스 스왑
│   │   ├── core/
│   │   │   ├── config.py      # Settings (pydantic-settings, env 기반)
│   │   │   └── database.py    # async SQLAlchemy 엔진 + 세션 팩토리
│   │   ├── models/
│   │   │   └── models.py      # SQLAlchemy ORM 모델 (6개 테이블)
│   │   ├── schemas/
│   │   │   └── schemas.py     # Pydantic v2 요청/응답 스키마
│   │   └── services/
│   │       ├── openai_service.py  # Whisper + GPT-4o Structured Output
│   │       ├── akool.py           # AKOOL 페이스 스왑 서비스
│   │       └── storage.py         # 파일 저장 (로컬/S3 분기)
│   ├── alembic/               # DB 마이그레이션
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
└── frontend/                  # Next.js 15 Frontend
    ├── src/
    │   ├── app/               # App Router 페이지
    │   │   ├── page.tsx               # 홈 대시보드 (통계, 최근 시술)
    │   │   ├── record/page.tsx        # 빠른 기록 (큰 버튼 UI)
    │   │   ├── treatments/page.tsx    # 시술 목록
    │   │   ├── treatments/new/page.tsx # 상세 기록 작성
    │   │   ├── customers/page.tsx     # 고객 관리
    │   │   └── portfolio/page.tsx     # 포트폴리오 갤러리
    │   ├── components/        # 재사용 UI 컴포넌트
    │   └── lib/
    │       └── api.ts         # API 클라이언트 (typed fetch 래퍼)
    ├── public/
    │   └── manifest.json      # PWA 매니페스트
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── postcss.config.mjs
    └── Dockerfile
```

---

## 6. 데이터 모델

모든 엔티티는 **UUID** 기본 키, `created_at`/`updated_at` 타임스탬프 포함.
정의 위치: `backend/app/models/models.py`

### 엔티티 관계도

```
Shop (매장)
├── name, type (hair/nail/skin/scalp), address, phone
├── subscription_plan (basic/premium)
├── 1:N → Designer[]
├── 1:N → Customer[]
├── 1:N → Treatment[]
└── 1:N → Portfolio[]

Designer (디자이너)
├── shop_id (FK → Shop)
├── name, role (owner/designer/assistant), phone, specialty
└── 1:N → Treatment[]

Customer (고객)
├── shop_id (FK → Shop)
├── name, phone, gender, birth_date
├── visit_count, notes, naver_booking_id
└── 1:N → Treatment[]

Treatment (시술 기록) ← 핵심 엔티티
├── shop_id, customer_id, designer_id (FK)
├── service_type, service_detail
├── products_used: JSON (List[ProductUsed])
│   └── ProductUsed: { product_name, amount, color_code }
├── duration_minutes, price
├── satisfaction (1-5), customer_memo, ai_summary
├── voice_memo_text (Whisper 변환 텍스트)
├── 1:N → TreatmentPhoto[]
└── 1:N → Portfolio[]

TreatmentPhoto (시술 사진)
├── treatment_id (FK → Treatment)
├── photo_url, photo_type (before/during/after)
├── face_swapped_url (AKOOL 처리 결과)
├── is_portfolio (포트폴리오 사용 여부)
└── notes

Portfolio (포트폴리오)
├── shop_id, treatment_id (FK)
├── title, description, tags: JSON
├── before_photo_url, after_photo_url
└── is_published
```

---

## 7. API 엔드포인트 명세

Base URL: `http://localhost:8000/api`
Swagger 문서: `http://localhost:8000/docs`

### 매장/고객/시술 CRUD

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| POST | `/shops/` | 매장 생성 |
| GET | `/shops/{id}` | 매장 조회 |
| POST | `/shops/{id}/customers/` | 고객 생성 |
| GET | `/shops/{id}/customers/` | 고객 목록 |
| GET | `/shops/{id}/customers/{id}` | 고객 상세 |
| POST | `/shops/{id}/treatments/` | 시술 기록 생성 |
| GET | `/shops/{id}/treatments/` | 시술 목록 |
| GET | `/shops/{id}/treatments/{id}` | 시술 상세 |
| POST | `/shops/{id}/treatments/{id}/photos` | 시술 사진 업로드 (multipart) |

### AI 기능

| Method | Path | 설명 |
|--------|------|------|
| POST | `/voice/transcribe` | 음성 메모 → Whisper → GPT-4o → 구조화 데이터 |
| POST | `/face-swap/` | AKOOL 페이스 스왑 시작 (비동기) |
| GET | `/face-swap/status/{id}` | 페이스 스왑 처리 상태 확인 |

### 포트폴리오

| Method | Path | 설명 |
|--------|------|------|
| POST | `/shops/{id}/portfolio/` | 포트폴리오 생성 |
| GET | `/shops/{id}/portfolio/` | 포트폴리오 목록 |

---

## 8. 핵심 비즈니스 규칙

### A. 시술 기록 입력 우선순위

바쁜 뷰티샵 환경에 최적화된 세 가지 입력 방식:

| 우선순위 | 방법 | 소요 시간 | 시나리오 |
|---------|------|----------|---------|
| 1순위 | 큰 버튼 탭 | 1초 | 바쁜 시간(10-14시), 팔꿈치/장갑 착용 중 |
| 2순위 | 사진만 찍기 | 0.5초 | 시술 중 기록, 나중에 정리 |
| 3순위 | 음성 메모 | 30초 | 한가한 시간, 시술 후 일괄 정리 |

### B. 음성 메모 처리 규칙

```
녹음(30초) → Whisper API → 텍스트 → GPT-4o Structured Output → JSON
```

- 음성 파일은 텍스트 변환 후 **즉시 삭제** (프라이버시 보호)
- 텍스트만 DB에 저장 (`Treatment.voice_memo_text`)
- GPT-4o Structured Output으로 100% JSON 스키마 준수
- 비용: 하루 10명 × 30초 = 5분 → **$0.03/일, $0.66/월**

### C. 페이스 스왑 규칙

- AKOOL API 사용 (엔터프라이즈급, 상업적 라이선스)
- 이미지 1장당 4 크레딧, 4장 생성
- 비동기 처리: 요청 → 폴링으로 상태 확인 → 완료 시 URL 저장
- 비용: 월 100장 기준 **$50**

### D. 사진 저장 규칙

- 개발: 로컬 `uploads/` 디렉터리 (Docker volume)
- 프로덕션: AWS S3 `noteastyle-photos` 버킷 (ap-northeast-2)
- 최대 파일 크기: **10MB**
- 사진 타입: `before` / `during` / `after`

---

## 9. 개발 환경 설정

### Docker (권장)
```bash
docker compose up -d

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs (Swagger): http://localhost:8000/docs
# PostgreSQL: localhost:5432
```

### 로컬 개발

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # API 키 설정
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 개발 명령어

```bash
# Backend
uvicorn app.main:app --reload          # 개발 서버 (핫 리로드)
alembic upgrade head                    # DB 마이그레이션 적용
alembic revision --autogenerate -m ""   # 새 마이그레이션 생성

# Frontend
npm run dev                             # 개발 서버
npm run build                           # 프로덕션 빌드
npm run lint                            # ESLint

# Docker
docker compose up -d                    # 전체 서비스 시작
docker compose down                     # 전체 서비스 중지
docker compose logs -f backend          # 백엔드 로그 확인
```

### 환경 변수 (backend/.env)

| 변수 | 설명 | 필수 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | Y |
| `OPENAI_API_KEY` | OpenAI API 키 (Whisper + GPT-4o) | Y |
| `AKOOL_API_KEY` | AKOOL 페이스 스왑 API 키 | Y |
| `AKOOL_CLIENT_ID` | AKOOL 클라이언트 ID | Y |
| `AWS_ACCESS_KEY_ID` | AWS S3 접근 키 | N (로컬은 uploads/) |
| `AWS_SECRET_ACCESS_KEY` | AWS S3 시크릿 키 | N |
| `AWS_S3_BUCKET` | S3 버킷명 (기본: noteastyle-photos) | N |
| `AWS_REGION` | AWS 리전 (기본: ap-northeast-2) | N |
| `SECRET_KEY` | 앱 시크릿 키 | Y |
| `CORS_ORIGINS` | CORS 허용 오리진 (기본: http://localhost:3000) | N |

---

## 10. 코딩 컨벤션

### Backend (Python)
- FastAPI 라우터는 `app/api/` 아래 **도메인별 파일로 분리** (shops, customers, treatments...)
- 비즈니스 로직은 `app/services/`에 분리 (API 핸들러는 얇게 유지)
- 모든 DB 작업은 **async/await** 사용 (AsyncSession)
- Pydantic v2 스키마로 요청/응답 검증 (`from_attributes = True`)
- 환경 변수는 `app/core/config.py`의 **Settings 클래스**로 관리 (pydantic-settings)
- DB 의존성 주입: `get_db()` async generator → FastAPI Depends

### Frontend (TypeScript)
- Next.js 15 **App Router** 사용 (`src/app/` 디렉토리)
- API 호출은 `src/lib/api.ts`의 **타입화된 함수** 사용 (`request<T>()` 제네릭 래퍼)
- 스타일링은 **Tailwind CSS v4** 유틸리티 클래스
- 컴포넌트는 `src/components/`에 배치
- CSS 커스텀 변수: `--primary`, `--primary-dark`, `--accent`

### 공통
- 민감 정보 (`.env`, API 키)는 **절대 커밋하지 않음**
- 파일 업로드 최대 크기: 10MB
- 사진 저장: 개발 시 로컬 `uploads/`, 프로덕션 시 AWS S3

---

## 11. Git 워크플로우

### 작업 순서 (반드시 준수)

```
1. main 최신화        git checkout main && git pull
2. 새 브랜치 생성      git checkout -b feat/기능명
3. 코드 작업           (파일 수정)
4. 커밋               git add <파일들> && git commit -m "..."
5. 푸시               git push -u origin feat/기능명
6. PR 생성            gh pr create ...
7. 머지               gh pr merge ... --squash --delete-branch
8. main 복귀          git checkout main && git pull
```

### 절대 규칙
- **어떤 코드 수정이든 반드시 브랜치를 먼저 생성**한 후 진행. 예외 없음.
- 단 한 줄의 수정이라도 main에서 직접 파일을 수정하지 않음.
- 항상 **main에서 새 브랜치를 생성**. 다른 브랜치에서 분기하지 않음.
- 어떤 작업이든 반드시 **PR을 생성**. main에 직접 커밋/푸시 금지.
- 머지 시 `--squash`로 커밋 정리, `--delete-branch`로 원격 브랜치 삭제.

### 브랜치 네이밍
- 기능 추가: `feat/기능명` (예: `feat/voice-memo`)
- 버그 수정: `fix/이슈번호-설명` (예: `fix/12-photo-upload`)
- 리팩토링: `refactor/대상` (예: `refactor/api-client`)
- 문서: `docs/대상` (예: `docs/deployment-guide`)

### 커밋 메시지
- 한국어 또는 영어 모두 가능
- Conventional Commits 형식 권장
- 예: `feat: 음성 메모 AI 구조화 기능 추가`, `fix: 사진 업로드 CORS 오류 수정`

---

## 12. MVP 기능 우선순위

### Phase 1 - 1순위 (필수)
- [x] 매장/고객/시술 CRUD
- [x] 빠른 시술 기록 (큰 버튼 UI)
- [x] 상세 시술 기록 (제품, 부위, 시간)
- [x] 시술 사진 업로드 (before/during/after)
- [ ] 음성 메모 → AI 구조화 (Whisper + GPT-4o)
- [ ] AI 페이스 스왑 (AKOOL API)
- [ ] 포트폴리오 자동 생성

### Phase 1 - 2순위 (예정)
- [ ] 네이버 예약 연동 (고객 자동 생성)
- [ ] 자동 모자이크 (수동 모자이크 우선)
- [ ] AI 얼굴 변경 심화
- [ ] 예약 변경 Drag & Drop

### Phase 2-3 (미래)
- 기자재 재고 관리 / 마켓플레이스
- AI 상담 챗봇
- 수익 분석
- AI 스타일러 (스타일 미리보기)
- 구인구직 / 디자이너 포트폴리오

---

## 13. 가격 정책

| 플랜 | 가격 | 주요 기능 |
|------|------|----------|
| Basic | ₩49,000/월 | 무제한 시술 기록, AI 페이스 스왑 30장, 기본 포트폴리오 |
| Premium | ₩79,000/월 | Basic + AI 페이스 스왑 100장, 자동 SNS 포스팅, 우선 지원 |

### 비용 구조 (샵 1개 기준)
| 항목 | 월 비용 |
|------|---------|
| 음성 인식 (Whisper) | ~$1 |
| 페이스 스왑 (AKOOL) | $25-50 (50-100장) |
| 서버/DB | ~$5 |
| **총 원가** | **$31-56 (₩41,000-74,000)** |

---

## 14. 배포 전략

> 📘 **상세 가이드**: [docs/deployment-guide.md](docs/deployment-guide.md)

### 권장 프로덕션 구성

| 컴포넌트 | 서비스 | 이유 |
|---------|--------|------|
| Frontend (Next.js) | **Vercel** | Next.js 최적 호스팅, 자동 배포, CDN |
| Backend (FastAPI) | **Railway** | Python 지원, 간편 배포, 자동 스케일링 |
| Database (PostgreSQL) | **Supabase** 또는 **Neon** | 관리형 PostgreSQL, 무료 티어 |
| File Storage | **AWS S3** | 이미 설정됨, ap-northeast-2 |

### 개발/로컬

Docker Compose로 모든 서비스 로컬 실행 (현재 구성).
