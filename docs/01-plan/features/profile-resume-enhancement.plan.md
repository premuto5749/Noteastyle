# Plan: Profile Resume Enhancement

> PDCA Phase: **Plan**
> Feature: `profile-resume-enhancement`
> Created: 2026-02-28
> Status: Draft

---

## 1. Background & Motivation

### Problem Statement

현재 프로필 페이지의 경력사항/자격증 폼이 한국 뷰티 업계 이력서 표준에 비해 심각하게 부족함:

- **경력사항**: 연도(year)만 입력 가능 → 월 단위 날짜, 자동 근무기간 계산, 직급 드롭다운, 담당업무 필드 없음
- **자격증**: 이름/기관/연도만 → 자격증 번호, 월 단위 취득일, 미용사 국가자격 프리셋 없음
- **학력사항**: 섹션 자체가 없음 → 이력서 기본 항목
- **주소**: 필드 없음 → 공개 프로필에서 "서울시 강남구"까지만 표시하는 프라이버시 기능 필요

### Impact

| 문제 | 영향도 | 비즈니스 가치 |
|------|--------|-------------|
| 경력 월단위 미지원 | HIGH | 구인구직 매칭 정확도 저하 |
| 자동 근무기간 미계산 | MEDIUM | UX 불편, 수동 계산 필요 |
| 직급 드롭다운 미지원 | MEDIUM | 검색/필터 불가 |
| 학력사항 미지원 | HIGH | 이력서 기본 항목 누락 |
| 주소 미지원 | MEDIUM | 지역 기반 매칭 불가 |

### Research Summary (한국 뷰티 업계 이력서 표준)

**직급 체계**: 인턴 → 스텝 → 디자이너 → 수석 디자이너 → 실장 → 원장
**국가자격증**: 미용사(일반), 미용사(피부), 미용사(네일), 미용사(메이크업), 이용사 — 한국산업인력공단 발급
**주소 표시 관례**: 사람인/잡코리아 등 구인사이트에서 시/구 단위만 공개 표시

---

## 2. Goal

프로필 이력/자격증/학력 폼을 한국 뷰티 업계 이력서 표준에 맞게 확장하여, 디자이너가 전문적인 이력서를 작성할 수 있게 한다.

---

## 3. Scope

### In Scope

| # | 항목 | 설명 |
|---|------|------|
| 1 | CareerEntry 확장 | 월단위 날짜(YYYY-MM), 직급 드롭다운, 담당업무, 자동 근무기간 계산 |
| 2 | CertificationEntry 확장 | 월단위 취득일, 자격증 번호, 국가자격 프리셋 |
| 3 | EducationEntry 신규 | 학교명, 전공, 기간, 졸업상태 |
| 4 | 주소 필드 추가 | 전체 주소 입력, 공개 시 시/구까지만 표시 |
| 5 | 공개 프로필 반영 | explore/designer 페이지에 확장된 필드 표시 |

### Out of Scope

- 수상경력 섹션 (Phase 3 구인구직 기능에서 추가)
- 자기소개서 장문 에디터 (현재 bio 100자로 충분)
- 전문기술 멀티셀렉트 태그 (추후 별도 기능)
- 프로필 PDF 내보내기

---

## 4. Technical Approach

### 4.1 Data Model Changes

**CareerEntry** (기존 4필드 → 5필드):
```typescript
// Before
{ company: string; role: string; start_year: number; end_year: number | null; }

// After
{
  company: string;          // 매장명 (유지)
  position: string;         // 직급 — 드롭다운: 인턴/스텝/디자이너/수석디자이너/실장/원장/기타
  start_date: string;       // "2021-03" (YYYY-MM 형식)
  end_date: string | null;  // "2023-06" | null (재직중)
  duties: string;           // 담당업무 (자유 텍스트)
}
```

**CertificationEntry** (기존 3필드 → 4필드):
```typescript
// Before
{ name: string; issuer: string; year: number; }

// After
{
  name: string;             // 자격증명 (프리셋 + 직접입력)
  issuer: string;           // 발급기관 (프리셋 + 직접입력)
  date: string;             // "2021-03" (YYYY-MM 형식)
  license_number: string;   // 자격증 번호
}
```

**EducationEntry** (신규):
```typescript
{
  school: string;           // 학교명
  major: string;            // 전공/학과
  start_date: string;       // "2018-03" (YYYY-MM)
  end_date: string | null;  // "2022-02" | null (재학중)
  status: string;           // 졸업/재학중/중퇴/수료/졸업예정
}
```

**MemberProfile 확장**:
```typescript
// 추가 필드
education: EducationEntry[];
address: string | null;     // 전체 주소 저장, 표시는 시/구까지
```

### 4.2 DB Migration

JSONB 컬럼이므로 스키마 변경 없이 데이터 구조만 확장. 단, 새 컬럼 추가 필요:
```sql
ALTER TABLE member_profiles ADD COLUMN education JSONB DEFAULT '[]';
ALTER TABLE member_profiles ADD COLUMN address TEXT;
```

### 4.3 Backward Compatibility

기존 JSONB 데이터는 구 형식(start_year/end_year)으로 저장되어 있음.
프론트에서 로드 시 마이그레이션 함수로 변환:
```typescript
function migrateCareerEntry(old: any): CareerEntry {
  if ('start_year' in old) {
    return {
      company: old.company,
      position: old.role || '',
      start_date: `${old.start_year}-01`,
      end_date: old.end_year ? `${old.end_year}-01` : null,
      duties: '',
    };
  }
  return old;
}
```

### 4.4 Duration Auto-Calculation (UI Only)

```typescript
function calcDuration(start: string, end: string | null): string {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end
    ? end.split('-').map(Number)
    : [new Date().getFullYear(), new Date().getMonth() + 1];
  const months = (ey * 12 + em) - (sy * 12 + sm);
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y > 0 && m > 0) return `${y}년 ${m}개월`;
  if (y > 0) return `${y}년`;
  return `${m}개월`;
}
```

### 4.5 Address Privacy

- 입력: 전체 주소 자유 텍스트
- 공개 표시: 정규식으로 시/구 추출 → "서울시 강남구", "경기도 성남시 분당구" 등
```typescript
function maskAddress(addr: string): string {
  // "서울시 강남구 역삼동 123-45" → "서울시 강남구"
  // "경기도 성남시 분당구 ..." → "경기도 성남시 분당구"
  const match = addr.match(/^(.+?[시도])\s+(.+?[시군구])/);
  return match ? `${match[1]} ${match[2]}` : addr.split(' ').slice(0, 2).join(' ');
}
```

### 4.6 Presets (상수 데이터)

**직급 드롭다운**:
```typescript
const POSITION_PRESETS = [
  '인턴', '스텝', '디자이너', '수석 디자이너', '실장', '원장', '기타'
] as const;
```

**국가자격증 프리셋**:
```typescript
const CERT_PRESETS = [
  { name: '미용사(일반)', issuer: '한국산업인력공단' },
  { name: '미용사(피부)', issuer: '한국산업인력공단' },
  { name: '미용사(네일)', issuer: '한국산업인력공단' },
  { name: '미용사(메이크업)', issuer: '한국산업인력공단' },
  { name: '이용사', issuer: '한국산업인력공단' },
] as const;
```

**졸업상태**:
```typescript
const GRADUATION_STATUS = ['졸업', '재학중', '졸업예정', '중퇴', '수료'] as const;
```

---

## 5. Affected Files

| Layer | File | Change |
|-------|------|--------|
| DB | `supabase/migrations/026_profile_resume_fields.sql` | education JSONB + address TEXT 컬럼 추가 |
| Type | `frontend/src/lib/api.ts:223-254` | CareerEntry, CertificationEntry 확장 + EducationEntry 추가 + MemberProfile 확장 |
| UI | `frontend/src/app/profile/page.tsx` | 경력/자격증/학력/주소 폼 전면 개편 |
| API | `frontend/src/app/api/shops/[shopId]/members/[memberId]/profile/route.ts` | education, address 필드 처리 추가 |
| Display | `frontend/src/app/explore/designer/[memberId]/page.tsx` | 확장된 필드 표시 + 주소 마스킹 |
| Const | `frontend/src/lib/constants/resume-presets.ts` (신규) | 직급/자격증/졸업상태 프리셋 상수 |

---

## 6. Risk & Mitigation

| Risk | Level | Mitigation |
|------|-------|-----------|
| 기존 JSONB 데이터 호환 | MEDIUM | 프론트 마이그레이션 함수로 구 형식 자동 변환 |
| 주소 정규식 파싱 실패 | LOW | fallback으로 처음 2단어만 표시 |
| 프리셋 외 직급/자격증 | LOW | "기타" + 직접입력 옵션 제공 |

---

## 7. Success Criteria

- [ ] 경력사항에서 월 단위 입력 (YYYY-MM) 가능
- [ ] 근무기간 자동 계산 표시 ("2년 3개월")
- [ ] 직급 드롭다운 선택 가능 (인턴~원장 + 기타)
- [ ] 담당업무 텍스트 입력 가능
- [ ] 자격증 번호 입력 가능
- [ ] 자격증 취득일 월 단위 입력 가능
- [ ] 국가자격증 프리셋 선택 시 자격증명+발급기관 자동 입력
- [ ] 학력사항 섹션 추가 (학교, 전공, 기간, 졸업상태)
- [ ] 주소 입력 가능, 공개 프로필에서 시/구까지만 표시
- [ ] 기존 데이터 하위 호환성 유지
- [ ] 빌드 성공 (npx next build)
