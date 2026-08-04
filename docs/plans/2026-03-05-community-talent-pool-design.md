# 커뮤니티 기반 인재풀 서치 + 제안 시스템 설계

> 작성일: 2026-03-05
> 상태: 승인됨
> 스코프: Phase 2 핵심 기능

---

## 1. 비즈니스 배경

### 1.1 플라이휠 비즈니스 구조

```
시술 기록 도구 (일상 사용, 무료)
  → AI 페이스 스왑으로 초상권 해결
    → 공개 가능한 포트폴리오 자동 생성
      → 커뮤니티에 포트폴리오 공유 (시술 결과물 피드)
        → 매장이 인재풀 서치 (원티드 모델)
          → 디자이너 발견 → 제안 보내기
            → 무료 N건 → 이후 유료 제안권 (수익)
```

디자이너는 "구직"이 아닌 "시술 기록"을 위해 앱을 사용하기 시작한다.
이 기록이 포트폴리오가 되고, 커뮤니티에 공유되며, 자연스럽게 인재풀을 형성한다.
구직 의사가 없는 잠재적 이직 대상까지 포함하는 넓은 인재풀이 핵심 가치.

### 1.2 기존 뷰티 채용 플랫폼의 한계

| 한계 | 설명 |
|------|------|
| 포트폴리오 연동 없음 | 구직자 프로필에 시술 결과물을 보여줄 수 없음 |
| 단방향 게시판 | 구인/구직 글 올리고 연락하는 1세대 방식 |
| 커뮤니티 부재 | 대부분 공지사항 수준의 게시판만 존재 |
| 시술 실력 검증 불가 | 경력 년수로만 판단, 실제 작업물 확인 불가 |
| 모바일 UX 낙후 | 대부분 PC 중심의 레거시 UI |

주요 경쟁사: 헤어인잡, 뷰티인잡, 뷰티인, 헤어애드, 뷰티잡매니저, 헤어인톡 등 10개+

### 1.3 원티드 모델 → 뷰티 버전 변환

원티드: 무제한 무료 제안 + 채용 성사 시 연봉 7% 수수료
Noteastyle: 크레딧 기반 제안권 모델

| | 원티드 (IT) | Noteastyle (뷰티) |
|--|------------|-------------------|
| 연봉 수준 | 4,000만~1억+ | 200~400만원/월 |
| 7% 수수료 | 280~700만원 | 17~34만원 (너무 적음) |
| 채용 빈도 | 낮음 | 높음 (매월 이직 활발) |
| 검증 기준 | 이력서/경력 | 시술 결과물 (포트폴리오) |

→ 성과보수 모델보다 "제안권 크레딧" 모델이 뷰티 업계에 더 적합

### 1.4 양면 시장 콜드 스타트 해결

| 문제 | 기존 채용 사이트 | Noteastyle |
|------|----------------|------------|
| 디자이너 유입 이유 | "구직하려고" (필요할 때만) | "시술 기록하려고" (매일 사용) |
| 콘텐츠 품질 | 텍스트 이력서 | 실제 시술 결과물 + AI 보정 |
| 매장 유입 이유 | 공고 올리려고 | 실력 검증된 인재풀 서치 |
| 수익 모델 | 공고 게시비 | 제안권 (컨택 크레딧) |

### 1.5 서비스 레이어

```
Layer 1: 시술 기록 도구 (무료, 일상 사용)     -- Phase 1 구현 완료
Layer 2: AI 포트폴리오 (무료/제한)             -- Phase 1 구현 완료
Layer 3: 커뮤니티 피드 (공개 포트폴리오)        -- 이번 구현
Layer 4: 인재풀 서치 + 제안 시스템             -- 이번 구현 (수익)
```

---

## 2. 설계 결정 사항

| # | 항목 | 결정 | 이유 |
|---|------|------|------|
| 1 | 제안 권한 | owner + admin | 매장 운영 주체가 채용 담당 |
| 2 | 제안 주체 | 매장 단위 (크레딧 매장 귀속) | 매장 브랜드로 제안, 개인이 아닌 조직 |
| 3 | 알림 | 앱 내 + PWA 푸시 | 카카오 알림톡은 추후 확장 |
| 4 | 무료 크레딧 | 가입 5건 + 소진 후 월 5건 | super_admin이 app_settings에서 조정 가능 |
| 5 | 유료 결제 | MVP 제외 | 소진 시 문의 전환, 검증 후 결제 연동 |
| 6 | 피드 상호작용 | 찜 + 좋아요 | 댓글은 추후 |
| 7 | 제안 수신 | 포트폴리오 공개와 분리, 기본 OFF | 소속 매장 자동 차단, 이직 의사 민감성 보호 |
| 8 | 정보 공개 | 단계 없음, 전부 공개 | 크레딧은 제안에만 차감, MVP 심플 유지 |
| 9 | 제안 내용 | 템플릿 기반 반정형화 | 필수: 포지션/급여, 선택: 복리후생/매장소개/메시지 |

---

## 3. 아키텍처: 접근 A (Explore 확장)

기존 `/explore` 페이지를 커뮤니티 피드 + 인재풀로 확장. 새 페이지 최소화.

```
/explore               → 커뮤니티 피드 (좋아요/찜 추가)
/explore/designer/[id] → 디자이너 프로필 (제안 버튼 추가)
/explore/talent        → 인재풀 서치 (제안 수신 ON인 디자이너만)
/proposals             → 제안 관리 (발신함/수신함)
```

선택 이유: 기존 코드 최대 활용, URL 변경 없이 점진적 확장, MVP 스코프 최소화

---

## 4. 데이터 모델

### 4.1 신규 테이블 (6개)

```sql
-- 커뮤니티 상호작용

portfolio_likes
  id: UUID PK
  portfolio_id: UUID FK -> portfolios
  user_id: UUID FK -> auth.users
  created_at: timestamptz
  UNIQUE(portfolio_id, user_id)

portfolio_bookmarks
  id: UUID PK
  portfolio_id: UUID FK -> portfolios
  shop_id: UUID FK -> shops (매장 단위 찜)
  user_id: UUID FK -> auth.users (누가 찜했는지)
  created_at: timestamptz
  UNIQUE(portfolio_id, shop_id)

-- 인재풀 + 제안

talent_proposals
  id: UUID PK
  from_shop_id: UUID FK -> shops
  from_user_id: UUID FK -> auth.users
  to_member_id: UUID FK -> shop_members
  status: TEXT ('pending' | 'accepted' | 'declined' | 'expired')
  position: TEXT NOT NULL (디자이너/실장/스텝 등)
  salary_range: TEXT NOT NULL (월 300~400만원)
  benefits: TEXT (복리후생)
  shop_intro: TEXT (매장 소개)
  message: TEXT (자유 메시지)
  expires_at: timestamptz (생성 시 +7일)
  responded_at: timestamptz
  created_at: timestamptz
  updated_at: timestamptz

shop_proposal_credits
  id: UUID PK
  shop_id: UUID FK -> shops (UNIQUE)
  total_credits: INT
  monthly_free: INT
  last_monthly_reset: DATE
  created_at: timestamptz
  updated_at: timestamptz

-- 알림

notifications
  id: UUID PK
  user_id: UUID FK -> auth.users
  type: TEXT ('proposal_received' | 'proposal_accepted' | 'proposal_declined' | 'proposal_expired')
  title: TEXT
  body: TEXT
  data: JSONB (proposal_id 등 참조)
  is_read: BOOLEAN DEFAULT false
  created_at: timestamptz

-- PWA 푸시

push_subscriptions
  id: UUID PK
  user_id: UUID FK -> auth.users
  endpoint: TEXT NOT NULL
  keys: JSONB NOT NULL (p256dh, auth)
  created_at: timestamptz
  UNIQUE(user_id, endpoint)
```

### 4.2 기존 테이블 변경

```sql
-- member_profiles 컬럼 추가
ALTER TABLE member_profiles ADD COLUMN open_to_proposals BOOLEAN DEFAULT false;
ALTER TABLE member_profiles ADD COLUMN blocked_shop_ids UUID[] DEFAULT '{}';

-- app_settings 초기 데이터
INSERT INTO app_settings (key, value) VALUES
  ('proposal_initial_credits', '5'),
  ('proposal_monthly_credits', '5');
```

---

## 5. API 엔드포인트 (16개 신규)

### 5.1 커뮤니티 상호작용

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | /api/explore/portfolio/{pid}/like | requireAuth | 좋아요 토글 |
| GET | /api/explore/portfolio/{pid}/like-count | requireAuth | 좋아요 수 |
| POST | /api/shops/{id}/bookmarks | withShopAuth(owner,admin) | 찜 추가 |
| DELETE | /api/shops/{id}/bookmarks/{bid} | withShopAuth(owner,admin) | 찜 해제 |
| GET | /api/shops/{id}/bookmarks | withShopAuth(owner,admin) | 찜 목록 |

### 5.2 인재풀 서치

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | /api/explore/talent | requireAuth | 인재풀 목록 (open_to_proposals=true, 차단 필터링) |

필터: shop_type, 지역, 경력년수, 키워드

### 5.3 제안 시스템

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | /api/shops/{id}/proposals | withShopAuth(owner,admin) | 제안 보내기 (크레딧 차감) |
| GET | /api/shops/{id}/proposals | withShopAuth(owner,admin) | 발신 제안 목록 |
| GET | /api/me/proposals | requireAuth | 수신 제안 목록 |
| PUT | /api/me/proposals/{pid}/respond | requireAuth | 수락/거절 |
| GET | /api/shops/{id}/proposal-credits | withShopAuth(owner,admin) | 크레딧 잔여 조회 |

### 5.4 제안 수신 설정

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| PUT | /api/me/talent-settings | requireAuth | 제안 수신 ON/OFF, 차단 매장 관리 |
| GET | /api/me/talent-settings | requireAuth | 현재 설정 조회 |

### 5.5 알림

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | /api/me/notifications | requireAuth | 알림 목록 |
| PUT | /api/me/notifications/{nid}/read | requireAuth | 읽음 처리 |
| PUT | /api/me/notifications/read-all | requireAuth | 전체 읽음 |
| GET | /api/me/notifications/unread-count | requireAuth | 읽지 않은 수 |

### 5.6 관리자

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| PUT | /api/admin/proposal-settings | requireAdmin | 크레딧 정책 변경 |
| POST | /api/admin/shops/{id}/credits | requireAdmin | 수동 크레딧 지급 |

---

## 6. 페이지 & UI 구조

### 6.1 기존 페이지 수정

/explore (커뮤니티 피드 확장):
- 각 카드에 좋아요 버튼 + 카운트
- 각 카드에 찜 버튼 (owner/admin만)
- 상단 탭: "포트폴리오" | "인재풀"
- 정렬: 최신순 / 좋아요순

/explore/designer/[memberId] (디자이너 프로필 확장):
- "제안 보내기" 버튼 (owner/admin, 제안 수신 ON인 디자이너만)
- "제안 수신 중" 뱃지

/profile (프로필 설정 확장):
- 제안 수신 ON/OFF 토글
- 차단 매장 관리
- 소속 매장 자동 차단 안내

AppHeader:
- 알림 벨 아이콘 + 미읽은 수 뱃지

### 6.2 신규 페이지

/explore/talent:
- 인재풀 서치 (제안 수신 ON 디자이너만)
- 필터: 분야, 지역, 경력
- 프로필 카드 그리드 (사진, 이름, 전문분야, 경력, 포트폴리오 수)

/proposals:
- 역할별 자동 전환
- 디자이너 뷰: 수신함 (수락/거절 버튼)
- 매장 뷰: 발신함 (상태 표시, 잔여 크레딧)

제안 보내기 모달:
- 필수: 포지션 (선택), 급여 범위 (입력)
- 선택: 복리후생, 매장 소개, 자유 메시지
- 잔여 크레딧 표시 + 차감 안내

---

## 7. 핵심 비즈니스 로직

### 7.1 제안 크레딧 로직

매장 가입 시:
- shop_proposal_credits 자동 생성
- total_credits = app_settings['proposal_initial_credits'] (기본 5)

제안 보내기 시:
- 월 리셋 체크: last_monthly_reset가 이번 달이 아니면 monthly_free 추가
- total_credits >= 1 확인 → 부족 시 문의 전환 모달
- 충분 시: total_credits -= 1, 제안 생성

### 7.2 제안 수명주기

```
pending → accepted (디자이너 수락, 연락처 공개)
        → declined (디자이너 거절)
        → expired (7일 무응답, Cron 처리)
```

크레딧 환불: 없음 (거절/만료 모두)

### 7.3 인재풀 필터링

```
WHERE open_to_proposals = true
  AND NOT (blocked_shop_ids @> ARRAY[조회 매장 ID])
  AND member.shop_id != 조회 매장 ID (소속 매장 자동 차단)
  AND member.is_active = true
  AND is_public = true
```

### 7.4 만료 처리

하이브리드 방식:
1. 조회 시점: expires_at < now()이면 상태를 expired로 업데이트
2. Cron: /api/cron/expire-proposals (매일 1회)

### 7.5 알림 + PWA 푸시

제안 생성 시: notifications INSERT + PWA Push 발송
푸시 구독: 앱 로드 시 권한 요청 → push_subscriptions에 저장

---

## 8. 구현 스코프

### MVP (3개 Phase)

Phase A: 커뮤니티 기반
- DB 마이그레이션 (6개 테이블 + 2개 컬럼)
- 좋아요/찜 API + UI
- /explore 피드 확장
- 알림 시스템 (테이블 + API + 헤더 벨)

Phase B: 인재풀 + 제안
- 제안 수신 설정 (프로필 페이지 확장)
- /explore/talent 인재풀 서치 페이지
- 제안 크레딧 시스템
- 제안 보내기 (모달 + API + 크레딧 차감)
- /proposals 제안 관리 페이지
- 제안 수락/거절 + 연락처 공개
- PWA 푸시 알림

Phase C: 관리자 + 마무리
- super_admin 크레딧 정책 설정
- super_admin 수동 크레딧 지급
- Cron: 만료 제안 처리
- CLAUDE.md / PRD 업데이트

### MVP 제외 (추후)

- 유료 결제 연동
- 카카오 알림톡
- 댓글 기능
- 디자이너 간 메시지
- 제안 이력 분석 대시보드
- AI 인재 추천/매칭

### 예상 규모

- 신규 테이블: 6개
- 신규 API: 16개
- 신규/수정 페이지: ~5개
- 신규 컴포넌트: ~6개
- 총 파일 수: ~27개
