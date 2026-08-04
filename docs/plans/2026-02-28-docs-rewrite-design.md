# Design: 문서 리라이트 + 비즈니스 로직 재점검

> Date: 2026-02-28
> Approach: 하이브리드 (코드 기준 + 비전 보완)
> Scope: schema.md, CLAUDE.md, PRD.md 전체 리라이트

---

## 배경

Gap 분석 결과 (2026-02-27) 전체 문서 일치율 68%. 구현이 문서보다 훨씬 앞서있음:
- DB: 6개 테이블 문서화 / 실제 15개
- API: 17개 문서화 / 실제 ~50개
- 아키텍처: 단일 매장 MVP 문서화 / 실제 멀티테넌트 인증 시스템
- PRD Phase: 예약 시스템 "Planned" / 실제 완전 구현

## 접근 방식

schema.md → CLAUDE.md → PRD.md 순서.
기술 문서(schema, CLAUDE)는 코드가 진실의 원천. PRD는 비전 + 재설계 관점.

---

## 1. schema.md 리라이트

### 목표
실제 DB + 코드에서 참조하는 모든 테이블을 빠짐없이 문서화.

### 구조
1. 개요 (DBMS, 키 규칙, 타임스탬프 정책)
2. ER 다이어그램 — 15개 테이블 관계도 (인증/매장/시술/AI 4개 도메인)
3. 핵심 테이블 상세 (shops, shop_members, customers, treatments, treatment_photos, portfolios)
4. 인증 테이블 (user_profiles, member_profiles)
5. 기능 테이블 (reservations, ai_face_models, face_swap_results, service_categories, shop_services)
6. 시스템 테이블 (shop_audit_logs)
7. Helper Functions
8. Storage 구조
9. 마이그레이션 히스토리
10. TypeScript 인터페이스 (참조)

### 비즈니스 로직 재점검
- designers → shop_members 전환의 역할 모델 검증
- reservations 상태 머신 문서화
- soft delete 정책 일관성

---

## 2. CLAUDE.md 리라이트

### 목표
Claude Code가 이 파일만 읽고 프로젝트를 정확히 이해하고 개발 가능해야 함.

### 구조
1. 프로젝트 목표 (핵심 가치 유지, 슬로건 유지)
2. 문서 구조 (핵심 문서 테이블)
3. 아키텍처 개요 — 멀티테넌트 + Supabase Auth 반영
4. 기술 스택 — Zod, rate limiting 등 추가
5. 프로젝트 구조 — 실제 파일 트리 (contexts/, hooks/, types/ 포함)
6. 데이터 모델 — schema.md 참조 + 간략 관계도
7. API 엔드포인트 명세 — ~50개 전체 (카테고리별)
8. 인증 아키텍처 — withShopAuth, requireAuth, 역할 모델
9. 핵심 비즈니스 규칙 — 예약 기반 시술 흐름 반영
10. 개발 환경 설정 — Supabase Auth 포함
11. 코딩 컨벤션 — 새 패턴 문서화
12. Git 워크플로우 (기존 유지)
13. MVP 기능 현황 — 완성/미완성 정확 반영
14. 가격 정책 (기존 유지)
15. 배포 전략 (기존 유지)

### 비즈니스 로직 재점검
- 시술 기록 입력 흐름 (예약 기반으로 변경된 부분 문서화)
- 인증 전략 일관성 (withShopAuth vs requireAuth)
- 에러 응답 포맷 불일치 플래그

---

## 3. PRD.md 리라이트

### 목표
Phase를 현실에 맞게 재정의. 다음 목표를 명확히.

### 구조
1-4. 제품 개요, 시장 배경, 타깃, AI 비전 — 대체로 유지
5. 기능 요구사항:
   - Phase 1 Complete: 실제 완성 기능 (인증, 예약, 멤버, 서비스 메뉴 등 포함)
   - Phase 2 Next: 현실적 다음 목표 재정의
   - Phase 3: 플랫폼화 (기존 유지)
6. 사용자 플로우 — 예약 기반 + Explore 추가
7. 비기능 요구사항 — 인증/보안 "구현 완료" 반영
8-9. 가격/KPI — 유지
10. 기술 스택 — 최신 반영
11. 사업 로드맵 — 2026년 기준 재배치
12-14. 법적 검토, 마케팅, 사회적 가치 — 유지

### 비즈니스 로직 재점검
- Phase 2 우선순위: Instagram 연동 vs 네이버 예약 실시간 연동 vs 오프라인 지원
- "빠른 기록" 컨셉 변화 (독립 → 예약 기반)
- 사업 로드맵 시점 현실화

---

## 작업 순서

1. 코드베이스 전수 분석 (실제 테이블, API, 컴포넌트 추출)
2. schema.md 리라이트
3. CLAUDE.md 리라이트
4. PRD.md 리라이트
5. 빌드 검증 (문서 내 코드 경로가 실제와 일치하는지)
6. 커밋 + PR + 머지
