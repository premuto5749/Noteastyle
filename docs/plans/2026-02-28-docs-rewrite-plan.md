# 문서 리라이트 + 비즈니스 로직 재점검 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 3개 핵심 문서(schema.md, CLAUDE.md, PRD.md)를 실제 코드 기준으로 완전히 재작성하면서 비즈니스 로직을 재점검한다.

**Architecture:** schema → CLAUDE → PRD 순서. 기술 문서는 코드가 진실의 원천(18개 테이블, 49개 API, 24개 페이지 기준). PRD는 비전 + Phase 재정의. 각 문서는 독립적으로 커밋.

**Tech Stack:** Markdown, Mermaid 다이어그램 (선택), ASCII 다이어그램

**데이터 소스:** 2026-02-28 코드베이스 전수 분석 결과 (Explore 에이전트 2회 실행)

---

## Task 1: Worktree 생성 및 환경 준비

**Files:**
- Worktree: `../Noteastyle-docs-rewrite`
- Branch: `docs/full-rewrite`

**Step 1: Worktree 생성**
```bash
cd C:/Dev/Noteastyle && git pull
git worktree add ../Noteastyle-docs-rewrite -b docs/full-rewrite
```

**Step 2: .env.local 심링크**
```bash
ln -s C:/Dev/Noteastyle/frontend/.env.local ../Noteastyle-docs-rewrite/frontend/.env.local
```

---

## Task 2: schema.md 완전 재작성

**Files:**
- Rewrite: `docs/schema.md`

**핵심 변경사항:**
- 6개 → 18개 테이블 (+ app_settings)
- `designers` → `shop_members` 교체 반영
- `treatment_photos`에 `annotations`, `deleted_at` 컬럼 추가
- 인증 도메인(user_profiles, member_profiles, user_roles, shop_invitations) 추가
- 예약 도메인(reservations) 추가
- 서비스 메뉴 도메인(shop_service_categories, shop_services) 추가
- AI 도메인(ai_face_models, face_swap_results) 추가
- 시스템 도메인(shop_audit_logs, app_settings) 추가
- 22개 마이그레이션 히스토리 전체 기록
- RPC 함수 6개 (increment_visit_count, seed_default_services, is_shop_member, get_shop_role, is_admin, update_updated_at)

**문서 구조:**
```
1. 개요 (DBMS, PK 규칙, 타임스탬프 정책, soft delete 정책)
2. ER 다이어그램 (4개 도메인: 인증, 매장/고객, 시술/사진, AI)
3. 테이블 상세 (18개)
   3.1  shops
   3.2  shop_members (★ designers 대체)
   3.3  customers
   3.4  treatments (★ member_id로 변경)
   3.5  treatment_photos (★ annotations, deleted_at 추가)
   3.6  portfolios (★ member_id 추가)
   3.7  reservations (★ 신규)
   3.8  user_profiles (★ 신규)
   3.9  member_profiles (★ 신규)
   3.10 user_roles (★ 신규)
   3.11 shop_invitations (★ 신규)
   3.12 ai_face_models (★ 신규)
   3.13 face_swap_results (★ 신규)
   3.14 shop_service_categories (★ 신규)
   3.15 shop_services (★ 신규)
   3.16 shop_audit_logs (★ 신규)
   3.17 app_settings (★ 신규)
4. Helper Functions & RPC (6개)
5. Supabase Storage 구조
6. 마이그레이션 히스토리 (22개)
7. TypeScript 인터페이스 참조
8. 비즈니스 로직 노트 (재점검 결과)
```

**비즈니스 로직 재점검 항목:**
- [ ] designers → shop_members 전환: role 모델(owner/admin/designer/assistant)이 비즈니스 요구를 충족하는가?
- [ ] reservations 상태 머신: scheduled → started → completed → cancelled 흐름이 누락 없는가?
- [ ] soft delete 정책: treatment_photos만 soft delete, 나머지는 hard delete — 일관성 검토
- [ ] JSONB 컬럼 스키마: products_used, tags, career_history 등의 JSON 구조 명시

**Step 1: schema.md 완전 재작성**
- 기존 파일을 읽고, 위 구조로 완전히 새로 작성
- 각 테이블의 컬럼은 Explore 에이전트 결과 + 마이그레이션 SQL에서 추출

**Step 2: 커밋**
```bash
git add docs/schema.md
git commit -m "docs: schema.md 완전 재작성 — 18개 테이블, 22개 마이그레이션 반영"
```

---

## Task 3: CLAUDE.md 완전 재작성

**Files:**
- Rewrite: `CLAUDE.md`

**핵심 변경사항:**
- 아키텍처: 단일 매장 → 멀티테넌트 + Supabase Auth
- 프로젝트 구조: 실제 파일 트리 (contexts/, hooks/, types/, validations/ 포함)
- API 엔드포인트: 17개 → 49개 전체
- 데이터 모델: schema.md 참조로 간략화 (중복 제거)
- 인증 아키텍처 섹션 신규 추가
- 코딩 컨벤션: requireAuth, validateBody, withShopAuth, rate limiting 패턴

**문서 구조:**
```
1. 프로젝트 목표 (기존 유지 — 핵심 가치, 슬로건)
2. 프로젝트 문서 구조 (기존 유지 + 01-plan 추가)
3. 아키텍처 개요 (★ 멀티테넌트 + Auth 반영)
   - 시스템 구성도 (Supabase Auth 추가)
   - 인증 흐름 (로그인 → 매장 선택 → 역할 기반 접근)
   - 시술 기록 데이터 흐름 (예약 기반으로 업데이트)
4. 기술 스택 (★ Zod, rate-limit 추가)
5. 프로젝트 구조 (★ 실제 파일 트리)
6. 데이터 모델 (★ schema.md 참조 + 간략 관계도)
7. API 엔드포인트 명세 (★ 49개 전체, 카테고리별)
   - 인증/사용자 API
   - 매장 관리 API
   - 고객 API
   - 시술 기록 API
   - 예약 API
   - 포트폴리오 API
   - AI 기능 API (face-swap, voice)
   - 서비스 메뉴 API
   - 탐색(Explore) API
   - 관리자 API
   - 시스템 API (health, cron, site-settings)
8. 인증 아키텍처 (★ 신규)
   - withShopAuth: 매장 멤버 인증 (역할 옵션)
   - requireAuth: 세션 인증 (글로벌 API)
   - requireAdmin: 관리자 인증
   - 역할 모델: owner > admin > designer > assistant
9. 핵심 비즈니스 규칙 (★ 예약 기반 흐름 반영)
10. 개발 환경 설정 (★ Auth 환경변수 추가)
11. 코딩 컨벤션 (★ 새 패턴 추가)
12. Git 워크플로우 (기존 유지)
13. 기능 현황 (★ Phase 1 완성 목록 정확 반영)
14. 가격 정책 (기존 유지)
15. 배포 전략 (기존 유지)
```

**비즈니스 로직 재점검 항목:**
- [ ] 시술 기록 입력 흐름: /record 삭제 후 예약→시술 흐름이 "1초 기록" 컨셉을 유지하는가?
- [ ] 에러 응답 포맷: { detail } vs { error } 불일치 — 표준화 필요 여부 플래그
- [ ] withShopAuth vs requireAuth 분리 기준이 명확한가?

**Step 1: CLAUDE.md 완전 재작성**
- 기존 파일을 읽고, 위 구조로 새로 작성
- API 목록은 Explore 에이전트 결과를 기반
- 기존 섹션 중 유지할 부분(목표, 가격, Git 워크플로우) 보존

**Step 2: 커밋**
```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md 완전 재작성 — 멀티테넌트 아키텍처, 49개 API, 인증 체계 반영"
```

---

## Task 4: PRD.md 재작성 + Phase 재정의

**Files:**
- Rewrite: `docs/PRD.md`

**핵심 변경사항:**
- Phase 1: "완성된 기능" 목록으로 정확히 교체 (예약, 인증, 멤버, 서비스 메뉴 등 포함)
- Phase 2: 현실적 다음 목표 재정의
- 사용자 플로우: 예약 기반 + Explore 추가
- 비기능 요구사항: 인증/보안 "구현 완료" 반영
- 사업 로드맵: 2026년 기준 재배치

**문서 구조:**
```
1-4. 제품 개요, 시장 배경, 타깃, AI 비전
     → 대체로 유지 (비전/시장 분석은 유효)
     → 4.2 AI 스타일 노트: "사진 위 어노테이션" 기능 구현됨 반영

5. 기능 요구사항 (★ Phase 재정의)
   5.1 전체 기능 맵 — 카테고리별 기능 수 업데이트
   5.2 Phase 1 Complete (구현 완료):
       - F-001~F-010: 기존 1순위 (Done 유지)
       - F-011, F-012: 예약 입력 + 예약 보드 → Done으로 변경
       - F-017: Supabase Auth 인증/인가 → Done (신규 추가)
       - F-018: 멀티매장 + 역할 기반 접근 → Done (신규 추가)
       - F-019: 매장 멤버 초대 시스템 → Done (신규 추가)
       - F-020: 서비스 메뉴 커스터마이징 → Done (신규 추가)
       - F-021: 사진 어노테이션/스타일 노트 → Done (신규 추가)
       - F-022: 탐색(Explore) 페이지 → Done (신규 추가)
       - F-023: 디자이너 공개 프로필 → Done (신규 추가)
       - F-024: 사진 소프트 삭제 + 휴지통 → Done (신규 추가)
       - F-025: 관리자 패널 → Done (신규 추가)
       - F-026: 사이트 설정 (테마, 브랜딩) → Done (신규 추가)
   5.3 Phase 2 Next (다음 목표):
       - 네이버 예약 실시간 연동
       - Instagram 포트폴리오 연동
       - 자동 모자이크
       - 예약 Drag & Drop
       - 리뷰 게시 동의 + 쿠폰
       - 오프라인 지원 (Service Worker)
       - 에러 응답 표준화
       - 코드 품질 개선 (파일 분리, 중복 제거)
   5.4 Phase 3 — 플랫폼화 (기존 유지)

6. 핵심 사용자 플로우 (★ 업데이트)
   6.1 시술 기록 입력 — 예약 기반 흐름 반영
   6.2 AI 페이스 스왑 — 페이스 모델 라이브러리 + 배치 생성 + 결과 선택 흐름
   6.3 포트폴리오 — Explore 페이지 + 디자이너 프로필 반영
   6.4 매장 온보딩 (★ 신규) — 회원가입 → 매장 생성 → 멤버 초대

7. 비기능 요구사항 (★ 업데이트)
   7.3 인증/보안: "구현 완료" (Supabase Auth + withShopAuth + requireAuth + rate limiting)
   7.4 확장성: "멀티매장 구현 완료" (ShopContext)

8-9. 가격/KPI — 유지

10. 기술 스택 — Zod, rate limiting 추가

11. 사업 로드맵 (★ 2026년 기준 재배치)
    현재: 2026년 2월 (MVP 개발 완료 단계)

12-14. 법적 검토, 마케팅, 사회적 가치 — 유지
```

**비즈니스 로직 재점검 항목:**
- [ ] Phase 2 우선순위: Instagram 연동 vs 네이버 예약 연동 — 사용자에게 확인 필요
- [ ] "빠른 기록" 컨셉: 예약 기반으로 변경된 것이 의도적인가?
- [ ] 사업 로드맵: "2025년 1분기 기획" → 현재 2026년 2월, MVP 거의 완성 — 시점 재조정
- [ ] KPI: MAU 100매장 (1년 내) 목표가 현실적인가?

**Step 1: PRD.md 재작성**
- 섹션 1-4: 기존 내용 대부분 유지, 소소한 업데이트
- 섹션 5: Phase 재정의 (핵심 변경)
- 섹션 6: 사용자 플로우 업데이트
- 섹션 7: 비기능 요구사항 업데이트
- 섹션 11: 사업 로드맵 재배치

**Step 2: 커밋**
```bash
git add docs/PRD.md
git commit -m "docs: PRD.md 재작성 — Phase 재정의, 20+ 완성 기능 반영, 로드맵 현실화"
```

---

## Task 5: 문서 간 일관성 검증 + 정리

**Files:**
- Verify: `CLAUDE.md`, `docs/schema.md`, `docs/PRD.md`
- Cleanup: `docs/plans/2026-02-28-docs-rewrite-design.md` (설계 문서)

**Step 1: Cross-reference 검증**
- schema.md 테이블 목록 ↔ CLAUDE.md 데이터 모델 섹션
- CLAUDE.md API 목록 ↔ PRD.md 기능 목록
- CLAUDE.md 프로젝트 구조 ↔ 실제 파일 시스템

**Step 2: 비즈니스 로직 재점검 결과 요약**
- 발견된 모순/개선점을 각 문서의 해당 섹션에 "🔍 재점검 노트"로 기록

**Step 3: 커밋**
```bash
git add -A
git commit -m "docs: 문서 간 일관성 검증 및 비즈니스 로직 재점검 노트 추가"
```

---

## Task 6: 푸시 + PR + 머지

**Step 1: 푸시**
```bash
git push -u origin docs/full-rewrite
```

**Step 2: PR 생성**
```bash
gh pr create --title "docs: 핵심 문서 전면 재작성 — schema, CLAUDE, PRD" --body "..."
```

**Step 3: 머지 + Worktree 정리**
```bash
gh pr merge --squash --delete-branch
cd C:/Dev/Noteastyle && git worktree remove ../Noteastyle-docs-rewrite && git pull
```
