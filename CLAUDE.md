# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project: Note-a-Style -- 뷰티샵 시술 기록 & AI 포트폴리오 플랫폼

## 1. 프로젝트 목표

뷰티샵(헤어/네일/피부/두피관리)의 **시술 기록 관리와 AI 포트폴리오 생성**을 위한 멀티테넌트 SaaS 플랫폼.

> **핵심 포지셔닝**: 기존 CRM(Handsos, 헤어짱 등) 위에 얹어지는 프리미엄 애드온. 예약이 아닌 **시술 내용 기록과 AI 포트폴리오**에 집중.

슬로건: **"시술 기록의 신"**

### 핵심 가치
- 초상권 침해 없이 AI 페이스 스왑으로 포트폴리오 생성 (Replicate API)
- 시술 사진 위에 직접 시술 내용 기록 (스타일 노트 어노테이션)
- 음성 메모 30초 → AI가 시술 데이터 자동 구조화 (Whisper + GPT-4o)
- 예약 기반 시술 기록 -- 예약 → 시술 시작 → 사진/데이터 기록

### 산업 배경
- 2024년 기준 뷰티 관련 업장 약 120,000개 (생활서비스업종 1/3)
- 예약관리에만 집중된 획일화된 솔루션 사용 중
- K-뷰티는 세계적 영향력을 가지고 있으나 디지털/전산화가 크게 부족

> **상세 시장 분석/경쟁사**: [docs/PRD.md](docs/PRD.md) 참조

---

## 2. 프로젝트 문서 구조

| 파일 | 역할 |
|------|------|
| **CLAUDE.md** (이 파일) | 개발 가이드라인, 아키텍처, API 명세, 코딩 컨벤션 |
| **README.md** | 프로젝트 개요 및 Quick Start |
| **docs/PRD.md** | 제품 요구사항 -- Phase별 기능 목록, KPI, 로드맵 |
| **docs/schema.md** | DB 스키마 -- 17개 테이블, 23개 마이그레이션, RPC 함수, ER 다이어그램 |
| docs/plans/ | 기능별 설계/구현 플랜 |

---

## 3. 아키텍처 개요

### 시스템 구성 (멀티테넌트 + Supabase Auth)

```
┌──────────────────────────────────────────┐
│  Next.js 15 (PWA)                        │
│  ├─ 페이지 (React 19)  localhost:3000    │
│  ├─ API Routes (/api/...)                │
│  └─ Middleware (인증 리다이렉트)            │
│         │                                │
│    ┌────┼──────────┬──────────┐          │
│    ▼    ▼          ▼          ▼          │
│ Supabase   Supabase  OpenAI   Replicate │
│  Auth       DB+     Whisper   Face      │
│ (인증)    Storage   GPT-4o    Swap      │
└──────────────────────────────────────────┘
```

### 인증 흐름

```
회원가입/로그인 (Email + Kakao OAuth)
  └→ Supabase Auth 세션 생성
      └→ user_profiles 자동 생성
          └→ 매장 선택 (또는 매장 생성/초대 수락)
              └→ ShopContext에 currentShop 설정
                  └→ withShopAuth로 매장별 접근 제어
```

### 시술 기록 흐름 (예약 기반)

```
예약 생성 (/reservation)
  └→ 예약 보드 확인 (/tasks)
      └→ "시술 시작" 버튼 (start-treatment API)
          └→ 시술 레코드 자동 생성 (예약 → 시술 연결)
              └→ 사진 촬영 + 상세 기록 입력
                  └→ 포트폴리오 추가 (선택)
```

### AI 페이스 스왑 흐름

```
시술 사진 선택 → 페이스 모델 라이브러리에서 소스 선택
  └→ POST /api/face-swap/generate (배치 생성, 리트라이 내장)
      └→ 비동기 처리 → 결과 목록에서 선택
          └→ 선택한 결과 → 포트폴리오 자동 등록
```

---

## 4. 기술 스택

### Frontend
- **Next.js 15** (App Router) + **React 19**
- **TypeScript 5**
- **Tailwind CSS v4**
- **PWA** (Progressive Web App -- 모바일/태블릿 최적화, max-width 480px)

### Backend (Next.js API Routes + Supabase)
- **Next.js API Routes** → 비즈니스 로직
- **Supabase** → PostgreSQL + Storage + Auth
- **Zod** → API 입력 검증 (`lib/validations/`)
- **In-memory Rate Limiting** → AI API 보호 (`lib/rate-limit.ts`)

### AI / External APIs
- **OpenAI Whisper** → 음성 → 텍스트 ($0.006/분)
- **GPT-4o Structured Output** → 텍스트 → 구조화 시술 데이터
- **Replicate API** → AI 페이스 스왑 (~$0.0027/건)

### 인프라
- **Vercel** → Next.js 배포
- **Supabase** → PostgreSQL + Storage + Auth
- **Docker Compose** → 로컬 개발

---

## 5. 프로젝트 구조

```
Noteastyle/
├── CLAUDE.md                          # 이 파일
├── README.md
├── docker-compose.yml                 # 로컬 개발용
│
├── docs/
│   ├── PRD.md                         # 제품 요구사항
│   ├── schema.md                      # DB 스키마 (17개 테이블)
│   ├── plans/                         # 기능별 설계/구현 플랜
│   ├── deployment-guide.md
│   ├── local-dev-setup.md
│   └── *.pdf, *.csv                   # 기획 문서
│
├── supabase/
│   └── migrations/                    # 23개 SQL 마이그레이션
│
└── frontend/                          # Next.js 15 풀스택 앱
    └── src/
        ├── app/
        │   ├── layout.tsx             # 루트 레이아웃 (AuthContext, ShopContext, ThemeProvider)
        │   ├── page.tsx               # 홈 대시보드
        │   ├── login/page.tsx         # 로그인/회원가입/비밀번호 찾기 (3-in-1)
        │   ├── onboarding/page.tsx    # 매장 생성 또는 초대 수락
        │   ├── invite/[token]/page.tsx # 초대 링크 수락
        │   ├── reset-password/page.tsx
        │   ├── profile/page.tsx       # 디자이너 프로필 편집
        │   │
        │   ├── treatments/            # 시술 관리
        │   │   ├── page.tsx           # 시술 목록 (검색/필터)
        │   │   ├── new/page.tsx       # 시술 생성 (음성 메모 지원)
        │   │   ├── [id]/page.tsx      # 시술 상세 (사진 캐러셀, 어노테이션)
        │   │   ├── [id]/edit/page.tsx # 시술 편집
        │   │   └── [id]/capture/page.tsx # 사진/영상 촬영
        │   │
        │   ├── customers/page.tsx     # 고객 관리 (CRUD + 검색)
        │   ├── portfolio/page.tsx     # 포트폴리오 갤러리
        │   ├── reservation/page.tsx   # 예약 생성
        │   ├── tasks/page.tsx         # 일일 예약 보드 (캘린더 스트립)
        │   ├── tasks/all/page.tsx     # 전체 예약 목록
        │   ├── explore/page.tsx       # 디자이너 탐색
        │   ├── explore/designer/[memberId]/page.tsx
        │   ├── trash/page.tsx         # 삭제 사진 복원 (7일)
        │   │
        │   ├── settings/              # 설정
        │   │   ├── page.tsx           # 설정 메뉴
        │   │   ├── shop/page.tsx      # 매장 설정 (멤버, 초대)
        │   │   └── services/page.tsx  # 서비스 메뉴 설정
        │   │
        │   ├── admin/                 # 관리자 패널
        │   │   ├── page.tsx           # 사용자/역할 관리
        │   │   └── site-settings/page.tsx # 사이트 설정
        │   │
        │   ├── auth/                  # Supabase Auth 라우트 (API Routes 아님)
        │   │   ├── callback/route.ts  # OAuth 콜백
        │   │   └── signout/route.ts   # 로그아웃
        │   │
        │   └── api/                   # API Routes (~75개 엔드포인트)
        │       ├── health/
        │       ├── auth/              # 관리자 확인 (check-admin)
        │       ├── me/                # 프로필, 매장 목록
        │       ├── shops/             # 매장 생성
        │       ├── shops/[shopId]/    # 매장별 CRUD (customers, treatments, etc.)
        │       ├── invitations/       # 초대 조회/수락
        │       ├── explore/           # 공개 포트폴리오/디자이너
        │       ├── voice/             # 음성 AI
        │       ├── face-swap/         # 페이스 스왑 AI
        │       ├── admin/             # 관리자 API
        │       ├── site-settings/     # 사이트 설정 (public)
        │       └── cron/              # 정기 작업
        │
        ├── components/                # 27개 재사용 컴포넌트
        │   ├── AppHeader.tsx          # 상단 헤더 (매장 선택기)
        │   ├── BottomNav.tsx          # 하단 탭 네비게이션
        │   ├── PageHeader.tsx
        │   ├── ErrorBoundary.tsx
        │   ├── SidebarDrawer.tsx      # 모바일 슬라이드 메뉴
        │   ├── ThemeProvider.tsx      # 다크/라이트 모드
        │   ├── NativeCapture.tsx      # 네이티브 카메라
        │   ├── PhotoCarousel.tsx      # 전체화면 사진 캐러셀
        │   ├── PhotoAnnotationEditor.tsx # 스타일 노트 핀 에디터
        │   ├── AnnotationOverlay.tsx  # 어노테이션 오버레이
        │   ├── FaceSwapFlow.tsx       # AI 페이스 스왑 플로우
        │   ├── VoiceMemo.tsx          # 음성 녹음
        │   ├── VoiceNote.tsx          # 음성 메모 모달
        │   ├── ServiceSelector.tsx    # 서비스 선택기
        │   ├── ReservationCard.tsx    # 예약 카드
        │   ├── DayCalendarStrip.tsx   # 날짜 스트립
        │   ├── MonthlyCalendar.tsx    # 월간 캘린더
        │   ├── ProfilePhotoUpload.tsx # 프로필 사진
        │   ├── ShareButton.tsx        # SNS 공유
        │   └── ...
        │
        ├── contexts/                  # 4개 React Context
        │   ├── AuthContext.tsx         # user, isAdmin, refreshAuth
        │   ├── ShopContext.tsx         # currentShop, shops, switchShop
        │   ├── SidebarContext.tsx      # 사이드바 상태
        │   └── SiteSettingsContext.tsx # 사이트 설정
        │
        ├── hooks/
        │   ├── useShopApi.ts          # 매장별 API 클라이언트
        │   └── useServiceMenu.ts      # 서비스 카테고리
        │
        ├── lib/
        │   ├── api.ts                 # 타입화된 API 클라이언트
        │   ├── supabase/
        │   │   ├── client.ts          # 브라우저용 (Auth SSR)
        │   │   └── server.ts          # 서버용 (service_role)
        │   ├── auth/
        │   │   ├── require-auth.ts    # 세션 인증 헬퍼
        │   │   ├── shop.ts            # withShopAuth 데코레이터
        │   │   └── admin.ts           # requireAdmin 헬퍼
        │   ├── validations/
        │   │   ├── index.ts           # validateBody 헬퍼
        │   │   ├── customer.ts        # 고객 Zod 스키마
        │   │   ├── treatment.ts       # 시술 Zod 스키마
        │   │   └── reservation.ts     # 예약 Zod 스키마
        │   ├── rate-limit.ts          # AI API 레이트 리미터
        │   ├── utils/sanitize.ts      # ilike 이스케이프
        │   ├── services/
        │   │   ├── openai-service.ts  # Whisper + GPT-4o
        │   │   └── replicate-service.ts # Replicate 페이스 스왑
        │   ├── site-settings.ts       # 클라이언트 사이트 설정
        │   ├── site-settings.server.ts # 서버 사이트 설정
        │   ├── service-utils.ts       # 서비스 유틸리티
        │   └── video-utils.ts         # 비디오 썸네일
        │
        ├── types/
        │   └── media.ts               # CapturedMedia 인터페이스
        │
        └── middleware.ts              # 인증 리다이렉트
```

---

## 6. 데이터 모델

> **상세 스키마**: [docs/schema.md](docs/schema.md) -- 17개 테이블, 7개 RPC 함수, 23개 마이그레이션

### 핵심 관계도

```
auth.users ──< user_profiles (1:1)
    │         user_roles (1:1)
    │
    └──< shop_members >── shops
              │               │
              │               ├──< customers ──< treatments ──< treatment_photos
              │               ├──< reservations ────────────┘         │
              │               ├──< shop_service_categories             ├──< portfolios
              │               │        └──< shop_services              └──< face_swap_results
              │               ├──< shop_invitations
              │               ├──< shop_audit_logs
              │               └──< ai_face_models ──< face_swap_results
              │
              └──< member_profiles (1:1)
```

**도메인 구분** (5개):
- **인증**: auth.users, user_profiles, user_roles, shop_members, member_profiles, shop_invitations
- **매장/고객**: shops, customers, shop_service_categories, shop_services, shop_audit_logs
- **시술/사진**: treatments, treatment_photos, portfolios, reservations
- **AI**: ai_face_models, face_swap_results
- **시스템**: app_settings

---

## 7. API 엔드포인트 명세

Base URL: `/api` (same-domain, CORS 불필요)
구현 위치: `frontend/src/app/api/`

### 7.1 시스템 & 공개

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/health` | -- | 헬스 체크 |
| GET | `/site-settings` | -- | 공개 사이트 설정 (5분 캐시) |
| GET | `/invitations/{token}` | -- | 초대 정보 조회 |

### 7.2 인증/사용자

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/auth/check-admin` | requireAuth | 관리자 여부 확인 |
| GET | `/me/profile` | requireAuth | 내 프로필 조회 |
| PUT | `/me/profile` | requireAuth | 내 프로필 수정 |
| GET | `/me/shops` | requireAuth | 소속 매장 목록 |
| POST | `/invitations/{token}/accept` | requireAuth | 초대 수락 |

### 7.3 매장

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | `/shops` | requireAuth | 매장 생성 |
| GET | `/shops/{shopId}` | withShopAuth | 매장 조회 |

### 7.4 고객

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | `/shops/{id}/customers` | withShopAuth | 고객 생성 (Zod 검증) |
| GET | `/shops/{id}/customers` | withShopAuth | 고객 목록 (search, phone) |
| GET | `/shops/{id}/customers/{cid}` | withShopAuth | 고객 상세 |
| PUT | `/shops/{id}/customers/{cid}` | withShopAuth | 고객 수정 |
| DELETE | `/shops/{id}/customers/{cid}` | withShopAuth | 고객 삭제 |
| GET | `/shops/{id}/customers/count` | withShopAuth | 고객 수 |

### 7.5 시술 기록

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | `/shops/{id}/treatments` | withShopAuth | 시술 생성 (Zod 검증) |
| GET | `/shops/{id}/treatments` | withShopAuth | 시술 목록 (필터: customer_id, service_type, date) |
| GET | `/shops/{id}/treatments/{tid}` | withShopAuth | 시술 상세 |
| PUT | `/shops/{id}/treatments/{tid}` | withShopAuth | 시술 수정 |
| DELETE | `/shops/{id}/treatments/{tid}` | withShopAuth | 시술 삭제 |
| POST | `/shops/{id}/treatments/{tid}/photos` | withShopAuth | 사진 업로드 (multipart, 10MB) |
| PATCH | `/shops/{id}/treatments/{tid}/photos/{pid}` | withShopAuth | 사진 메타 수정 (어노테이션) |
| DELETE | `/shops/{id}/treatments/{tid}/photos/{pid}` | withShopAuth | 사진 soft delete |

### 7.6 예약

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | `/shops/{id}/reservations` | withShopAuth | 예약 생성 (Zod 검증) |
| GET | `/shops/{id}/reservations` | withShopAuth | 예약 목록 (date, status) |
| GET | `/shops/{id}/reservations/{rid}` | withShopAuth | 예약 상세 |
| PUT | `/shops/{id}/reservations/{rid}` | withShopAuth | 예약 수정 |
| DELETE | `/shops/{id}/reservations/{rid}` | withShopAuth | 예약 삭제 |
| POST | `/shops/{id}/reservations/{rid}/start-treatment` | withShopAuth | 시술 시작 (예약 → 시술) |
| GET | `/shops/{id}/reservations/counts` | withShopAuth | 월별 예약 수 |

### 7.7 포트폴리오

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | `/shops/{id}/portfolio` | withShopAuth | 포트폴리오 생성 |
| GET | `/shops/{id}/portfolio` | withShopAuth | 포트폴리오 목록 |
| PUT | `/shops/{id}/portfolio/{pid}/publish` | withShopAuth(owner,admin) | 공개 토글 |
| DELETE | `/shops/{id}/portfolio/{pid}` | withShopAuth | 삭제 |

### 7.8 멤버 & 초대

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/shops/{id}/members` | withShopAuth | 멤버 목록 |
| GET | `/shops/{id}/members/{mid}` | withShopAuth | 멤버 상세 |
| PUT | `/shops/{id}/members/{mid}` | withShopAuth(owner,admin) | 멤버 수정 (역할 변경) |
| DELETE | `/shops/{id}/members/{mid}` | withShopAuth(owner,admin) | 멤버 비활성화 |
| GET | `/shops/{id}/members/{mid}/profile` | withShopAuth | 디자이너 프로필 |
| PUT | `/shops/{id}/members/{mid}/profile` | withShopAuth | 프로필 수정 (본인만) |
| POST | `/shops/{id}/members/{mid}/profile/photo` | withShopAuth | 프로필 사진 (5MB) |
| GET | `/shops/{id}/invitations` | withShopAuth(owner,admin) | 초대 목록 |
| POST | `/shops/{id}/invitations` | withShopAuth(owner,admin) | 초대 생성 |
| DELETE | `/shops/{id}/invitations/{iid}` | withShopAuth(owner,admin) | 초대 취소 |

### 7.9 서비스 메뉴

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/shops/{id}/services/categories` | withShopAuth | 카테고리 목록 (자동 시딩) |
| POST | `/shops/{id}/services/categories` | withShopAuth(owner,admin) | 카테고리 생성 |
| PUT | `/shops/{id}/services/categories/{cid}` | withShopAuth(owner,admin) | 카테고리 수정 |
| DELETE | `/shops/{id}/services/categories/{cid}` | withShopAuth(owner,admin) | 카테고리 삭제 |
| POST | `/shops/{id}/services` | withShopAuth(owner,admin) | 서비스 생성 |
| PUT | `/shops/{id}/services/{sid}` | withShopAuth(owner,admin) | 서비스 수정 |
| DELETE | `/shops/{id}/services/{sid}` | withShopAuth(owner,admin) | 서비스 삭제 |

### 7.10 AI 페이스 모델

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/shops/{id}/face-models` | withShopAuth | 모델 목록 |
| POST | `/shops/{id}/face-models` | withShopAuth | 모델 생성 (multipart) |
| DELETE | `/shops/{id}/face-models/{mid}` | withShopAuth(owner,admin) | 모델 삭제 |

### 7.11 AI 페이스 스왑

| Method | Path | Auth | Rate | 설명 |
|--------|------|------|------|------|
| POST | `/face-swap` | requireAuth | 10/min | 단일 페이스 스왑 |
| POST | `/face-swap/generate` | requireAuth | 10/min | 배치 생성 (리트라이) |
| GET | `/face-swap/status/{jobId}` | requireAuth | -- | 상태 확인 |
| POST | `/face-swap/results` | requireAuth | -- | 결과 저장 |
| GET | `/face-swap/results` | requireAuth | -- | 결과 목록 |
| POST | `/face-swap/results/{rid}/select` | requireAuth | -- | 결과 선택 → 포트폴리오 |
| POST | `/face-swap/complete/{photoId}` | requireAuth | -- | 완료 URL 저장 |

### 7.12 음성 AI

| Method | Path | Auth | Rate | 설명 |
|--------|------|------|------|------|
| POST | `/voice/transcribe` | requireAuth | 10/min | 음성 → Whisper → GPT-4o → 구조화 데이터 |

### 7.13 탐색 (Explore)

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/explore/portfolio` | requireAuth | 공개 포트폴리오 검색 |
| GET | `/explore/designer/{memberId}` | requireAuth | 디자이너 프로필 |

### 7.14 휴지통 (Trash)

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/shops/{id}/trash` | withShopAuth | 삭제된 사진 목록 |
| PATCH | `/shops/{id}/trash/{photoId}` | withShopAuth | 사진 복원 |
| DELETE | `/shops/{id}/trash/{photoId}` | withShopAuth | 영구 삭제 |

### 7.15 관리자

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/admin/users` | requireAdmin | 사용자 목록 |
| POST | `/admin/users` | requireAdmin | 역할 부여/해제 |
| GET | `/admin/site-settings` | requireAdmin | 사이트 설정 조회 |
| PUT | `/admin/site-settings` | requireAdmin | 사이트 설정 수정 |
| POST | `/admin/site-assets` | requireAdmin | 사이트 에셋 업로드 |
| DELETE | `/admin/site-assets` | requireAdmin | 사이트 에셋 삭제 |

### 7.16 Cron

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/cron/cleanup-trash` | CRON_SECRET | 7일 지난 삭제 사진 영구 삭제 |

---

## 8. 인증 아키텍처

### 3계층 인증 체계

| 헬퍼 | 용도 | 구현 위치 |
|------|------|----------|
| **withShopAuth** | 매장 멤버만 접근 (역할 옵션) | `lib/auth/shop.ts` |
| **requireAuth** | Supabase Auth 세션 필수 | `lib/auth/require-auth.ts` |
| **requireAdmin** | 관리자(admin/super_admin)만 | `lib/auth/admin.ts` |

### withShopAuth (매장 인증)

```typescript
// 매장 멤버 인증 데코레이터
export async function withShopAuth(
  handler: (ctx: ShopAuthContext) => Promise<Response>,
  options?: { roles?: ShopRole[] }
): Promise<Response>

// 사용 예:
export async function GET(req, { params }) {
  return withShopAuth(async ({ supabase, user, member, shopId }) => {
    // member.role, member.display_name 등 접근 가능
    const { data } = await supabase.from('treatments').select('*').eq('shop_id', shopId);
    return NextResponse.json(data);
  }, { roles: ['owner', 'admin'] }); // 역할 제한 (선택)
}
```

### 역할 모델

```
owner > admin > designer > assistant
```

| 역할 | 매장 설정 | 멤버 관리 | 서비스 설정 | 초대 | 고객/시술 CRUD |
|------|----------|----------|-----------|------|-------------|
| owner | O | O | O | O | O |
| admin | X | O | O | O | O |
| designer | X | X | X | X | O |
| assistant | X | X | X | X | O |

### 관리자 확인 우선순위

```
isAdmin(userId, email) →
  1. ADMIN_USER_IDS 환경변수 확인 (즉시)
  2. ADMIN_EMAILS 환경변수 확인 (즉시)
  3. user_roles DB 테이블 확인 (쿼리)
```

---

## 9. 핵심 비즈니스 규칙

### A. 시술 기록 입력

| 방법 | 소요 시간 | 진입점 |
|------|----------|--------|
| 예약에서 시술 시작 | 1탭 | /tasks → "시술 시작" |
| 직접 시술 생성 | 폼 입력 | /treatments/new |
| 음성 메모 | 30초 | /treatments/new → VoiceMemo |

### B. 음성 메모 처리

```
녹음(30초) → Whisper API → 텍스트 → GPT-4o Structured Output → JSON
```
- 음성 파일은 텍스트 변환 후 **즉시 삭제** (프라이버시)
- 텍스트만 DB에 저장 (`treatments.voice_memo_text`)
- Rate limit: 10요청/분/사용자

### C. 사진 관리

- **Supabase Storage** `treatment-photos` 버킷
- 최대 파일 크기: 10MB (사진), 5MB (프로필)
- 사진 타입: `before` / `during` / `after`
- 어노테이션: 사진 위 핀 노트 (최대 10개, 텍스트 50자)
- Soft delete: 삭제 후 7일간 휴지통 보관, 이후 Cron으로 영구 삭제

### D. 페이스 스왑

- 매장별 페이스 모델 라이브러리 관리
- 배치 생성 (1회 요청으로 복수 결과)
- 결과 선택 시 포트폴리오 자동 등록
- Rate limit: 10요청/분/사용자

---

## 10. 개발 환경 설정

### 개발 서버

```bash
cd frontend && npm install && npm run dev
# → http://localhost:3000 (API Routes 포함)
```

### 환경 변수 (frontend/.env.local)

| 변수 | 설명 | 필수 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Y |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 | Y |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role 키 (API Routes) | Y |
| `OPENAI_API_KEY` | OpenAI API 키 (Whisper + GPT-4o) | Y |
| `REPLICATE_API_TOKEN` | Replicate API 토큰 (페이스 스왑) | Y |
| `ADMIN_USER_IDS` | 관리자 사용자 ID (쉼표 구분) | N |
| `ADMIN_EMAILS` | 관리자 이메일 (쉼표 구분) | N |
| `CRON_SECRET` | Cron API 인증 토큰 | N |

### 개발 명령어

```bash
cd frontend && npm run dev              # 개발 서버
cd frontend && npm run build            # 프로덕션 빌드
cd frontend && npm run lint             # ESLint
npx supabase start                      # 로컬 Supabase
npx supabase db push                    # 마이그레이션 적용
npx supabase db reset                   # DB 초기화
```

### 로컬 도구 경로

- **gh CLI**: `"C:/Program Files/GitHub CLI/gh.exe"` (PATH에 없으므로 전체 경로 사용)

---

## 11. 코딩 컨벤션

### API Routes (Backend)

- API Routes는 `src/app/api/` 아래 도메인별 디렉토리
- 매장 API: `withShopAuth` 데코레이터 사용
- 글로벌 API: `requireAuth()` 헬퍼 사용
- AI API: `requireAuth()` + `checkRateLimit()` (10/min)
- 관리자 API: `requireAdmin()` 헬퍼 사용
- POST/PUT body: `validateBody(req, zodSchema)` 사용
- DB 접근: `createServerClient()` (service_role) 또는 `createClient()` (SSR auth)
- 검색 쿼리의 ILIKE: `escapeIlike()` 사용 (와일드카드 인젝션 방지)

### 에러 응답 포맷

```json
// Zod 검증 실패
{ "error": "입력 데이터가 유효하지 않습니다.", "details": [{ "path": "name", "message": "..." }] }

// 인증 실패
{ "error": "인증이 필요합니다." }

// 권한 없음
{ "error": "이 매장의 멤버가 아닙니다." }

// 일반 에러
{ "error": "..." }
```

### Frontend (TypeScript)

- Next.js 15 App Router (`src/app/`)
- API 호출: `src/lib/api.ts`의 타입화된 함수
- 스타일링: Tailwind CSS v4 유틸리티 클래스
- 컴포넌트: `src/components/`
- 전역 상태: React Context (`AuthContext`, `ShopContext`)
- 매장별 API: `useShopApi()` 훅

### 공통

- TypeScript 하나로 프론트/백엔드 타입 통일
- 민감 정보 (`.env`, API 키) 절대 커밋하지 않음
- 다크/라이트 모드 지원 (ThemeProvider)
- 모바일 퍼스트 (max-width: 480px)

---

## 12. Git 워크플로우

### 브랜치 네이밍

- 기능: `feat/기능명`, 수정: `fix/이슈번호-설명`, 리팩토링: `refactor/대상`, 문서: `docs/대상`

### 작업 순서 (Worktree 방식 -- 반드시 준수)

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

### 절대 규칙

- **어떤 코드 수정이든 반드시 worktree에서 진행**. main worktree에서 직접 파일 수정 금지.
- **항상 main에서 새 브랜치 생성**. 다른 브랜치에서 분기하지 않는다.
- **모든 작업은 PR 경유**. main에 직접 커밋/푸시 금지.
- 머지: `--squash --delete-branch`. 머지 후 `git worktree remove`.

### 사용자 확인 규칙

- 파일 생성/수정, 패키지 설치, 빌드 → 확인 없이 진행
- git commit, push, PR 생성, merge → 반드시 사용자 확인

### 커밋 메시지
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`
- 한국어 또는 영어

---

## 13. 기능 현황

### Phase 1 Complete (구현 완료)

| 카테고리 | 기능 |
|---------|------|
| 기본 CRUD | 매장/고객/시술 CRUD, 시술 사진/영상 업로드 |
| AI | 음성 메모 구조화 (Whisper + GPT-4o), 페이스 스왑 (Replicate) |
| 포트폴리오 | 생성/관리/공개/비공개, SNS 공유 |
| 예약 | 예약 입력, 예약 보드 (일일/전체), 예약 → 시술 전환 |
| 인증 | Supabase Auth (Email + Kakao), 매장별 역할 기반 접근 |
| 멤버 | 매장 멤버 관리, 초대 시스템, 디자이너 공개 프로필 |
| 서비스 | 서비스 카테고리/메뉴 커스터마이징 |
| 사진 | 어노테이션 (스타일 노트), soft delete + 휴지통 |
| 탐색 | Explore 페이지 (공개 포트폴리오/디자이너 검색) |
| 관리자 | 관리자 패널 (사용자/역할), 사이트 설정 (테마/브랜딩) |
| 보안 | API 인증 (withShopAuth/requireAuth/requireAdmin), Zod 검증, rate limiting |

### Phase 2 Next (다음 목표)

- 네이버 예약 실시간 연동
- Instagram 포트폴리오 연동
- 자동 모자이크
- 예약 Drag & Drop
- 리뷰 게시 동의 + 쿠폰
- AI 스타일러 (시술 결과 미리보기)
- 매출/고객 동향 분석
- 에러 응답 표준화 (`{ detail }` → `{ error }` 통일)
- 오프라인 지원 (Service Worker)

---

## 14. 가격 정책 및 수익 모델

> 상세: [docs/PRD.md](docs/PRD.md) 섹션 8 참조

| 수익 모델 | 내용 | 방식 |
|----------|------|------|
| 플랫폼 월 구독료 | 월 2~3만원 | 정기구독 |
| AI 페이스 스왑 이용권 | 무료 제공 후 초과 과금 | 부가 서비스 |
| 기자재 업체 입점 수수료 | O2O 기자재 판매 | 수수료/광고 |
| PB 상품 판매 | 자체 제작 상품 | 판매 수익 |
| 미용 취업 알선 | AI 기반 매칭 | 서비스료 |

### 비용 구조 (샵 1개 기준)
| 항목 | 월 비용 |
|------|---------|
| 음성 인식 (Whisper) | ~$1 |
| 페이스 스왑 (Replicate) | ~$0.27 (100장) |
| Vercel + Supabase | $0 (Free) ~ $45 (Pro) |

---

## 15. 배포 전략

| 컴포넌트 | 서비스 |
|---------|--------|
| Next.js (풀스택) | Vercel |
| Database + Storage + Auth | Supabase |

> 상세: [docs/deployment-guide.md](docs/deployment-guide.md)
