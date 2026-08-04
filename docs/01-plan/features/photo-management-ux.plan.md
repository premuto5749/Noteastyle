# photo-management-ux Planning Document

> **Summary**: 시술 사진 관리 UX 개선 -- FaceSwap 이중 대기 제거, 업로드 병렬화, 갤러리 선택, 캐러셀 퀵 액션, 종횡비 버그 수정
>
> **Project**: Note-a-Style
> **Author**: Claude (Opus)
> **Date**: 2026-03-06
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

시술 사진 촬영-업로드-편집-AI 가공의 전체 흐름에서 발견된 성능 병목과 UX 비효율을 해결한다.
P0(버그/성능)과 P1(UX 개선)을 묶어 한 번에 처리하여 사진 관리 워크플로우의 체감 속도와 편의성을 크게 높인다.

### 1.2 Background

코드 분석 결과 다음 문제들이 확인됨:

1. **FaceSwap 이중 대기**: 서버가 `fal.subscribe`로 완료까지 블로킹(10-30초) 후 결과를 반환하지만, 클라이언트 타입에 `url` 필드가 누락되어 완료된 결과를 다시 5초 간격으로 폴링 → 불필요한 10-30초 추가 대기
2. **순차 업로드**: 사진 5장 업로드 시 `for` 루프로 순차 처리 → 5배 느림
3. **카메라 강제**: `NativeCapture`의 `capture="environment"` 속성이 갤러리 선택을 차단하고 `multiple` 미지원
4. **캐러셀 → 액션까지 3탭**: 사진 보기 → 스크롤 아래 → 액션 메뉴 버튼 → 메뉴 열기
5. **4:3 하드코딩**: `PhotoAnnotationEditor`가 모든 사진을 4:3으로 렌더링 → 다른 종횡비 사진에서 어노테이션 좌표 어긋남

### 1.3 Related Documents

- 코드 분석: 이전 세션의 딥 리서치 결과 (7개 컴포넌트, 3개 API 라우트 분석)
- CLAUDE.md: 섹션 9.C (사진 관리), 섹션 9.D (페이스 스왑)

---

## 2. Scope

### 2.1 In Scope

- [x] FR-01: FaceSwap 타입 수정 + 클라이언트 폴링 제거
- [x] FR-02: 사진 업로드 `Promise.allSettled` 병렬화 + 개별 실패 표시
- [x] FR-03: NativeCapture 갤러리 버튼 + `multiple` 지원
- [x] FR-04: 캐러셀 하단 퀵 액션 바 (핀/AI/모자이크/포트폴리오)
- [x] FR-05: PhotoAnnotationEditor + DrawingCanvas 실제 종횡비 적용

### 2.2 Out of Scope

- react-konva → Canvas API 전환 (P2, 별도 PDCA)
- 시술 상세 페이지 13-useState 리팩토링 (P2)
- MosaicEditor 성능 최적화 (P2)
- StyleNoteOverlay 6개 슬롯 제한 해제 (P2)
- 오프라인 업로드 큐 (Phase 2 로드맵)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Difficulty | Status |
|----|-------------|----------|------------|--------|
| FR-01 | FaceSwap 이중 대기 제거: `FaceSwapGenerateResult.jobs`에 `url` 필드 추가, 클라이언트에서 `url` 있으면 폴링 스킵 | P0 | Low | Pending |
| FR-02 | 사진 업로드 병렬화: `Promise.allSettled`로 동시 업로드, 개별 진행률 표시, 실패 항목 재시도 UI | P0 | Low | Pending |
| FR-03 | 갤러리 선택 지원: `capture` 속성 분리 (카메라 버튼 / 갤러리 버튼), `multiple` 속성 추가 | P1 | Medium | Pending |
| FR-04 | 캐러셀 퀵 액션 바: 현재 활성 사진에 대해 핀/AI/모자이크/포트폴리오 아이콘을 캐러셀 아래에 표시 | P1 | Medium | Pending |
| FR-05 | 종횡비 버그 수정: `getImageDimensions`에서 실제 이미지 비율 사용, DrawingCanvas Stage 리사이즈 대응 | P1 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | FaceSwap 체감 대기 시간 50% 이상 단축 (폴링 제거) | 브라우저 Network 탭 비교 |
| Performance | 5장 업로드 시간 60% 이상 단축 (순차→병렬) | 스톱워치 측정 |
| UX | 사진 → 액션 도달 탭 수 3→1 | 유저 테스트 |
| Compatibility | 4:3 외 종횡비 (16:9, 1:1) 어노테이션 정확도 | 다양한 이미지로 핀 위치 비교 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 모든 FR 구현 완료
- [ ] `npm run build` 성공 (타입 에러 없음)
- [ ] FaceSwap: generate 후 즉시 결과 표시 (폴링 API 호출 0건)
- [ ] 업로드: 3장 이상 병렬 업로드 확인, 1장 실패해도 나머지 성공
- [ ] 갤러리: iOS/Android에서 갤러리 선택 + 다중 선택 가능
- [ ] 캐러셀: 슬라이드 시 퀵 액션 바가 현재 사진에 맞게 업데이트
- [ ] 어노테이션: 16:9 사진에서 핀 위치가 정확하게 표시

### 4.2 Quality Criteria

- [ ] 빌드 성공 (`npm run build`)
- [ ] Lint 에러 없음 (`npm run lint`)
- [ ] 기존 기능 회귀 없음 (시술 상세 페이지 전체 흐름)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| `fal.subscribe` 동작 변경 (미래 fal.ai 버전) | Medium | Low | 서버 응답에 `url` 있으면 즉시 사용, 없으면 기존 폴링 폴백 유지 |
| 병렬 업로드로 Supabase Storage rate limit 도달 | Medium | Low | 동시 업로드 수 3개로 제한 (concurrency limiter) |
| `capture` 속성 제거 시 일부 모바일 브라우저 동작 차이 | Low | Medium | 카메라/갤러리 버튼 분리로 각각 명시적 제어 |
| DrawingCanvas Konva Stage 리사이즈 시 기존 드로잉 데이터 깨짐 | High | Low | 좌표가 이미 퍼센트 기반이므로 리사이즈 안전, 테스트로 확인 |

---

## 6. Architecture Considerations

### 6.1 Project Level

기존 프로젝트: **Enterprise** (멀티테넌트 SaaS, Next.js 15 + Supabase)

### 6.2 Key Architectural Decisions

| Decision | Current | Change | Rationale |
|----------|---------|--------|-----------|
| FaceSwap 통신 | 서버 블로킹 + 클라이언트 폴링 | 서버 블로킹만 (타입 수정) | 불필요한 이중 대기 제거 |
| 업로드 패턴 | 순차 for-await | `Promise.allSettled` + 동시 3개 | 체감 속도 향상 |
| NativeCapture | 단일 input (capture 강제) | 카메라/갤러리 input 분리 | 사용자 선택권 보장 |
| 캐러셀 액션 | 별도 ActionModal (스크롤 아래) | 캐러셀 하단 인라인 아이콘 바 | 탭 수 감소 |
| 이미지 비율 | 하드코딩 4:3 | `naturalWidth/naturalHeight` 계산 | 정확한 어노테이션 |

### 6.3 수정 대상 파일

```
P0 (버그/성능):
  frontend/src/lib/api.ts                          # FaceSwapGenerateResult 타입에 url 추가
  frontend/src/components/FaceSwapFlow.tsx          # url 있으면 폴링 스킵
  frontend/src/app/treatments/[id]/capture/page.tsx # 업로드 병렬화

P1 (UX 개선):
  frontend/src/components/NativeCapture.tsx         # 갤러리 버튼 + multiple
  frontend/src/app/treatments/[id]/page.tsx         # 캐러셀 퀵 액션 바 연결
  frontend/src/components/PhotoCarousel.tsx         # 퀵 액션 바 슬롯 추가
  frontend/src/components/PhotoAnnotationEditor.tsx # getImageDimensions 수정
  frontend/src/components/DrawingCanvas.tsx         # Stage 사이즈 동적 계산
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section (Section 11)
- [x] ESLint configuration
- [x] TypeScript configuration (`tsconfig.json`)
- [x] Tailwind CSS v4

### 7.2 No New Conventions Needed

이번 작업은 기존 코드 패턴 내에서 수정. 새 컨벤션 불필요.

### 7.3 No New Environment Variables Needed

기존 환경변수만 사용 (REPLICATE_API_TOKEN 등).

---

## 8. Implementation Order

| Order | FR | Task | Est. Lines Changed | Dependencies |
|:-----:|-----|------|:-----------------:|:------------:|
| 1 | FR-01 | `api.ts` 타입 수정 + `FaceSwapFlow.tsx` 폴링 로직 수정 | ~20 | None |
| 2 | FR-05 | `PhotoAnnotationEditor` + `DrawingCanvas` 종횡비 수정 | ~30 | None |
| 3 | FR-02 | `capture/page.tsx` 업로드 병렬화 | ~40 | None |
| 4 | FR-03 | `NativeCapture.tsx` 갤러리/카메라 분리 + multiple | ~50 | FR-02 |
| 5 | FR-04 | `PhotoCarousel` 퀵 액션 바 + `[id]/page.tsx` 연결 | ~60 | None |

---

## 9. Next Steps

1. [ ] Write design document (`photo-management-ux.design.md`)
2. [ ] Review and approval
3. [ ] Start implementation

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-06 | Initial draft | Claude (Opus) |
