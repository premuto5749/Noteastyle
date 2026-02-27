# Plan: API Security Hardening

> PDCA Phase: **Plan**
> Feature: `api-security-hardening`
> Created: 2026-02-28
> Status: Draft

---

## 1. Background & Motivation

### Problem Statement

Code Analysis (2026-02-27) 결과 **7개 CRITICAL 보안 이슈**가 발견됨:

- AI API 엔드포인트 7개가 **완전히 무인증** 상태
- 외부 사용자가 OpenAI Whisper / Replicate API를 무제한 호출 가능 → 비용 탈취
- 사진 데이터 무단 수정/조회 가능 → 데이터 무결성 침해
- API Route 입력 검증 전무 → 잘못된 데이터 삽입 가능
- service_role 키가 anon 키로 자동 폴백 → 권한 수준 무력화

### Impact

| 위험 | 영향도 | 발생 가능성 |
|------|--------|------------|
| AI API 비용 탈취 | HIGH (무제한 과금) | HIGH (URL만 알면 호출 가능) |
| 데이터 무단 수정 | HIGH (포트폴리오 조작) | MEDIUM (UUID 추측 필요) |
| 서비스 거부 (DoS) | MEDIUM (rate limit 없음) | HIGH |
| 데이터 무단 조회 | MEDIUM (face swap 결과) | MEDIUM |

### Success Criteria

- [ ] 모든 AI API 엔드포인트에 인증 적용 (7개)
- [ ] 모든 데이터 변경 API에 Zod 입력 검증 적용
- [ ] AI API에 rate limiting 적용
- [ ] service_role 키 폴백 제거
- [ ] 기존 인증된 API(withShopAuth)와 동일한 보안 수준 확보
- [ ] `npm run build` 성공 (타입 에러 없음)

---

## 2. Scope

### In Scope

#### 2-1. 인증 없는 AI API 엔드포인트 보호 (CRITICAL)

| # | 엔드포인트 | 파일 | 조치 |
|---|-----------|------|------|
| 1 | `POST /api/face-swap` | `api/face-swap/route.ts` | 세션 인증 추가 |
| 2 | `POST /api/face-swap/generate` | `api/face-swap/generate/route.ts` | 세션 인증 + 매장 소유 확인 |
| 3 | `GET/POST /api/face-swap/results` | `api/face-swap/results/route.ts` | 세션 인증 + 매장 소유 확인 |
| 4 | `POST /api/face-swap/results/[resultId]/select` | `api/face-swap/results/[resultId]/select/route.ts` | 세션 인증 + 체인 확인 |
| 5 | `POST /api/face-swap/complete/[photoId]` | `api/face-swap/complete/[photoId]/route.ts` | 세션 인증 + 소유 확인 |
| 6 | `GET /api/face-swap/status/[jobId]` | `api/face-swap/status/[jobId]/route.ts` | 세션 인증 |
| 7 | `POST /api/voice/transcribe` | `api/voice/transcribe/route.ts` | 세션 인증 |

#### 2-2. API 입력 검증 (HIGH)

| # | 엔드포인트 | 검증 항목 |
|---|-----------|----------|
| 1 | `POST /shops/{id}/treatments` | customer_id(UUID), service_type(string), duration(positive int), price(positive) |
| 2 | `POST /shops/{id}/customers` | name(1-100자), phone(형식), gender(enum), birth_date(날짜) |
| 3 | `POST /shops/{id}/reservations` | customer_id(UUID), scheduled_date(날짜), scheduled_time(시간) |
| 4 | `GET /shops/{id}/customers?search=` | ilike 와일드카드 이스케이프 (`%`, `_`) |
| 5 | `GET /explore/portfolio?search=` | or() 필터 인젝션 방지 |

#### 2-3. 인프라 보안 (HIGH)

| # | 항목 | 파일 | 조치 |
|---|------|------|------|
| 1 | service_role 폴백 제거 | `lib/supabase/server.ts` | 키 없으면 throw Error |
| 2 | AI API rate limiting | face-swap, voice API | 분당/시간당 호출 제한 |

### Out of Scope

- RLS(Row Level Security) 정책 변경 (별도 PDCA)
- 프론트엔드 XSS 방지 (별도 PDCA)
- CSRF 보호 (Next.js 기본 제공)
- 로깅/모니터링 시스템 구축 (별도 PDCA)
- 기존 `withShopAuth` 래퍼 리팩토링

---

## 3. Technical Approach

### 3-1. 인증 전략

face-swap/voice API는 shop-scoped가 아니므로 `withShopAuth`를 직접 사용할 수 없음.
대신 **세션 기반 인증 미들웨어**를 신규 작성:

```
[방안] requireAuth() 헬퍼 함수
────────────────────────────────────
- Supabase Auth 세션 확인 (getUser())
- 인증 실패 시 401 반환
- 성공 시 user 객체 반환
- 추가로 리소스 소유권 확인 필요한 경우 별도 검증
```

**구현 위치**: `frontend/src/lib/auth/require-auth.ts`

기존 `withShopAuth`는 shop-scoped API에 사용되므로 그대로 유지.
face-swap 등 global API에는 `requireAuth()`를 사용.

### 3-2. 입력 검증 전략

```
[방안] Zod 스키마 + validateBody() 헬퍼
────────────────────────────────────
- 각 API Route에 대응하는 Zod 스키마 정의
- validateBody(req, schema) 헬퍼로 파싱 + 에러 응답
- 검증 실패 시 400 + 구체적 에러 메시지 반환
```

**구현 위치**: `frontend/src/lib/validations/` (스키마별 파일 분리)

### 3-3. Rate Limiting 전략

```
[방안] In-memory rate limiter (Vercel 환경)
────────────────────────────────────
- Map<string, { count, resetAt }> 기반 간단한 카운터
- AI API: 분당 10회, 시간당 50회 (사용자별)
- Vercel serverless는 인스턴스 간 메모리 비공유 → 완벽하지 않지만 기본 보호 제공
- 향후 Redis/Upstash 기반으로 업그레이드 가능
```

**구현 위치**: `frontend/src/lib/rate-limit.ts`

### 3-4. 와일드카드 이스케이프

```typescript
// lib/utils/sanitize.ts
export function escapeIlike(value: string): string {
  return value.replace(/%/g, '\\%').replace(/_/g, '\\_');
}
```

---

## 4. Implementation Order

```
Phase A: 기반 유틸리티 (의존성 없음)
├── A1. requireAuth() 헬퍼 작성
├── A2. Zod 스키마 정의 (treatments, customers, reservations)
├── A3. validateBody() 헬퍼 작성
├── A4. rate-limit.ts 작성
└── A5. escapeIlike() 유틸리티 작성

Phase B: CRITICAL 인증 적용 (A1 의존)
├── B1. face-swap/route.ts 인증 추가
├── B2. face-swap/generate/route.ts 인증 + 소유권 확인
├── B3. face-swap/results/route.ts 인증 + 소유권 확인
├── B4. face-swap/results/[resultId]/select/route.ts 인증 + 체인 확인
├── B5. face-swap/complete/[photoId]/route.ts 인증 + 소유 확인
├── B6. face-swap/status/[jobId]/route.ts 인증 추가
└── B7. voice/transcribe/route.ts 인증 추가

Phase C: 입력 검증 적용 (A2, A3 의존)
├── C1. treatments/route.ts POST에 Zod 검증 추가
├── C2. customers/route.ts POST에 Zod 검증 추가
├── C3. reservations/route.ts POST에 Zod 검증 추가
├── C4. customers/route.ts GET - ilike 이스케이프 (A5 의존)
└── C5. explore/portfolio/route.ts GET - or() 필터 수정

Phase D: 인프라 보안 (독립)
├── D1. server.ts service_role 폴백 제거
└── D2. AI API에 rate limiting 미들웨어 적용 (A4, B1-B7 의존)

Phase E: 검증
├── E1. npm run build 성공 확인
└── E2. 수동 테스트 (인증 없이 API 호출 시 401 확인)
```

---

## 5. Affected Files

### 신규 생성

| 파일 | 용도 |
|------|------|
| `src/lib/auth/require-auth.ts` | 세션 인증 헬퍼 |
| `src/lib/validations/treatment.ts` | 시술 기록 Zod 스키마 |
| `src/lib/validations/customer.ts` | 고객 Zod 스키마 |
| `src/lib/validations/reservation.ts` | 예약 Zod 스키마 |
| `src/lib/validations/index.ts` | validateBody 헬퍼 + re-export |
| `src/lib/rate-limit.ts` | Rate limiting 유틸리티 |
| `src/lib/utils/sanitize.ts` | ilike 이스케이프 유틸리티 |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `src/app/api/face-swap/route.ts` | requireAuth() 추가 |
| `src/app/api/face-swap/generate/route.ts` | requireAuth() + 소유권 확인 |
| `src/app/api/face-swap/results/route.ts` | requireAuth() + 소유권 확인 |
| `src/app/api/face-swap/results/[resultId]/select/route.ts` | requireAuth() + 체인 확인 |
| `src/app/api/face-swap/complete/[photoId]/route.ts` | requireAuth() + 소유 확인 |
| `src/app/api/face-swap/status/[jobId]/route.ts` | requireAuth() 추가 |
| `src/app/api/voice/transcribe/route.ts` | requireAuth() 추가 |
| `src/app/api/shops/[shopId]/treatments/route.ts` | Zod 검증 추가 |
| `src/app/api/shops/[shopId]/customers/route.ts` | Zod 검증 + ilike 이스케이프 |
| `src/app/api/shops/[shopId]/reservations/route.ts` | Zod 검증 추가 |
| `src/app/api/explore/portfolio/route.ts` | or() 필터 수정 |
| `src/lib/supabase/server.ts` | service_role 폴백 제거 |

---

## 6. Risk & Mitigation

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 인증 추가 후 기존 프론트엔드 호출 실패 | HIGH | HIGH | 프론트엔드 API 클라이언트가 이미 쿠키 기반 세션을 전송하는지 확인 필요 |
| Zod 검증이 기존 유효 요청을 거부 | MEDIUM | MEDIUM | 기존 데이터 패턴 분석 후 스키마를 관대하게 설정 |
| Rate limiting이 정상 사용을 차단 | LOW | MEDIUM | 충분히 넉넉한 한도 설정 (분당 10회) |
| service_role 폴백 제거로 로컬 개발 깨짐 | MEDIUM | LOW | .env.example 업데이트 + 에러 메시지에 설정 방법 안내 |

---

## 7. Dependencies

- **zod**: 이미 `package.json`에 포함 (openai-service.ts에서 사용 중)
- **@supabase/ssr**: 이미 사용 중 (서버 세션 확인용)
- 추가 패키지 설치 없음

---

## 8. Estimation

| Phase | 작업량 | 복잡도 |
|-------|--------|--------|
| A. 기반 유틸리티 | 5개 파일 신규 | LOW |
| B. 인증 적용 | 7개 파일 수정 | MEDIUM |
| C. 입력 검증 | 5개 파일 수정 | LOW |
| D. 인프라 보안 | 2개 파일 수정 | LOW |
| E. 검증 | 빌드 + 테스트 | LOW |
