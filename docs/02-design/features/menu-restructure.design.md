# Design: Menu Restructure

> PDCA Phase: **Design**
> Feature: `menu-restructure`
> Created: 2026-03-07
> Plan: `docs/01-plan/features/menu-restructure.plan.md`
> Status: Draft

---

## 1. Overview

뷰티샵 워크플로우에 최적화된 메뉴 구조로 재설계.
하단 탭, 상단 헤더, 사이드바를 통일된 패턴으로 정리.

**핵심 변경**:
- 하단 탭: `홈 | 예약 | + | 고객 | 갤러리`
- 상단 헤더: 인스타그램 스타일 (매장명 + 햄버거)로 통일
- "+" FAB: 빠른 액션 바텀 시트
- 사이드바: 포트폴리오/작업/매장관리/설정 4개 대구분

---

## 2. Functional Requirements

### FR-01: 하단 탭 재구성 (BottomNav.tsx)

**현재**: `고객 | 탐색 | 홈 | 작업 | 포트폴리오`
**변경**: `홈 | 예약 | + | 고객 | 갤러리`

| 위치 | label | href | icon |
|------|-------|------|------|
| 1 | 홈 | / | HomeIcon (현행) |
| 2 | 예약 | /tasks | CalendarIcon (현행 TaskIcon) |
| 3 | + | (없음 — 액션 시트 트리거) | PlusIcon (원형 강조) |
| 4 | 고객 | /customers | CustomerIcon (현행) |
| 5 | 갤러리 | /portfolio | PortfolioIcon (현행) |

#### Acceptance Criteria

- [ ] AC-01-1: 5개 탭이 `홈, 예약, +, 고객, 갤러리` 순서로 표시
- [ ] AC-01-2: "+" 탭은 페이지 이동 없이 QuickActionSheet를 열어야 함
- [ ] AC-01-3: "+" 탭 아이콘은 다른 탭과 구별되게 원형 bg-accent 배경 + 흰색 + 아이콘
- [ ] AC-01-4: 활성 탭 표시(상단 dot + accent 색상)는 홈/예약/고객/갤러리에만 적용 ("+"는 active 상태 없음)
- [ ] AC-01-5: "예약" 탭은 /tasks 경로로 이동 (기존 "작업" 탭과 동일 경로)
- [ ] AC-01-6: "갤러리" 탭은 /portfolio 경로로 이동 (기존 "포트폴리오" 탭과 동일 경로)
- [ ] AC-01-7: 로그인/온보딩/관리자 페이지에서는 하단 탭 숨김 (현행 유지)

### FR-02: QuickActionSheet 컴포넌트 (신규)

"+" 버튼 클릭 시 바텀 시트로 올라오는 빠른 액션 메뉴.

| 액션 | 아이콘 | 설명 | 이동 경로 |
|------|--------|------|----------|
| 예약 등록 | CalendarPlus | 새 예약 생성 | /reservation |
| 시술 기록 | FileText | 새 시술 기록 생성 | /treatments/new |
| 고객 등록 | UserPlus | 새 고객 추가 | /customers?add=true |

#### Acceptance Criteria

- [ ] AC-02-1: "+" 버튼 클릭 시 반투명 backdrop과 함께 바텀 시트가 올라옴 (300ms 애니메이션)
- [ ] AC-02-2: 3개 액션 버튼이 세로로 나열 (아이콘 + 레이블 + 설명 텍스트)
- [ ] AC-02-3: backdrop 클릭 시 시트 닫힘
- [ ] AC-02-4: 액션 클릭 시 해당 경로로 router.push 후 시트 자동 닫힘
- [ ] AC-02-5: 시트 열린 상태에서 body 스크롤 잠김
- [ ] AC-02-6: 고객 등록 클릭 시 /customers?add=true로 이동 (기존 고객 페이지의 추가 모달 활용)

### FR-03: 상단 헤더 통일 (AppHeader.tsx)

**현재**: 메인 5개 페이지에서만 AppHeader 표시, 나머지 페이지는 자체 헤더
**변경**: 메인 탭 4개 페이지(/, /tasks, /customers, /portfolio)에서 AppHeader 표시

**문제 해결**: /customers, /portfolio 페이지가 AppHeader + 자체 sticky header로 **이중 헤더** 발생 중

#### Acceptance Criteria

- [ ] AC-03-1: MAIN_PAGES를 `["/", "/tasks", "/customers", "/portfolio"]`로 변경 ("/explore" 제거)
- [ ] AC-03-2: /customers 페이지의 자체 sticky header 제거 → AppHeader 사용
- [ ] AC-03-3: /portfolio 페이지의 자체 sticky header 제거 → AppHeader 사용
- [ ] AC-03-4: /treatments 페이지는 자체 header 유지 (메인 탭이 아니므로)
- [ ] AC-03-5: 각 페이지의 제목과 액션 버튼은 AppHeader 아래에 인라인으로 배치
- [ ] AC-03-6: 헤더 높이는 h-12 (48px)로 모든 페이지에서 동일

### FR-04: 사이드바 메뉴 재구성 (SidebarDrawer.tsx)

4개 대구분으로 전체 메뉴 재배치:

```
포트폴리오
  탐색 (Explore)        → /explore
  포트폴리오 갤러리     → /portfolio
  이력서 관리           → /profile

작업 메뉴
  홈 (대시보드)         → /
  예약 보드             → /tasks
  예약 등록             → /reservation
  고객 목록             → /customers
  시술 기록 목록        → /treatments
  새 시술 기록          → /treatments/new
  전체 예약 목록        → /tasks/all

매장 관리
  매장 설정             → /settings/shop
  시술 메뉴 관리        → /settings/services
  휴지통                → /trash

설정
  테마 (시스템/라이트/다크) — 인라인 토글
  관리자 설정 (admin only) → /admin

로그아웃 | v0.1.0
```

#### Acceptance Criteria

- [ ] AC-04-1: "포트폴리오" 대구분이 최상단에 위치하고, 탐색/포트폴리오 갤러리/이력서 관리 3개 메뉴 포함
- [ ] AC-04-2: "작업 메뉴" 대구분에 홈/예약보드/예약등록/고객목록/시술기록목록/새시술기록/전체예약목록 7개 메뉴 포함
- [ ] AC-04-3: "매장 관리" 대구분에 매장설정/시술메뉴관리/휴지통 3개 메뉴 포함
- [ ] AC-04-4: "설정" 대구분에 테마 토글과 관리자 설정 포함
- [ ] AC-04-5: 관리자 설정은 isAdmin인 경우에만 표시 (현행 유지)
- [ ] AC-04-6: 현재 페이지와 일치하는 메뉴 항목이 accent 색상으로 하이라이트
- [ ] AC-04-7: 매장 전환 셀렉트, 사용자 이메일 표시, 로그아웃 버튼은 현행 유지

### FR-05: 페이지별 헤더 통일

AppHeader가 표시되는 메인 페이지에서 자체 sticky header를 제거하고,
페이지 제목/부제/액션 버튼은 AppHeader 아래 첫 번째 섹션으로 이동.

#### /customers 변경

```
Before:
  [AppHeader: 매장명 | ☰]
  [자체 Header: "고객 관리" | + 추가]  ← 이중 헤더!
  [검색바]
  [고객 목록]

After:
  [AppHeader: 매장명 | ☰]
  [페이지 제목 섹션: "고객 관리" 42명 | + 추가]  ← 비sticky, 인라인
  [검색바]
  [고객 목록]
```

#### /portfolio 변경

```
Before:
  [AppHeader: 매장명 | ☰]
  [자체 Header: "포트폴리오" | 내 프로필]  ← 이중 헤더!
  [필터]
  [갤러리 그리드]

After:
  [AppHeader: 매장명 | ☰]
  [페이지 제목 섹션: "갤러리" | 내 프로필]  ← 비sticky, 인라인
  [필터]
  [갤러리 그리드]
```

#### /tasks 변경 (네이밍만)

- 페이지 내 "작업" 텍스트가 있으면 "예약"으로 변경

#### Acceptance Criteria

- [ ] AC-05-1: /customers에서 이중 헤더가 사라지고 AppHeader 1개만 sticky
- [ ] AC-05-2: /portfolio에서 이중 헤더가 사라지고 AppHeader 1개만 sticky
- [ ] AC-05-3: 각 페이지의 제목/액션 버튼은 스크롤 시 함께 올라감 (non-sticky)
- [ ] AC-05-4: /customers의 검색바는 sticky 유지 가능 (top은 AppHeader 높이 이후부터)
- [ ] AC-05-5: /treatments는 변경하지 않음 (메인 탭이 아닌 독립 페이지)

---

## 3. Component Specifications

### 3-1. QuickActionSheet 컴포넌트

```typescript
// components/QuickActionSheet.tsx
interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

// 상태 관리: BottomNav 내부 useState 또는 별도 Context
// 애니메이션: translate-y + opacity transition (300ms ease-in-out)
// z-index: z-50 (BottomNav와 동일 레벨)
```

**레이아웃**:
```
┌──────────────────────────┐
│                          │ ← backdrop (bg-black/40)
│                          │
│  ┌────────────────────┐  │
│  │  빠른 등록          │  │ ← 시트 타이틀
│  │                    │  │
│  │  📅 예약 등록      │  │
│  │  새 예약을 생성합니다 │  │
│  │                    │  │
│  │  📝 시술 기록      │  │
│  │  시술 내용을 기록합니다│  │
│  │                    │  │
│  │  👤 고객 등록      │  │
│  │  새 고객을 추가합니다 │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │      취소           │  │
│  └────────────────────┘  │
│ [BottomNav]              │
└──────────────────────────┘
```

### 3-2. BottomNav "+" 버튼 스타일

```
일반 탭:          "+" 탭:
┌───┐            ┌─────┐
│ 🏠 │            │ ╋  │ ← w-12 h-12 rounded-full
│ 홈  │            │     │    bg-accent text-white
└───┘            └─────┘    shadow-lg
                             -mt-3 (약간 위로 올림)
```

---

## 4. Data Flow

```
사용자 "+" 탭 클릭
  └→ BottomNav에서 setQuickActionOpen(true)
      └→ QuickActionSheet 렌더 (isOpen=true)
          └→ 액션 선택 시: router.push(href) + onClose()
          └→ backdrop 클릭: onClose()
```

```
AppHeader 표시 로직:
  pathname ∈ ["/", "/tasks", "/customers", "/portfolio"] && currentShop 존재
    → AppHeader 렌더
  그 외
    → null (각 페이지가 자체 헤더 관리)
```

---

## 5. Implementation Order

| # | 작업 | 파일 | 의존성 |
|---|------|------|--------|
| 1 | QuickActionSheet 컴포넌트 생성 | components/QuickActionSheet.tsx | 없음 |
| 2 | BottomNav 탭 재구성 + "+" 통합 | components/BottomNav.tsx | #1 |
| 3 | AppHeader MAIN_PAGES 수정 | components/AppHeader.tsx | 없음 |
| 4 | SidebarDrawer 메뉴 재구성 | components/SidebarDrawer.tsx | 없음 |
| 5 | /customers 이중 헤더 제거 | app/customers/page.tsx | #3 |
| 6 | /portfolio 이중 헤더 제거 + 리네이밍 | app/portfolio/page.tsx | #3 |
| 7 | 빌드 검증 | - | #1~#6 |

---

## 6. Non-Functional Requirements

- 애니메이션 성능: CSS transition만 사용 (JS 애니메이션 X)
- 접근성: 모든 버튼에 aria-label, 포커스 트랩 (QuickActionSheet)
- 기존 라우팅 유지: URL 경로는 변경하지 않음 (네이밍만 변경)
