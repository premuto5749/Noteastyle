# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project: Note-a-Style - 뷰티샵 시술 기록 & 포트폴리오 플랫폼

## 1. 프로젝트 목표

뷰티샵(헤어/네일/피부/두피관리)의 **시술 기록 관리와 AI 포트폴리오 생성**을 위한 플랫폼.

> **핵심 포지셔닝**: 기존 CRM(Handsos, 헤어짱 등) 위에 얹어지는 프리미엄 애드온. 예약이 아닌 **시술 내용 기록과 AI 포트폴리오**에 집중.

슬로건: **"시술 기록의 신"**

### 핵심 가치
- 초상권 침해 없이 AI 페이스 스왑으로 포트폴리오 생성 (Replicate API)
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
| `deployment-guide.md` | 프로덕션 배포 가이드 (Vercel + Supabase) |
| `local-dev-setup.md` | 로컬 개발환경 세팅 가이드 (VS Code + Supabase CLI) |

---

## 3. 아키텍처 개요

### 시스템 구성 (Next.js + Supabase 모놀리식)

```
┌──────────────────────────────────────┐
│  Next.js 15 (PWA)                    │
│  ├─ 페이지 (React)    localhost:3000 │
│  └─ API Routes (/api/...)            │
│         │                            │
│    ┌────┼──────────┐                 │
│    ▼    ▼          ▼                 │
│ Supabase  OpenAI   Replicate        │
│ (DB)     Whisper   Face             │
│          GPT-4o    Swap             │
└──────────────────────────────────────┘
```

> **premuto 프로젝트와 동일 패턴**: Next.js 모놀리식 아키텍처로 API Routes가 비즈니스 로직을 담당하고, Supabase가 DB + Storage를 제공합니다. CORS 불필요, 배포 단순.

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
  └→ POST /api/face-swap/ (Replicate API 호출)
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

### Backend (Next.js API Routes + Supabase)
- **Next.js API Routes** → 비즈니스 로직 (Python 불필요)
- **Supabase** → PostgreSQL + Storage + (향후) Auth
- **TypeScript** → 프론트/백엔드 타입 통일

### AI / External APIs
- **OpenAI Whisper** → 음성을 텍스트로 변환 ($0.006/분)
- **GPT-4o Structured Output** → 텍스트를 구조화된 시술 데이터로 변환 (Zod 스키마)
- **Replicate API** → AI 페이스 스왑 (`codeplugtech/face-swap` 모델, 건당 ~$0.0027)

### 인프라
- **Vercel** → Next.js 배포 (프로덕션)
- **Supabase** → PostgreSQL + Storage (프로덕션)
- **Docker Compose** → 로컬 개발 (PostgreSQL)

---

## 5. 프로젝트 구조

```
Noteastyle/
├── CLAUDE.md                  # 이 파일 (개발 가이드)
├── README.md                  # 프로젝트 개요
├── docker-compose.yml         # 로컬 개발용 (db + frontend)
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
├── supabase/                  # Supabase 설정
│   └── migrations/            # SQL 마이그레이션
│       ├── 001_initial_schema.sql
│       └── 002_helper_functions.sql
│
├── backend/                   # (레거시) FastAPI - 참고용으로 보존
│
└── frontend/                  # Next.js 15 풀스택 앱
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx               # 홈 대시보드
    │   │   ├── record/page.tsx        # 빠른 기록 (큰 버튼 UI)
    │   │   ├── treatments/page.tsx    # 시술 목록
    │   │   ├── treatments/new/page.tsx # 상세 기록 작성
    │   │   ├── customers/page.tsx     # 고객 관리
    │   │   ├── portfolio/page.tsx     # 포트폴리오 갤러리
    │   │   └── api/                   # API Routes (= 백엔드)
    │   │       ├── health/route.ts
    │   │       ├── shops/.../route.ts
    │   │       ├── voice/transcribe/route.ts
    │   │       └── face-swap/.../route.ts
    │   ├── components/        # 재사용 UI 컴포넌트
    │   └── lib/
    │       ├── api.ts         # API 클라이언트 (typed fetch)
    │       ├── supabase/      # Supabase 클라이언트
    │       │   ├── client.ts  # 브라우저용
    │       │   └── server.ts  # 서버용 (API Routes)
    │       └── services/      # 외부 API 서비스
    │           ├── openai-service.ts   # Whisper + GPT-4o
    │           └── replicate-service.ts # Replicate 페이스 스왑
    ├── .env.example
    ├── package.json
    ├── tsconfig.json
    └── Dockerfile
```

---

## 6. 데이터 모델

모든 엔티티는 **UUID** 기본 키, `created_at`/`updated_at` 타임스탬프 포함.
정의 위치: `supabase/migrations/001_initial_schema.sql`

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
├── face_swapped_url (Replicate 처리 결과)
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

Base URL: `/api` (same-domain, CORS 불필요)
구현 위치: `frontend/src/app/api/`

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
| POST | `/face-swap/` | Replicate 페이스 스왑 시작 (비동기) |
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

- Replicate API 사용 (`codeplugtech/face-swap` 모델)
- 비동기 처리: 요청 → 폴링으로 상태 확인 → 완료 시 URL 저장
- 비용: 건당 ~$0.0027, 월 100장 기준 **~$0.27**

### D. 사진 저장 규칙

- **Supabase Storage** `treatment-photos` 버킷 사용
- 최대 파일 크기: **10MB**
- 사진 타입: `before` / `during` / `after`
- service_role 키로 업로드 (API Routes에서)

---

## 9. 개발 환경 설정

> 📘 **상세 가이드**: [docs/deployment-guide.md](docs/deployment-guide.md)

### Supabase CLI (권장)
```bash
# 1. 로컬 Supabase 시작 (Docker 필요)
npx supabase start
# → API URL: http://127.0.0.1:54321, anon/service_role 키 출력됨

# 2. 마이그레이션 적용
npx supabase db push

# 3. frontend/.env.local 설정 (출력된 키 입력)
# 4. Next.js 개발 서버 시작
cd frontend && npm install && npm run dev
# → http://localhost:3000 (API Routes 포함)
```

### 또는 원격 Supabase 직접 연결
```bash
# frontend/.env.local에 프로덕션 Supabase 키 입력 후
cd frontend && npm run dev
```

### 개발 명령어

```bash
# Next.js
cd frontend && npm run dev              # 개발 서버 (API Routes 포함)
cd frontend && npm run build            # 프로덕션 빌드
cd frontend && npm run lint             # ESLint

# Supabase
npx supabase start                      # 로컬 Supabase 시작
npx supabase stop                       # 로컬 Supabase 중지
npx supabase db push                    # 마이그레이션 적용
npx supabase db reset                   # DB 초기화 + 마이그레이션 재적용
```

### 환경 변수 (frontend/.env.local)

| 변수 | 설명 | 필수 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Y |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 | Y |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role 키 (API Routes용) | Y |
| `OPENAI_API_KEY` | OpenAI API 키 (Whisper + GPT-4o) | Y |
| `REPLICATE_API_TOKEN` | Replicate API 토큰 (페이스 스왑) | Y |
| `NEXT_PUBLIC_SHOP_ID` | MVP 단일 매장 ID | N (기본값 있음) |

---

## 10. 코딩 컨벤션

### API Routes (Backend)
- API Routes는 `src/app/api/` 아래 **도메인별 디렉토리로 분리**
- DB 접근은 `createServerClient()` → Supabase 클라이언트 사용
- 외부 API 서비스는 `src/lib/services/`에 분리 (openai, replicate)
- 환경 변수는 `process.env`로 직접 접근 (서버 전용 키는 `NEXT_PUBLIC_` 접두사 없이)

### Frontend (TypeScript)
- Next.js 15 **App Router** 사용 (`src/app/` 디렉토리)
- API 호출은 `src/lib/api.ts`의 **타입화된 함수** 사용 (`request<T>()` 제네릭 래퍼)
- 스타일링은 **Tailwind CSS v4** 유틸리티 클래스
- 컴포넌트는 `src/components/`에 배치
- CSS 커스텀 변수: `--primary`, `--primary-dark`, `--accent`

### 공통
- 민감 정보 (`.env`, API 키)는 **절대 커밋하지 않음**
- 파일 업로드: Supabase Storage 사용 (`treatment-photos` 버킷)
- TypeScript 하나로 프론트/백엔드 타입 통일

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
- [ ] AI 페이스 스왑 (Replicate API)
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
| 페이스 스왑 (Replicate) | ~$0.27 (100장) |
| Vercel + Supabase | $0 (Free 티어) ~ $45 (Pro) |
| **총 원가** | **~$1-46 (₩1,300-61,000)** |

---

## 14. 배포 전략

> 📘 **상세 가이드**: [docs/deployment-guide.md](docs/deployment-guide.md)

### 권장 프로덕션 구성

| 컴포넌트 | 서비스 | 이유 |
|---------|--------|------|
| Next.js (풀스택) | **Vercel** | Next.js 최적 호스팅, API Routes 포함 |
| Database + Storage | **Supabase** | PostgreSQL + Storage 올인원 |

> premuto와 동일한 Vercel + Supabase 2곳 관리 구성. CORS 불필요, 배포 단순.

### 개발/로컬

```bash
cd frontend && npm run dev   # http://localhost:3000 (API Routes 포함)
```
