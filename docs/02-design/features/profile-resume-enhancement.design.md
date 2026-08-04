# Design: Profile Resume Enhancement

> PDCA Phase: **Design**
> Feature: `profile-resume-enhancement`
> Created: 2026-02-28
> References: `docs/01-plan/features/profile-resume-enhancement.plan.md`

---

## 1. Data Model

### 1.1 TypeScript Interfaces (`frontend/src/lib/api.ts:223-254`)

```typescript
// === BEFORE ===
export interface CareerEntry {
  company: string;
  role: string;
  start_year: number;
  end_year: number | null;
}
export interface CertificationEntry {
  name: string;
  issuer: string;
  year: number;
}

// === AFTER ===
export interface CareerEntry {
  company: string;
  position: string;         // 드롭다운: POSITION_PRESETS
  start_date: string;       // "2021-03" YYYY-MM
  end_date: string | null;  // null = 재직중
  duties: string;           // 담당업무
}
export interface CertificationEntry {
  name: string;
  issuer: string;
  date: string;             // "2021-03" YYYY-MM
  license_number: string;   // 자격증 번호
}
export interface EducationEntry {
  school: string;
  major: string;
  start_date: string;       // "2018-03" YYYY-MM
  end_date: string | null;  // null = 재학중
  status: string;           // GRADUATION_STATUS
}
export interface MemberProfile {
  // ...existing fields...
  education: EducationEntry[];
  address: string | null;
}
```

### 1.2 DB Migration (`supabase/migrations/026_profile_resume_fields.sql`)

```sql
ALTER TABLE member_profiles ADD COLUMN education JSONB DEFAULT '[]';
ALTER TABLE member_profiles ADD COLUMN address TEXT;
```

### 1.3 Presets (`frontend/src/lib/constants/resume-presets.ts`)

```typescript
export const POSITION_PRESETS = [
  '인턴', '스텝', '디자이너', '수석 디자이너', '실장', '원장', '기타'
] as const;

export const CERT_PRESETS = [
  { name: '미용사(일반)', issuer: '한국산업인력공단' },
  { name: '미용사(피부)', issuer: '한국산업인력공단' },
  { name: '미용사(네일)', issuer: '한국산업인력공단' },
  { name: '미용사(메이크업)', issuer: '한국산업인력공단' },
  { name: '이용사', issuer: '한국산업인력공단' },
] as const;

export const GRADUATION_STATUS = [
  '졸업', '재학중', '졸업예정', '중퇴', '수료'
] as const;
```

### 1.4 Utility Functions (`frontend/src/lib/utils/resume.ts`)

```typescript
// 근무기간 자동 계산
export function calcDuration(start: string, end: string | null): string;

// 주소 마스킹 (시/구까지)
export function maskAddress(addr: string): string;

// 구 형식 → 신 형식 마이그레이션
export function migrateCareerEntry(old: any): CareerEntry;
export function migrateCertEntry(old: any): CertificationEntry;
```

---

## 2. Implementation Order

| # | Task | Files | Dependency |
|---|------|-------|-----------|
| 1 | DB 마이그레이션 | `026_profile_resume_fields.sql` | None |
| 2 | 프리셋 상수 + 유틸 함수 | `resume-presets.ts`, `resume.ts` | None |
| 3 | TypeScript 타입 확장 | `api.ts` | None |
| 4 | API Route 수정 | `profile/route.ts` | #1, #3 |
| 5 | 프로필 편집 페이지 | `profile/page.tsx` | #2, #3 |
| 6 | 공개 프로필 표시 | `explore/designer/[memberId]/page.tsx` | #2, #3 |

---

## 3. UI Wireframe

### 경력사항 카드 (개선 후)
```
┌─────────────────────────────────────────┐
│ 매장명: [_________________________]  [X] │
│ 직급:   [디자이너        ▼]              │
│ 기간:   [2021] [03 ▼] ~ [2023] [06 ▼]  │
│         ☑ 재직중    (자동: 2년 3개월)    │
│ 업무:   [_________________________]      │
└─────────────────────────────────────────┘
```

### 자격증 카드 (개선 후)
```
┌─────────────────────────────────────────┐
│ [미용사(일반) ▼] 또는 직접입력       [X] │
│ 발급기관: [한국산업인력공단] (자동입력)   │
│ 취득일:   [2021] [03 ▼]                 │
│ 자격번호: [_________________________]    │
└─────────────────────────────────────────┘
```

### 학력사항 카드 (신규)
```
┌─────────────────────────────────────────┐
│ 학교:   [_________________________]  [X] │
│ 전공:   [_________________________]      │
│ 기간:   [2018] [03 ▼] ~ [2022] [02 ▼]  │
│ 상태:   [졸업 ▼]                         │
└─────────────────────────────────────────┘
```
