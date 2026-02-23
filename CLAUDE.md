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
- 2024년 기준 뷰티 관련 업장 약 120,000개 (생활서비스업종 1/3, 부동산보다 많음)
- 예약관리에만 집중된 획일화된 솔루션 사용 중 (핸드SOS, 헤어짱, 스마일패드, 뷰카, 공비서 등)
- 관리 업무, 홍보/마케팅, 기자재 소싱을 모두 별도 관리 → 비용 증가 → 악순환 구조
- K-뷰티는 세계적 영향력을 가지고 있으나 디지털/전산화가 크게 부족
- "샵 유목민" 현상: 만족스러운 매장을 찾지 못해 떠도는 소비자

> **상세 시장 분석/경쟁사**: [docs/PRD.md](docs/PRD.md) 참조

---

## 2. 프로젝트 문서 구조

이 프로젝트는 다음 문서들로 구성되어 있습니다:

### 핵심 문서

| 파일 | 역할 |
|------|------|
| **CLAUDE.md** (이 파일) | 개발 가이드라인 및 프로젝트 규칙 |
| **README.md** | 프로젝트 개요 및 Quick Start |

### 핵심 기획 문서 (docs/)

| 파일 | 내용 |
|------|------|
| **`PRD.md`** | **제품 요구사항 문서** -- 시장 분석, 경쟁사, 51개 전체 기능 목록, Phase별 로드맵, KPI |
| **`schema.md`** | **DB 스키마 문서** -- 6개 테이블 상세, ER 다이어그램, TypeScript 인터페이스 매핑, 알려진 이슈 |

### 기초 문서 (docs/)

| 파일 | 내용 |
|------|------|
| `About_Note-a-Style_노터스타일에_대하여.pdf` | 프로젝트 비전, AI 기능 소개, Value Chain 설명 |
| `Pain_Point__Hurdle.pdf` | K-뷰티 산업 Pain Point, 비효율 분석, 악순환 구조 |
| `note-a-style-full-conversation.md` | 기획 대화 전체 요약 (기술 검토, 의사결정 과정, 비용 계산) |
| `노터스타일 기능 목록 *.csv` | 전체 기능 목록 51개 (구분, 우선순위, 연관기능) |
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
├── docs/                      # 문서
│   ├── PRD.md                 # 제품 요구사항 문서 (핵심)
│   ├── schema.md              # DB 스키마 문서 (핵심)
│   ├── About_Note-a-Style_노터스타일에_대하여.pdf
│   ├── Pain_Point__Hurdle.pdf
│   ├── note-a-style-full-conversation.md
│   ├── deployment-guide.md    # 프로덕션 배포 가이드
│   ├── local-dev-setup.md     # 로컬 개발환경 세팅 가이드
│   └── 노터스타일 기능 목록 *.csv
│
├── supabase/                  # Supabase 설정
│   └── migrations/            # SQL 마이그레이션
│       ├── 001_initial_schema.sql
│       ├── 002_helper_functions.sql
│       └── 003_video_support.sql
│
├── backend/                   # (레거시) FastAPI - 참고용으로 보존
│
└── frontend/                  # Next.js 15 풀스택 앱
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx             # 루트 레이아웃
    │   │   ├── globals.css            # 글로벌 스타일 (Tailwind v4)
    │   │   ├── page.tsx               # 홈 대시보드
    │   │   ├── record/page.tsx        # 빠른 기록 (큰 버튼 UI)
    │   │   ├── treatments/page.tsx    # 시술 목록
    │   │   ├── treatments/new/page.tsx # 상세 기록 작성
    │   │   ├── treatments/[id]/page.tsx       # 시술 상세
    │   │   ├── treatments/[id]/capture/page.tsx # 사진/영상 촬영
    │   │   ├── customers/page.tsx     # 고객 관리
    │   │   ├── portfolio/page.tsx     # 포트폴리오 갤러리
    │   │   └── api/                   # API Routes (= 백엔드)
    │   │       ├── health/route.ts
    │   │       ├── shops/route.ts
    │   │       ├── shops/[shopId]/route.ts
    │   │       ├── shops/[shopId]/customers/...
    │   │       ├── shops/[shopId]/treatments/...
    │   │       ├── shops/[shopId]/portfolio/...
    │   │       ├── voice/transcribe/route.ts
    │   │       └── face-swap/...
    │   ├── components/        # 재사용 UI 컴포넌트
    │   │   ├── BottomNav.tsx          # 하단 네비게이션
    │   │   ├── MediaCapture.tsx       # 사진/영상 촬영 (카메라)
    │   │   ├── MediaGrid.tsx          # 미디어 그리드/프리뷰
    │   │   ├── PageHeader.tsx         # 페이지 헤더
    │   │   ├── ProductButton.tsx      # 제품 선택 버튼
    │   │   ├── ServiceButton.tsx      # 시술 종류 버튼
    │   │   ├── ShareButton.tsx        # SNS 공유 버튼
    │   │   └── VoiceMemo.tsx          # 음성 메모 녹음
    │   └── lib/
    │       ├── api.ts         # API 클라이언트 (typed fetch)
    │       ├── supabase/      # Supabase 클라이언트
    │       │   ├── client.ts  # 브라우저용
    │       │   └── server.ts  # 서버용 (API Routes)
    │       └── services/      # 외부 API 서비스
    │           ├── openai-service.ts   # Whisper + GPT-4o
    │           └── replicate-service.ts # Replicate 페이스 스왑
    ├── public/
    │   └── manifest.json      # PWA 매니페스트
    ├── .env.example
    ├── package.json
    ├── tsconfig.json
    └── Dockerfile
```

---

## 6. 데이터 모델

> **상세 스키마**: [docs/schema.md](docs/schema.md) 참조

모든 엔티티는 **UUID** 기본 키, `created_at` 타임스탬프 포함.
정의 위치: `supabase/migrations/001_initial_schema.sql`, `003_video_support.sql`

### 엔티티 관계도

```
Shop (매장)
├── name, shop_type (hair/nail/skin/scalp), address, phone
├── subscription_plan (basic/premium), updated_at (트리거)
├── 1:N → Designer[], Customer[], Treatment[], Portfolio[]

Designer (디자이너)
├── shop_id (FK → Shop)
├── name, role (owner/designer/assistant), phone, is_active

Customer (고객)
├── shop_id (FK → Shop)
├── name, phone, gender, birth_date, notes, naver_booking_id
├── visit_count (RPC 증가), last_visit (RPC 갱신), updated_at (트리거)

Treatment (시술 기록) ← 핵심 엔티티
├── shop_id, customer_id, designer_id (FK)
├── service_type, service_detail, area
├── products_used: JSONB [{ brand, code, area }]
├── duration_minutes, price, satisfaction (high/medium/low)
├── customer_notes, voice_memo_url, ai_summary, next_visit_recommendation

TreatmentPhoto (시술 사진/영상)
├── treatment_id (FK → Treatment, CASCADE)
├── photo_url, photo_type (before/during/after/source)
├── face_swapped_url (Replicate 결과)
├── is_portfolio, caption, taken_at
├── media_type (photo/video), video_duration_seconds, thumbnail_url

Portfolio (포트폴리오)
├── shop_id (FK → Shop), photo_id (FK → TreatmentPhoto)
├── title, description, tags: JSONB
├── is_published
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
| POST | `/face-swap` | Replicate 페이스 스왑 시작 (비동기) |
| GET | `/face-swap/status/{id}` | 페이스 스왑 처리 상태 확인 (폴링) |
| POST | `/face-swap/complete/{photoId}` | 페이스 스왑 완료 URL 저장 |

### 포트폴리오

| Method | Path | 설명 |
|--------|------|------|
| POST | `/shops/{id}/portfolio` | 포트폴리오 생성 |
| GET | `/shops/{id}/portfolio` | 포트폴리오 목록 (?published_only=true) |
| PUT | `/shops/{id}/portfolio/{id}/publish` | 공개/비공개 토글 |

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

### 로컬 도구 경로

- **gh CLI**: `"C:/Program Files/GitHub CLI/gh.exe"` (PATH에 없으므로 전체 경로 사용)

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

### 브랜치 네이밍

- 기능 추가: `feat/기능명` (예: `feat/voice-memo`)
- 버그 수정: `fix/이슈번호-설명` (예: `fix/12-photo-upload`)
- 리팩토링: `refactor/대상` (예: `refactor/api-client`)
- 문서: `docs/대상` (예: `docs/deployment-guide`)

### 작업 순서 (반드시 준수 — Worktree 방식)

```
1. main 최신화           cd C:/Dev/Noteastyle && git pull
2. worktree 생성         git worktree add ../Noteastyle-<브랜치명> -b feat/기능명
3. env 심링크            ln -s C:/Dev/Noteastyle/frontend/.env.local ../Noteastyle-<브랜치명>/frontend/.env.local
4. 의존성 설치           cd ../Noteastyle-<브랜치명>/frontend && npm install
5. worktree에서 작업     (파일 수정)
6. 커밋                  git add <파일들> && git commit -m "..."
7. 푸시                  git push -u origin feat/기능명
8. PR 생성               gh pr create ...
9. 머지                  gh pr merge ... --squash --delete-branch
10. worktree 정리        cd C:/Dev/Noteastyle && git worktree remove ../Noteastyle-<브랜치명>
```

> **참고**: 3번의 심링크는 원본 `.env.local`을 참조하므로, 키 변경 시 모든 worktree에 자동 반영됩니다.

### 절대 규칙

- **⚠️ 어떤 코드 수정이든 반드시 worktree를 생성한 후 해당 디렉토리에서 진행**할 것. 이 규칙은 예외 없이 적용된다.
  - 백그라운드 에이전트(Task tool)에게 작업을 위임할 때도 worktree 생성을 먼저 지시할 것
  - 단 한 줄의 수정이라도 main worktree(`C:/Dev/Noteastyle`)에서 직접 파일을 수정하지 않는다
  - worktree 생성 전에 파일을 수정하는 것은 금지 — 반드시 `git worktree add` 후 편집
- **항상 main에서 새 브랜치를 생성**할 것. 다른 브랜치에서 분기하지 않는다.
- **어떤 작업이든 반드시 PR을 생성**할 것. main에 직접 커밋/푸시하지 않는다. (docs, fix, feat 모두 포함)
- 머지 시 `--squash`로 커밋을 정리하고 `--delete-branch`로 원격 브랜치를 삭제한다.
- 머지 후 반드시 `git worktree remove`로 worktree를 정리한다.

### 사용자 확인 규칙

- **파일 생성/수정, 패키지 설치, 빌드, Vercel 설정 등** → 확인 없이 바로 진행
- **git commit, push, PR 생성, merge** → 실행 전에 반드시 사용자 확인을 받을 것

### 여러 기능 동시 작업

```bash
# Worktree는 각 브랜치가 별도 디렉토리이므로 stash 없이 동시 작업 가능
# 기능1 worktree
git worktree add ../Noteastyle-feat-기능1 -b feat/기능1
# 기능2 worktree (동시에 생성 가능)
git worktree add ../Noteastyle-feat-기능2 -b feat/기능2

# 각 디렉토리에서 독립적으로 작업
# cd ../Noteastyle-feat-기능1  → 기능1 작업
# cd ../Noteastyle-feat-기능2  → 기능2 작업

# 작업 완료 후 정리
git worktree remove ../Noteastyle-feat-기능1
git worktree remove ../Noteastyle-feat-기능2
```

- 각 worktree는 독립된 디렉토리이므로 `git stash` 없이 여러 작업 동시 진행 가능
- worktree 간 전환은 단순히 디렉토리 이동 (`cd`)으로 처리

### 커밋 메시지
- 한국어 또는 영어 모두 가능
- Conventional Commits 형식 권장
- 예: `feat: 음성 메모 AI 구조화 기능 추가`, `fix: 사진 업로드 CORS 오류 수정`

---

## 12. MVP 기능 우선순위

> **전체 기능 로드맵 (51개)**: [docs/PRD.md](docs/PRD.md) 참조

### Phase 1 - 1순위 (필수)
- [x] 매장/고객/시술 CRUD
- [x] 빠른 시술 기록 (큰 버튼 UI)
- [x] 상세 시술 기록 (제품, 부위, 시간)
- [x] 시술 사진/영상 업로드 및 촬영 (before/during/after)
- [x] SNS 공유 (Web Share API)
- [x] 네이버 예약 ID 기록
- [x] 음성 메모 → AI 구조화 API (Whisper + GPT-4o)
- [x] AI 페이스 스왑 API (Replicate)
- [x] 포트폴리오 생성/공개/비공개 관리

### Phase 1 - 2순위 (예정)
- [ ] 예약 정보 입력 + 예약 보드
- [ ] 네이버 예약 실시간 연동 (고객 자동 생성)
- [ ] 자동 모자이크 (수동 모자이크 우선)
- [ ] 예약 변경 Drag & Drop
- [ ] 리뷰 게시 동의 + 쿠폰 인센티브

### Phase 2 (확장)
- 리뷰 작성, 결제정보(쿠폰/회원권/자동결제)
- 설정 고도화 (고객 불러오기/내보내기, 블랙리스트, 직급)
- 매출/고객 동향 분석
- AI 스타일러 (스타일 미리보기)
- 메시지/알림톡/푸쉬 알림

### Phase 3 (플랫폼화)
- 기자재 마켓플레이스 (자재목록, 견적, 장바구니, 공동구매, 월 구독)
- 구인구직 (디자이너 포트폴리오, 채용공고, 전자계약, 노무상담)
- 공급업체 포털 (상품등록, 비교견적, 상위노출)
- AI 상담 챗봇 (24/7 자동응대)

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
