# Note-a-Style 배포 가이드

> Next.js 모놀리식 + Supabase 아키텍처 기준

## 아키텍처

```
┌──────────────────────────────┐         ┌──────────────────────┐
│         Vercel               │         │      Supabase        │
│  ┌────────────────────────┐  │  REST   │  ┌────────────────┐  │
│  │  Next.js 15 (App Router)│──────────→│  PostgreSQL 16   │  │
│  │  - Pages (React 19)    │  │         │  └────────────────┘  │
│  │  - API Routes          │  │         │  ┌────────────────┐  │
│  │    (/api/shops, etc.)  │  │         │  │  Storage       │  │
│  └────────────────────────┘  │         │  │  (사진 저장)    │  │
│                              │         │  └────────────────┘  │
└──────────────────────────────┘         └──────────────────────┘
              │
       ┌──────┼──────┐
       ▼      ▼      ▼
   OpenAI   AKOOL   (S3 선택)
```

> **premuto와 동일한 구성**: Vercel + Supabase 2곳만 관리. 별도 백엔드 서버 없음. CORS 불필요.

---

## 비용 요약

### MVP 단계 (1-2개 샵)
| 항목 | 비용 |
|------|------|
| Vercel (Free) | $0 |
| Supabase (Free) | $0 |
| **합계** | **$0/월** (AI API 비용 별도) |

### 성장 단계 (10-50개 샵)
| 항목 | 비용 |
|------|------|
| Vercel (Pro) | $20/월 |
| Supabase (Pro) | $25/월 |
| **합계** | **$45/월** (AI API 비용 별도) |

> 구 아키텍처(FastAPI + Railway) 대비 Railway $5-20/월 절감, 관리 포인트 1개 감소.

---

## Step 1: Supabase 프로젝트 설정

### 1-1. 프로젝트 생성

1. https://supabase.com 가입/로그인
2. "New Project" 클릭
3. 설정:
   - **Name**: `noteastyle`
   - **Database Password**: 강력한 비밀번호 설정 (기록해둘 것!)
   - **Region**: `Northeast Asia (Seoul)` 선택
4. 프로젝트 생성 완료 대기 (~2분)

### 1-2. 키 확인

Project Settings → API에서 확인:

| 키 | 용도 | 환경 변수 |
|----|------|----------|
| **Project URL** | Supabase 엔드포인트 | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** | 클라이언트용 (RLS 적용) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** | 서버용 (RLS 우회) | `SUPABASE_SERVICE_ROLE_KEY` |

> **service_role 키는 절대 클라이언트에 노출하지 마세요.** 서버 사이드(API Routes)에서만 사용합니다.

### 1-3. 데이터베이스 스키마 생성

Supabase Dashboard → SQL Editor에서 마이그레이션 파일 실행:

```bash
# 순서대로 실행
supabase/migrations/001_initial_schema.sql    # 6개 테이블 생성
supabase/migrations/002_helper_functions.sql  # 헬퍼 함수
```

또는 Supabase CLI 사용:
```bash
npx supabase db push
```

### 1-4. Storage 버킷 생성 (사진 저장용)

Supabase Dashboard → Storage:

1. "New Bucket" 클릭
2. 이름: `treatment-photos`
3. Public bucket: **No** (Signed URL로 접근)
4. File size limit: `10MB`

---

## Step 2: Vercel 배포

### 2-1. 프로젝트 연결

1. https://vercel.com 가입 (GitHub 연동)
2. "Add New Project" → `premuto5749/Noteastyle` 레포 선택
3. 설정:
   - **Framework Preset**: Next.js (자동 감지)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (기본값)

### 2-2. 환경 변수 설정

Vercel → Settings → Environment Variables:

```env
# Supabase (Step 1에서 확인한 키)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI (Whisper + GPT-4o)
OPENAI_API_KEY=sk-...

# AKOOL Face Swap
AKOOL_API_KEY=your-key
AKOOL_CLIENT_ID=your-client-id

# App
NEXT_PUBLIC_SHOP_ID=00000000-0000-0000-0000-000000000001
```

> `NEXT_PUBLIC_` 접두사가 있는 변수만 브라우저에 노출됩니다.
> `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `AKOOL_*`는 서버에서만 접근 가능합니다.

### 2-3. 배포 확인

```bash
# 배포 URL 확인
https://noteastyle.vercel.app

# 헬스 체크
curl https://noteastyle.vercel.app/api/health
# → {"status":"ok","service":"Note-a-Style API","timestamp":"..."}
```

### 2-4. vercel.json (선택)

`frontend/vercel.json`:
```json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "preview": false
    }
  }
}
```

---

## Step 3: 커스텀 도메인 (선택)

### Vercel 도메인 설정

1. Vercel → Settings → Domains → "Add Domain"
2. `www.noteastyle.com` 추가
3. DNS 레코드 설정:
   - **A Record**: `76.76.21.21`
   - 또는 **CNAME**: `cname.vercel-dns.com`

최종 URL:
```
https://www.noteastyle.com       → 앱 전체 (프론트엔드 + API)
https://www.noteastyle.com/api/  → API 엔드포인트
```

> 별도 `api.noteastyle.com` 불필요 — API Routes가 같은 도메인에서 서빙됩니다.

---

## 로컬 개발 환경

### 방법 A: Supabase CLI (권장)

```bash
# 1. Supabase CLI 설치
npm install -g supabase

# 2. 로컬 Supabase 인스턴스 시작 (Docker 필요)
npx supabase start

# 출력 예시:
#   API URL: http://127.0.0.1:54321
#   anon key: eyJ...local...
#   service_role key: eyJ...local...

# 3. 마이그레이션 적용
npx supabase db push

# 4. frontend/.env.local 설정
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...local-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...local-service-role-key...
OPENAI_API_KEY=sk-your-key
AKOOL_API_KEY=your-key
AKOOL_CLIENT_ID=your-id
NEXT_PUBLIC_SHOP_ID=00000000-0000-0000-0000-000000000001
EOF

# 5. Next.js 개발 서버 시작
cd frontend && npm run dev
# → http://localhost:3000
```

### 방법 B: 원격 Supabase 직접 연결

```bash
# frontend/.env.local에 프로덕션 Supabase 키 입력
# (별도 로컬 DB 불필요)
cd frontend && npm run dev
```

### 방법 C: Docker Compose (간이 로컬 DB)

```bash
docker compose up -d
# PostgreSQL: localhost:5432
# Next.js: http://localhost:3000
```

> **참고**: Docker Compose의 PostgreSQL은 순수 DB만 제공합니다.
> Supabase JS 클라이언트를 사용하려면 **방법 A (Supabase CLI)** 를 권장합니다.

---

## 환경 변수 체크리스트

| 변수 | 로컬 (Supabase CLI) | 프로덕션 (Vercel) |
|------|---------------------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 로컬 키 (CLI 출력) | Supabase 대시보드 |
| `SUPABASE_SERVICE_ROLE_KEY` | 로컬 키 (CLI 출력) | Supabase 대시보드 |
| `OPENAI_API_KEY` | `.env.local` | Vercel 환경 변수 |
| `AKOOL_API_KEY` | `.env.local` | Vercel 환경 변수 |
| `AKOOL_CLIENT_ID` | `.env.local` | Vercel 환경 변수 |
| `NEXT_PUBLIC_SHOP_ID` | 테스트 UUID | 실제 매장 UUID |

---

## Supabase Storage (사진 업로드)

현재 API Route (`/api/shops/[shopId]/treatments/[treatmentId]/photos`)에서 Supabase Storage에 업로드합니다.

### Storage 정책 설정

Supabase Dashboard → Storage → Policies:

```sql
-- 서버(service_role)에서 업로드 허용 (API Route에서 사용)
CREATE POLICY "Service role can upload" ON storage.objects
  FOR INSERT TO service_role WITH CHECK (bucket_id = 'treatment-photos');

-- 공개 읽기 (포트폴리오용, 선택)
CREATE POLICY "Public read for published" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'treatment-photos');
```

> AWS S3 대신 Supabase Storage를 사용하면 별도 AWS 계정/IAM 설정이 불필요합니다.

---

## 트러블슈팅

### Vercel 빌드 실패
- **환경 변수 누락**: Vercel에 `NEXT_PUBLIC_SUPABASE_URL` 등 설정했는지 확인
- **Root Directory**: `frontend`로 설정했는지 확인
- **Node.js 버전**: Vercel 기본 Node 22 사용 (package.json의 engines 확인)

### Supabase 연결 실패
- **URL 형식**: `https://xxx.supabase.co` (끝에 `/` 없음)
- **키 확인**: `anon key`와 `service_role key` 혼동 주의
- **RLS**: service_role 키를 사용하면 RLS 우회됨 (현재 설계)

### 로컬 Supabase CLI 시작 안 됨
- Docker Desktop이 실행 중인지 확인
- `npx supabase stop && npx supabase start` 재시작
- 포트 충돌: 54321 (API), 54322 (DB) 확인

### 사진 업로드 실패
- Storage 버킷 `treatment-photos` 생성 확인
- 파일 크기 10MB 제한 확인
- service_role 키로 접근하는지 확인 (anon 키는 정책 필요)
