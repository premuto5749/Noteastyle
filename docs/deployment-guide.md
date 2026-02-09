# Note-a-Style 프로덕션 배포 가이드

> 이 문서는 Note-a-Style을 프로덕션 환경에 배포하기 위한 단계별 가이드입니다.

## 아키텍처 비교: premuto vs Noteastyle

| | premuto | Noteastyle |
|--|---------|------------|
| 구조 | Next.js 모놀리식 (풀스택) | Next.js (프론트) + FastAPI (백엔드) **분리형** |
| DB | Supabase (PostgreSQL + RLS + Auth) | 자체 PostgreSQL + SQLAlchemy + Alembic |
| 인증 | Supabase Auth | 자체 구현 (python-jose + passlib) |
| 배포 | Vercel 단일 배포 | Frontend + Backend **각각 배포** 필요 |

> **핵심 차이**: premuto는 Supabase를 DB+Auth+Storage 올인원으로 사용하므로 Vercel 하나로 배포가 가능하지만, Noteastyle은 FastAPI 백엔드가 별도로 존재하므로 **백엔드 호스팅이 추가로 필요**합니다.

---

## 권장 프로덕션 구성

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Vercel     │────→│   Railway       │────→│  Supabase/Neon   │
│  (Frontend)  │ API │  (Backend)      │ DB  │  (PostgreSQL)    │
│  Next.js 15  │     │  FastAPI        │     │                  │
└─────────────┘     └─────────────────┘     └──────────────────┘
                           │
                    ┌──────┼──────┐
                    ▼      ▼      ▼
               OpenAI   AKOOL   AWS S3
```

| 컴포넌트 | 서비스 | 무료 티어 | 유료 기준 |
|---------|--------|----------|----------|
| Frontend | **Vercel** | 100GB 대역폭/월 | Pro $20/월 |
| Backend | **Railway** | $5 크레딧/월 | $5~/월 (사용량) |
| Database | **Supabase** | 500MB, 50K 행 | Pro $25/월 |
| Database (대안) | **Neon** | 512MB | Pro $19/월 |
| Storage | **AWS S3** | 5GB (12개월) | ~$0.025/GB |

---

## Step 1: Database (PostgreSQL) 설정

Supabase 또는 Neon 중 선택. **Supabase 권장** (premuto에서 검증됨).

### Option A: Supabase (권장)

> Supabase를 Noteastyle에서는 **PostgreSQL 호스팅 용도로만 사용**합니다.
> premuto처럼 Supabase Auth/RLS/Storage를 사용하지 않고, 순수 DB 연결만 합니다.

#### 1-1. Supabase 프로젝트 생성

1. https://supabase.com 가입/로그인
2. "New Project" 클릭
3. 설정:
   - **Name**: `noteastyle`
   - **Database Password**: 강력한 비밀번호 설정 (기록해둘 것!)
   - **Region**: `Northeast Asia (Seoul)` - ap-northeast-1 선택
4. 프로젝트 생성 완료 대기 (~2분)

#### 1-2. 연결 문자열 확인

1. Project Settings → Database → Connection string → URI 복사
2. 형식:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
   ```
3. **중요**: asyncpg 사용을 위해 앞부분을 변경:
   ```
   postgresql+asyncpg://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
   ```

#### 1-3. 마이그레이션 실행

```bash
# 로컬에서 Supabase DB에 마이그레이션 적용
cd backend
DATABASE_URL="postgresql+asyncpg://..." alembic upgrade head
```

### Option B: Neon

1. https://neon.tech 가입/로그인
2. "Create Project" → Region: `Asia Pacific (Singapore)` 선택
3. 연결 문자열 복사 (postgresql+asyncpg:// 형식으로 변환)
4. 마이그레이션 동일하게 실행

---

## Step 2: Backend (FastAPI) - Railway 배포

### 2-1. Railway 프로젝트 생성

1. https://railway.app 가입 (GitHub 연동)
2. "New Project" → "Deploy from GitHub Repo" 선택
3. `premuto5749/Noteastyle` 레포 선택
4. **Root Directory** 설정: `/backend` (중요!)

### 2-2. 환경 변수 설정

Railway 프로젝트 → Variables 탭에서 설정:

```env
# Database (Step 1에서 얻은 연결 문자열)
DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[password]@...supabase.com:6543/postgres

# OpenAI (필수)
OPENAI_API_KEY=sk-...

# AKOOL (필수)
AKOOL_API_KEY=your-key
AKOOL_CLIENT_ID=your-client-id

# AWS S3 (프로덕션 사진 저장)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=noteastyle-photos
AWS_REGION=ap-northeast-2

# App
SECRET_KEY=<랜덤 문자열 생성>
CORS_ORIGINS=https://your-app.vercel.app
```

> **SECRET_KEY 생성**: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

### 2-3. 빌드 설정

Railway는 Dockerfile을 자동 감지합니다. 추가 설정이 필요하면:

- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 2-4. 배포 확인

Railway 배포 완료 후 제공되는 URL 확인:
```
https://noteastyle-backend-production.up.railway.app
```

헬스 체크:
```bash
curl https://your-railway-url.up.railway.app/api/health
# → {"status":"ok","service":"Note-a-Style API"}
```

---

## Step 3: Frontend (Next.js) - Vercel 배포

### 3-1. Vercel 프로젝트 생성

1. https://vercel.com 가입 (GitHub 연동)
2. "Add New Project" → `premuto5749/Noteastyle` 레포 선택
3. 설정:
   - **Framework Preset**: Next.js (자동 감지)
   - **Root Directory**: `frontend` (중요!)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3-2. 환경 변수 설정

Vercel 프로젝트 → Settings → Environment Variables:

```env
# Backend API URL (Railway에서 배포된 URL)
NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app/api
```

### 3-3. vercel.json 생성 (선택)

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

> premuto 프로젝트와 동일 설정: main 브랜치만 배포, preview 비활성화.

### 3-4. 배포 확인

Vercel 배포 완료 후:
```
https://noteastyle.vercel.app
```

---

## Step 4: CORS 설정 업데이트

Backend의 `CORS_ORIGINS` 환경 변수에 Vercel 도메인 추가:

```env
CORS_ORIGINS=https://noteastyle.vercel.app,https://your-custom-domain.com
```

> Railway에서 환경 변수 업데이트 후 자동 재배포됩니다.

---

## Step 5: AWS S3 설정 (사진 저장)

### 5-1. S3 버킷 생성

1. AWS Console → S3 → "Create Bucket"
2. 설정:
   - **Bucket Name**: `noteastyle-photos`
   - **Region**: `Asia Pacific (Seoul)` ap-northeast-2
   - **Block Public Access**: 활성화 (Signed URL로 접근)

### 5-2. IAM 사용자 생성

1. AWS Console → IAM → Users → "Create User"
2. 이름: `noteastyle-s3`
3. 정책 연결: `AmazonS3FullAccess` (또는 아래 커스텀 정책)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::noteastyle-photos/*"
    }
  ]
}
```

4. Access Key 생성 → Railway 환경 변수에 설정

### 5-3. CORS 정책 (S3)

S3 버킷 → Permissions → CORS:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://noteastyle.vercel.app"],
    "ExposeHeaders": []
  }
]
```

---

## Step 6: 커스텀 도메인 (선택)

### Vercel 커스텀 도메인
1. Vercel → Settings → Domains → "Add Domain"
2. `www.noteastyle.com` 추가
3. DNS 레코드 설정 (CNAME → cname.vercel-dns.com)

### Railway 커스텀 도메인
1. Railway → Settings → Networking → "Custom Domain"
2. `api.noteastyle.com` 추가
3. DNS 레코드 설정 (CNAME 제공됨)

최종 구성:
```
www.noteastyle.com → Vercel (Frontend)
api.noteastyle.com → Railway (Backend)
```

---

## 환경별 구성 요약

### 개발 (로컬)
```bash
docker compose up -d
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# DB: localhost:5432
# 사진: 로컬 uploads/
```

### 프로덕션
```
Frontend: https://noteastyle.vercel.app (또는 커스텀 도메인)
Backend: https://noteastyle-backend.up.railway.app
DB: Supabase PostgreSQL (Seoul)
사진: AWS S3 noteastyle-photos (ap-northeast-2)
```

### 환경 변수 체크리스트

| 변수 | 개발 | 프로덕션 |
|------|------|---------|
| `DATABASE_URL` | Docker PostgreSQL | Supabase/Neon |
| `OPENAI_API_KEY` | .env 파일 | Railway 환경 변수 |
| `AKOOL_API_KEY` | .env 파일 | Railway 환경 변수 |
| `AKOOL_CLIENT_ID` | .env 파일 | Railway 환경 변수 |
| `SECRET_KEY` | 기본값 | 랜덤 생성 필수 |
| `CORS_ORIGINS` | http://localhost:3000 | Vercel 도메인 |
| `AWS_*` | 빈 값 (로컬 저장) | S3 키 필수 |
| `NEXT_PUBLIC_API_URL` | http://localhost:8000/api | Railway URL |

---

## 비용 예상 (월간)

### MVP 단계 (1-2개 샵)
| 항목 | 비용 |
|------|------|
| Vercel (Free) | $0 |
| Railway (Starter) | ~$5 |
| Supabase (Free) | $0 |
| AWS S3 | ~$1 |
| **합계** | **~$6/월** |

### 성장 단계 (10-50개 샵)
| 항목 | 비용 |
|------|------|
| Vercel (Pro) | $20 |
| Railway (Pro) | ~$20 |
| Supabase (Pro) | $25 |
| AWS S3 | ~$10 |
| **합계** | **~$75/월** |

---

## 트러블슈팅

### Railway에서 DB 연결 실패
- `DATABASE_URL` 형식 확인: `postgresql+asyncpg://` (asyncpg 필수)
- Supabase Connection Pooler 사용 시 포트 `6543` 확인
- IPv6 이슈: Railway는 IPv4 사용, Supabase pooler도 IPv4 지원

### Vercel에서 API 호출 실패
- `NEXT_PUBLIC_API_URL`이 정확한지 확인 (끝에 `/api` 포함)
- Backend CORS_ORIGINS에 Vercel 도메인이 포함되어 있는지 확인
- HTTPS 확인 (Vercel은 HTTPS 강제)

### Alembic 마이그레이션 실패
- 로컬에서 `DATABASE_URL` 환경 변수로 원격 DB 지정 후 실행
- `alembic.ini`의 `sqlalchemy.url`은 무시됨 (config.py에서 env 우선)

### 사진 업로드 실패
- AWS S3 버킷 리전 확인 (ap-northeast-2)
- IAM 권한 확인 (PutObject 필요)
- 파일 크기 10MB 제한 확인
