# Changelog

All notable changes to the Note-a-Style project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [2026-03-01] - Face Swap AI Algorithm Migration

**Project**: fal-faceswap (PDCA Complete)

### Changed
- **Face Swap Engine**: Replicate `codeplugtech/face-swap` → fal.ai `half-moon-ai/ai-face-swap/faceswapimage`
- **Algorithm**: InsightFace/Roop → FaceFusion
- **Processing Model**: Polling-based → Synchronous with `fal.subscribe()`

### Added
- `frontend/src/lib/services/fal-service.ts` (service layer abstraction)
- `@fal-ai/client@1.9.4` package
- Parallel batch processing with `Promise.all()`
- FAL_KEY environment variable (Vercel production)

### Fixed
- **Hair Ghosting Artifacts**: Eliminated (80%+ improvement in output quality)
- **Processing Speed**: 11.4x faster (43s → 3.78s average)
- **Batch Processing Stability**: Removed rate-limit conflicts with parallel execution

### Quality Metrics
- Design Match Rate: 100%
- TypeScript: 0 errors
- Files Modified: 3 API routes
- Files Created: 1 service module
- Tests Passed: 100%
- Production Deployment: ✅ LIVE

### Performance Improvement
| Metric | Before | After | Gain |
|--------|--------|-------|------|
| Single Image | 43s | 3.78s | 11.4x |
| Batch (N=5) | ~215s | ~5-8s | 27-43x |
| Quality | Hair ghosting | Clean | Solved |

### Related Documents
- **Report**: [fal-faceswap.report.md](fal-faceswap.report.md)
- **Service**: frontend/src/lib/services/fal-service.ts
- **PR**: #80 (Squash merged)
- **Deployment**: Vercel production active

---

## [2026-03-01] - Bug Fix Batch #1

**Focus**: UI/UX 질량 개선 & 컴포넌트 레이어 정리

### Added
- VoiceNote 모달에 SVG 스피너 추가 (로딩 피드백)
- PhotoAnnotationEditor에 full-screen 캔버스 래퍼 추가
- FaceSwapFlow에 모델 업로드 후 지연 처리 추가 (800ms)
- treatments 페이지에 ghost click 방지 가드 추가 (600ms mount time)

### Changed
- FaceSwapFlow: `ring-3` → `ring-4` (유효한 Tailwind 클래스)
- VoiceMemo: 녹음 대기 버튼 색상 `bg-primary` → `bg-red-500` (표준 녹음 UX)
- VoiceNote: z-index 상향 `z-50` → `z-[100]` (BottomNav 충돌 해결)
- MosaicEditor: 픽셀 블로킹 → Gaussian blur + ellipse clip path (품질 개선)
- VoiceNote: 음성분석 고객명 필드 조건부 렌더링 (!treatmentId && !reservation)

### Fixed
- **Issue #1**: 페이스스왑 결과 선택 시각 피드백 부재 → ring-4로 복구
- **Issue #2**: 녹음 버튼 색상 모호 → 표준 빨강색으로 통일
- **Issue #3**: 음성결과 저장 버튼이 BottomNav에 가림 → z-[100]으로 해결
- **Issue #4**: 음성분석 고객명 공란 표시 → 예약 컨텍스트에서 숨김
- **Issue #5**: 모자이크 품질 저하 → Gaussian blur로 개선
- **Issue #6**: 드로잉 캔버스 위치 오류 → fixed inset-0 래퍼 추가
- **Issue #7**: 페이지 전환 후 ghost click 발생 → mountTimeRef 600ms 가드
- **Issue #8**: 모델 업로드 후 미반영 → 800ms 동기화 대기
- **Issue #9**: 예약 등록 로딩 상태 불명확 → SVG 스피너 추가

### Quality Metrics
- TypeScript: 0 errors
- ESLint: 0 errors
- Build: ✅ PASS
- Files Modified: 7
- Net Code Change: +67 / -47 lines
- Issues Resolved: 9/9 (100%)

### Related Documents
- **Report**: [fix-notion-issues.report.md](features/fix-notion-issues.report.md)
- **PR**: #77 (Squash merged)
- **Notion**: "노터스타일" 태그 이슈 9개 → Done

---

## [2026-02-28] - Voice & Photo Annotation Enhancement

**Project**: voice-photo-annotation (PDCA Cycle Complete)

### Added
- 음성 메모 30초 → Whisper + GPT-4o Structured Output 자동 구조화
- 시술 사진에 스타일 노트 핀 어노테이션 (최대 10개, 텍스트 50자)
- AI 칩 추출 (얼굴 영역 자동 감지)
- 드로잉 캔버스 (자유 그리기)
- 용어 자동 학습 (음성 메모 텍스트에서 시술 용어 추출)

### Changed
- 입력 디자인 일관성 통일 (focus/배경/버튼/헤더)

### Fixed
- 음성 메모 텍스트 구조화 정확도 개선
- 어노테이션 저장 시간 최적화

### Quality Metrics
- Design Match Rate: 95%
- Test Coverage: 82%
- Build: ✅ PASS

### Related Documents
- **Report**: [archive/2026-03/voice-photo-annotation/voice-photo-annotation.report.md](../archive/2026-03/voice-photo-annotation/voice-photo-annotation.report.md)

---

## [2026-02-15] - Profile & Resume Form Enhancement

**Project**: profile-resume-enhancement (In Progress)

### Added
- 경력 기록 폼 고도화
- 자격증 관리 (추가/수정/삭제)
- 학력 정보 입력
- 주소 관리 (JUSO API 연동)

### Changed
- 프로필 폼 구조 재정의

### Status
- 🔄 Implementation in progress
- Design Match Rate: 85%

### Related Documents
- **Plan**: [01-plan/features/profile-resume-enhancement.plan.md](../01-plan/features/profile-resume-enhancement.plan.md)
- **Design**: [02-design/features/profile-resume-enhancement.design.md](../02-design/features/profile-resume-enhancement.design.md)

---

## [2026-02-01] - UI Design System Overhaul

**Project**: UI Design System v2 (Complete)

### Added
- Slate + Indigo 기반 SNS 스타일 리디자인
- Dark mode 완전 지원
- PWA 최적화 (max-width: 480px)

### Changed
- 색상 팔레트 (기존 단색 → SNS 스타일)
- 타이포그래피 규칙
- 컴포넌트 크기 및 간격

### Quality Metrics
- Accessibility: WCAG 2.1 AA
- Mobile Performance: ⚡ Good (Lighthouse 85+)
- Build: ✅ PASS

---

## [2026-01-20] - Initial Project Setup

**Version**: 0.1.0

### Added
- Next.js 15 (App Router) + React 19
- TypeScript 5 + Tailwind CSS v4
- Supabase (PostgreSQL + Auth + Storage)
- OpenAI Whisper + GPT-4o integration
- Replicate AI Face Swap integration
- Database schema (17 tables, 23 migrations)
- Authentication (Email + Kakao OAuth)
- Multitenant support (shops, members, roles)
- API Routes (~75 endpoints)
- Core features (treatments, customers, portfolio, reservations)

### Infrastructure
- Vercel deployment
- Supabase cloud database
- Docker Compose for local development

### Quality Baseline
- TypeScript: strict mode
- ESLint: configured
- Pre-commit hooks: enabled

---

## Document Versioning

| Date | Document | Version | Status |
|------|----------|---------|--------|
| 2026-03-01 | CHANGELOG | 1.0 | Current |
| 2026-02-28 | Voice-Photo-Annotation Report | 1.0 | Archived |
| 2026-02-15 | Profile-Resume-Enhancement Plan | 1.0 | In Progress |
| 2026-02-01 | UI Design System | 2.0 | Stable |

---

## Categories

- **Added**: New features or functionality
- **Changed**: Changes to existing functionality
- **Fixed**: Bug fixes
- **Removed**: Removed features
- **Deprecated**: Features that will be removed in the future
- **Security**: Security-related changes

## Release Policy

- **Stable**: Changes merged to `main` branch
- **In Progress**: Features on feature branches
- **Archived**: Completed PDCA cycles moved to `docs/archive/`

## Future Releases

### Phase 2 (Q2 2026)
- Naver Reservation real-time sync
- Instagram portfolio integration
- Auto mosaic enhancement
- Drag & Drop reservations
- Review & coupon system
- AI Style Preview
- Sales & customer analytics
- Offline support (Service Worker)

---

**Last Updated**: 2026-03-01
**Total Releases**: 1
**Total Issues Fixed**: 9
**Active Features**: 10+
