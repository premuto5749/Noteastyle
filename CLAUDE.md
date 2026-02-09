# CLAUDE.md - Note-a-Style 개발 가이드

> 이 문서는 Claude Code가 Note-a-Style 프로젝트를 이해하고 개발하기 위한 종합 가이드입니다.

## 프로젝트 개요

**Note-a-Style (노터스타일)** - 뷰티샵 시술 기록 & 포트폴리오 플랫폼

슬로건: **"시술 기록의 신"**

헤어/네일/피부/두피관리 뷰티샵을 위한 시술 기록 관리 플랫폼. 기존 CRM(Handsos, 헤어짱 등) 위에 얹어지는 프리미엄 애드온으로, 예약이 아닌 **시술 내용 기록과 AI 포트폴리오**에 집중.

### 핵심 가치
- 초상권 침해 없이 AI 페이스 스왑으로 포트폴리오 생성
- 시술 사진 위에 직접 시술 내용 기록 (AI 스타일 노트)
- 음성 메모 30초로 AI가 시술 데이터 자동 구조화
- 큰 버튼 탭 1초 만에 빠른 기록

### 산업 배경
- 2024년 기준 뷰티 관련 업장 약 120,000개 (부동산보다 많음)
- 예약관리에만 집중된 획일화된 솔루션 사용 중
- 관리 업무, 홍보/마케팅, 기자재 소싱을 모두 별도 관리 → 비용 증가

---

## 기술 스택

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
- **OpenAI Whisper** → 음성을 텍스트로 변환
- **GPT-4o Structured Output** → 텍스트를 구조화된 시술 데이터로 변환
- **AKOOL API** → AI 페이스 스왑 (엔터프라이즈급, 4K 해상도)

### 인프라
- **Docker Compose** (db, backend, frontend 3개 서비스)
- **AWS S3** (사진 저장, ap-northeast-2)
- 개발 시 로컬 uploads/ 디렉터리 사용

---

## 프로젝트 구조

```
Noteastyle/
├── CLAUDE.md                  # 이 파일 (개발 가이드)
├── README.md                  # 프로젝트 개요
├── docker-compose.yml         # Docker 서비스 구성 (db, backend, frontend)
├── .gitignore
│
├── docs/                      # 기초 문서
│   ├── About_Note-a-Style_노터스타일에_대하여.pdf   # 프로젝트 비전/기능 소개
│   ├── Pain_Point__Hurdle.pdf                       # 산업 Pain Point 분석
│   ├── note-a-style-full-conversation.md            # 기획 대화 전체 요약
│   ├── 노터스타일 기능 목록 *.csv                     # 전체 기능 목록 (우선순위 포함)
│   └── 노터스타일 기능 목록 *_all.csv                 # 기능 목록 (피벗 뷰)
│
├── backend/                   # FastAPI Python Backend
│   ├── app/
│   │   ├── main.py            # FastAPI 앱 엔트리포인트
│   │   ├── api/               # API 엔드포인트 모듈
│   │   │   ├── shops.py       # 매장 CRUD
│   │   │   ├── customers.py   # 고객 CRUD
│   │   │   ├── treatments.py  # 시술 기록 CRUD
│   │   │   ├── voice_memo.py  # 음성 메모 → AI 구조화
│   │   │   ├── portfolio.py   # 포트폴리오 관리
│   │   │   └── face_swap.py   # AKOOL 페이스 스왑
│   │   ├── core/
│   │   │   ├── config.py      # Settings (env 기반)
│   │   │   └── database.py    # async SQLAlchemy 세션
│   │   ├── models/
│   │   │   └── models.py      # SQLAlchemy ORM 모델
│   │   ├── schemas/
│   │   │   └── schemas.py     # Pydantic 요청/응답 스키마
│   │   └── services/
│   │       ├── openai_service.py  # Whisper + GPT-4o 연동
│   │       ├── akool.py           # AKOOL 페이스 스왑 서비스
│   │       └── storage.py         # 파일 저장 (로컬/S3)
│   ├── alembic/               # DB 마이그레이션
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
└── frontend/                  # Next.js 15 Frontend
    ├── src/
    │   ├── app/               # App Router 페이지
    │   │   ├── page.tsx               # 홈 대시보드
    │   │   ├── record/page.tsx        # 빠른 기록 (큰 버튼)
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

## 데이터 모델

모든 엔티티는 **UUID** 기본 키 사용, `created_at`/`updated_at` 타임스탬프 포함.

### 핵심 모델

```
Shop (매장)
├── name, type (hair/nail/skin/scalp), address, phone
├── subscription_plan (basic/premium)
├── designers: Designer[]
├── customers: Customer[]
└── treatments: Treatment[]

Designer (디자이너)
├── shop_id (FK → Shop)
├── name, role (owner/designer/assistant), phone, specialty
└── treatments: Treatment[]

Customer (고객)
├── shop_id (FK → Shop)
├── name, phone, gender, birth_date
├── visit_count, notes, naver_booking_id
└── treatments: Treatment[]

Treatment (시술 기록) ← 핵심 엔티티
├── shop_id, customer_id, designer_id (FK)
├── service_type, service_detail
├── products_used: JSON (List[ProductUsed])
├── duration_minutes, price
├── satisfaction, customer_memo, ai_summary
├── voice_memo_text (음성 메모 변환 텍스트)
├── photos: TreatmentPhoto[]
└── portfolio: Portfolio[]

TreatmentPhoto (시술 사진)
├── treatment_id (FK → Treatment)
├── photo_url, photo_type (before/during/after)
├── face_swapped_url, is_portfolio
└── notes

Portfolio (포트폴리오)
├── shop_id, treatment_id (FK)
├── title, description, tags: JSON
├── before_photo_url, after_photo_url
└── is_published
```

---

## API 엔드포인트

Base URL: `http://localhost:8000/api`

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
| POST | `/shops/{id}/treatments/{id}/photos` | 시술 사진 업로드 |
| POST | `/voice/transcribe` | 음성 메모 → 구조화 데이터 |
| POST | `/face-swap/` | 페이스 스왑 시작 |
| GET | `/face-swap/status/{id}` | 페이스 스왑 상태 확인 |
| POST | `/shops/{id}/portfolio/` | 포트폴리오 생성 |
| GET | `/shops/{id}/portfolio/` | 포트폴리오 목록 |

---

## 핵심 기능 상세

### 1. 시술 기록 (코어 기능)
세 가지 입력 방식 지원:
- **방법 A: 큰 버튼 탭** (1순위) → 1초 만에 기록, 팔꿈치로도 가능
- **방법 B: 사진만 찍기** (2순위) → 0.5초, 나중에 정리
- **방법 C: 음성 메모** (3순위) → 30초 음성 → AI 자동 구조화

### 2. 음성 메모 → AI 구조화
```
흐름: 녹음(30초) → Whisper 변환 → GPT-4o Structured Output → 구조화 데이터
비용: 하루 10명 × 30초 = 5분 → $0.03/일, $0.66/월
```
- 음성 파일은 텍스트 변환 후 즉시 삭제 (프라이버시)
- GPT-4o Structured Output으로 100% 정확한 JSON 스키마 준수

### 3. AI 페이스 스왑
- AKOOL API 사용 (엔터프라이즈급, 상업적 사용 라이선스)
- 이미지 1장당 4 크레딧
- 비용: 월 100장 기준 $50
- 초상권 보호 포트폴리오 생성에 핵심

### 4. 포트폴리오 자동 생성
- 페이스 스왑된 시술 사진 자동 정리
- SNS 공유 기능 (Phase 1에서는 수동 공유)

---

## 개발 환경 설정

### Docker (권장)
```bash
docker compose up -d

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs (Swagger): http://localhost:8000/docs
```

### 로컬 개발

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # API 키 설정 필요
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
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

## Git 워크플로우

### 브랜치 규칙
- 코드 변경 전 반드시 브랜치 생성
- main에 직접 커밋 금지, 항상 PR을 통해 병합
- 병합 시 `--squash --delete-branch` 사용

### 브랜치 네이밍
- 기능 추가: `feat/기능명` (예: `feat/voice-memo`)
- 버그 수정: `fix/이슈번호-설명` (예: `fix/12-photo-upload`)
- 리팩토링: `refactor/대상` (예: `refactor/api-client`)

### 커밋 메시지
- 한국어 또는 영어 모두 가능
- 명확하고 간결하게 변경 사항 기술
- 예: `feat: 음성 메모 AI 구조화 기능 추가`

---

## MVP 기능 우선순위 (Phase 1)

### 1순위 (필수)
- [x] 매장/고객/시술 CRUD
- [x] 빠른 시술 기록 (큰 버튼 UI)
- [x] 상세 시술 기록 (제품, 부위, 시간)
- [x] 시술 사진 업로드 (before/during/after)
- [ ] 음성 메모 → AI 구조화 (Whisper + GPT-4o)
- [ ] AI 페이스 스왑 (AKOOL API)
- [ ] 포트폴리오 자동 생성

### 2순위 (예정)
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

## 가격 정책

| 플랜 | 가격 | 주요 기능 |
|------|------|----------|
| Basic | ₩49,000/월 | 무제한 시술 기록, AI 페이스 스왑 30장, 기본 포트폴리오 |
| Premium | ₩79,000/월 | Basic + AI 페이스 스왑 100장, 자동 SNS 포스팅, 우선 지원 |

### 비용 구조 (샵 1개 기준)
- 음성 인식: ~$1/월
- 페이스 스왑: $25-50/월 (50-100장)
- 서버/DB: ~$5/월

---

## 코딩 컨벤션

### Backend (Python)
- FastAPI 라우터는 `app/api/` 아래 도메인별 파일로 분리
- 비즈니스 로직은 `app/services/`에 분리
- 모든 DB 작업은 async/await 사용
- Pydantic v2 스키마로 요청/응답 검증
- 환경 변수는 `app/core/config.py`의 Settings 클래스로 관리

### Frontend (TypeScript)
- Next.js 15 App Router 사용 (pages가 아닌 app/ 디렉토리)
- API 호출은 `src/lib/api.ts`의 타입화된 함수 사용
- 스타일링은 Tailwind CSS v4 유틸리티 클래스
- 컴포넌트는 `src/components/`에 배치

### 공통
- 민감 정보 (.env, API 키)는 절대 커밋하지 않음
- 파일 업로드 최대 크기: 10MB
- 사진 저장: 개발 시 로컬 uploads/, 프로덕션 시 AWS S3

---

## 참고 문서

기초 문서는 `docs/` 폴더에 위치:

| 파일 | 내용 |
|------|------|
| `About_Note-a-Style_노터스타일에_대하여.pdf` | 프로젝트 비전, AI 기능 소개, Value Chain 설명 |
| `Pain_Point__Hurdle.pdf` | K-뷰티 산업 Pain Point, 비효율 분석 |
| `note-a-style-full-conversation.md` | 기획 대화 전체 요약 (기술 검토, 의사결정 과정) |
| `노터스타일 기능 목록 *.csv` | 전체 기능 목록 (구분, 우선순위, 연관기능) |
