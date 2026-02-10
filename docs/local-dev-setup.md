# 로컬 개발환경 세팅 가이드

## 사전 준비

| 도구 | 버전 | 설치 |
|------|------|------|
| **Node.js** | 22+ | https://nodejs.org |
| **Docker Desktop** | 최신 | https://docker.com (Supabase CLI용) |
| **VS Code** | 최신 | https://code.visualstudio.com |
| **Git** | 최신 | https://git-scm.com |

---

## 1단계: 프로젝트 클론

```bash
# 원하는 위치에 클론
cd ~/projects   # 또는 원하는 디렉토리
git clone https://github.com/premuto5749/Noteastyle.git
cd Noteastyle
```

---

## 2단계: VS Code로 열기

### 방법 A: 단독으로 열기

```bash
code .
```

### 방법 B: 기존 프로젝트(premuto 등)와 함께 열기

VS Code **Multi-root Workspace** 사용:

```bash
# 프로젝트 구조 예시:
# ~/projects/
# ├── premuto/        ← 기존 프로젝트
# └── Noteastyle/     ← 이 프로젝트
```

**설정 방법:**

1. `noteastyle.code-workspace` 파일 편집:
```jsonc
{
  "folders": [
    {
      "name": "Noteastyle",
      "path": "."
    },
    {
      "name": "premuto",
      "path": "../premuto"    // ← 실제 경로로 수정
    }
  ]
}
```

2. VS Code에서 열기:
```bash
code noteastyle.code-workspace
```

또는 VS Code 메뉴: `File → Open Workspace from File...`

> **멀티 루트 워크스페이스 장점**: 프로젝트 간 코드 비교, 검색, 터미널을 하나의 VS Code 창에서 관리. 각 프로젝트의 `.vscode/settings.json`이 독립적으로 적용됩니다.

### 방법 C: 프로젝트별 별도 창

```bash
# 터미널 1
code ~/projects/premuto

# 터미널 2
code ~/projects/Noteastyle
```

---

## 3단계: VS Code 확장 설치

프로젝트를 열면 VS Code가 권장 확장을 설치하라는 알림을 표시합니다.

수동 설치:
```bash
code --install-extension esbenp.prettier-vscode        # 코드 포매터
code --install-extension dbaeumer.vscode-eslint         # Lint
code --install-extension bradlc.vscode-tailwindcss      # Tailwind CSS 자동완성
code --install-extension ms-vscode.vscode-typescript-next  # TypeScript 최신
code --install-extension Anthropic.claude-code          # Claude Code
```

> 이 확장들은 premuto 프로젝트에서도 동일하게 사용됩니다.

---

## 4단계: Supabase 로컬 환경 설정

### Option A: Supabase CLI (권장)

Docker Desktop이 실행 중이어야 합니다.

```bash
# Supabase CLI 설치 (한 번만)
npm install -g supabase

# 로컬 Supabase 시작
npx supabase start
```

출력에서 키 확인:
```
         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
        anon key: eyJhbGciOiJIUzI1NiIs...  ← 복사
service_role key: eyJhbGciOiJIUzI1NiIs...  ← 복사
```

마이그레이션 적용:
```bash
npx supabase db push
```

> **Studio URL** (http://127.0.0.1:54323)에서 테이블을 직접 확인/수정할 수 있습니다. Supabase 대시보드와 동일한 UI입니다.

### Option B: 원격 Supabase 직접 사용

로컬 Docker 없이 원격 Supabase 프로젝트에 연결:

1. https://supabase.com 에서 프로젝트 생성
2. Settings → API에서 키 확인
3. SQL Editor에서 마이그레이션 직접 실행

---

## 5단계: 환경 변수 설정

```bash
cp frontend/.env.example frontend/.env.local
```

`frontend/.env.local` 편집:

```env
# Supabase (4단계에서 확인한 값)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...로컬-anon-키...
SUPABASE_SERVICE_ROLE_KEY=eyJ...로컬-service-role-키...

# OpenAI (https://platform.openai.com/api-keys 에서 발급)
OPENAI_API_KEY=sk-...

# AKOOL (https://akool.com 에서 발급)
AKOOL_API_KEY=your-akool-key
AKOOL_CLIENT_ID=your-akool-client-id

# App
NEXT_PUBLIC_SHOP_ID=00000000-0000-0000-0000-000000000001
```

> **premuto와 공유하는 키**: `OPENAI_API_KEY`는 premuto에서 이미 사용 중이면 같은 키를 쓸 수 있습니다.

---

## 6단계: 의존성 설치 & 개발 서버 시작

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 확인: **http://localhost:3000**

---

## 7단계: 정상 동작 확인

### API 헬스 체크
```bash
curl http://localhost:3000/api/health
# → {"status":"ok","service":"Note-a-Style API","timestamp":"..."}
```

### Supabase 연결 확인
- http://localhost:3000 접속 → 데이터 로딩 확인
- Supabase Studio (http://127.0.0.1:54323) → 테이블 확인

---

## 일상 개발 워크플로우

### 매일 시작할 때

```bash
# 1. Supabase 시작 (이미 실행 중이면 생략)
npx supabase start

# 2. 개발 서버 시작
cd Noteastyle/frontend && npm run dev

# 3. VS Code 열기
code ~/projects/Noteastyle
# 또는
code ~/projects/noteastyle.code-workspace
```

### 작업 끝날 때

```bash
# Supabase 중지 (Docker 리소스 해제)
npx supabase stop
```

### 자주 쓰는 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (http://localhost:3000) |
| `npm run build` | 프로덕션 빌드 테스트 |
| `npm run lint` | ESLint 검사 |
| `npx supabase start` | 로컬 Supabase 시작 |
| `npx supabase stop` | 로컬 Supabase 중지 |
| `npx supabase db push` | 마이그레이션 적용 |
| `npx supabase db reset` | DB 초기화 + 재적용 |

---

## premuto와 동시 개발 시 참고

### 포트 충돌 방지

| 서비스 | premuto | Noteastyle |
|--------|---------|-----------|
| Next.js | `:3000` | `:3001` (충돌 시) |
| Supabase API | `:54321` | 공유 가능 (같은 인스턴스) |

Next.js 포트 변경:
```bash
# Noteastyle을 3001 포트에서 실행
cd frontend && npm run dev -- -p 3001
```

### Supabase 프로젝트 분리

premuto와 Noteastyle이 **같은 Supabase 인스턴스**를 공유하면 테이블이 섞입니다.

**권장: 원격 Supabase 프로젝트를 각각 생성**
- premuto → `premuto` Supabase 프로젝트
- Noteastyle → `noteastyle` Supabase 프로젝트

로컬 CLI로 분리하려면:
```bash
# 각 프로젝트 디렉토리에서 별도로 init
cd ~/projects/Noteastyle && npx supabase init
cd ~/projects/premuto && npx supabase init
```

---

## 트러블슈팅

### VS Code에서 TypeScript 에러가 표시됨
→ `Cmd+Shift+P` → "TypeScript: Select TypeScript Version" → "Use Workspace Version" 선택

### `npm run dev` 시 포트 충돌
→ premuto가 이미 3000번을 쓰고 있으면: `npm run dev -- -p 3001`

### Supabase `npx supabase start` 실패
→ Docker Desktop이 실행 중인지 확인
→ 기존 인스턴스 정리: `npx supabase stop && npx supabase start`

### `.env.local` 변경이 반영 안 됨
→ Next.js 개발 서버 재시작 필요 (`Ctrl+C` → `npm run dev`)

### ESLint/Prettier가 저장 시 동작 안 함
→ VS Code 우측 하단 상태바에서 ESLint/Prettier 활성화 확인
→ `Cmd+Shift+P` → "ESLint: Restart ESLint Server"
