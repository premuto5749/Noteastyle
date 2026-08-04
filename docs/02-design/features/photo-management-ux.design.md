# photo-management-ux Design Document

> **Summary**: 시술 사진 관리 UX 개선 -- FaceSwap 이중 대기 제거, 업로드 병렬화, 갤러리 선택, 캐러셀 퀵 액션, 종횡비 버그 수정
>
> **Project**: Note-a-Style
> **Author**: Claude (Opus)
> **Date**: 2026-03-06
> **Status**: Draft
> **Planning Doc**: [photo-management-ux.plan.md](../../01-plan/features/photo-management-ux.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 최소한의 코드 변경으로 최대 체감 개선 달성
- 기존 컴포넌트 인터페이스를 최대한 유지하면서 내부 로직만 수정
- 새로운 의존성 추가 없음

### 1.2 Design Principles

- **최소 침습**: 기존 동작하는 코드에 가능한 적게 손댐
- **점진적 개선**: 폴백 로직 유지 (url 없으면 기존 폴링)
- **사용자 선택권**: 카메라/갤러리를 강제하지 않고 선택 가능하게

---

## 2. Architecture

### 2.1 수정 범위 다이어그램

```
[capture/page.tsx] ──upload──> [Supabase Storage]
       │                            (병렬화: FR-02)
       │
[NativeCapture.tsx] ──input──> capture/gallery 분리 (FR-03)
       │
[treatments/[id]/page.tsx]
       │
       ├── [PhotoCarousel.tsx] + QuickActionBar (FR-04)
       │         │
       │         └── [AnnotationOverlay.tsx]
       │
       ├── [PhotoAnnotationEditor.tsx] ── 종횡비 수정 (FR-05)
       │         │
       │         └── [DrawingCanvas.tsx] ── Stage 동적 사이즈 (FR-05)
       │
       └── [FaceSwapFlow.tsx] ── 폴링 스킵 (FR-01)
                 │
                 └── [api.ts] ── 타입 수정 (FR-01)
```

### 2.2 Dependencies

| Component | Depends On | Change Type |
|-----------|-----------|-------------|
| `api.ts` (타입) | None | 타입 필드 추가 |
| `FaceSwapFlow.tsx` | `api.ts` 타입 | 로직 분기 추가 |
| `capture/page.tsx` | None | 업로드 루프 교체 |
| `NativeCapture.tsx` | None | input 요소 추가 + props 변경 |
| `PhotoAnnotationEditor.tsx` | None | `getImageDimensions` 수정 |
| `DrawingCanvas.tsx` | None | props 기반 사이즈 계산 |
| `PhotoCarousel.tsx` | None | `onAction` prop 추가 |
| `treatments/[id]/page.tsx` | `PhotoCarousel` 변경 | 퀵 액션 바 연결 |

---

## 3. Detailed Design per FR

### FR-01: FaceSwap 이중 대기 제거

#### 현재 문제 (코드 레벨)

```typescript
// api.ts:238-240 -- url 필드 누락
export interface FaceSwapGenerateResult {
  jobs: { _id: string; status: number }[];  // url 없음!
}

// FaceSwapFlow.tsx:101-151 -- 완료된 job도 폴링
const { jobs } = await generateFaceSwap(...);
for (const job of jobs) {
  setInterval(async () => {
    const status = await getFaceSwapStatus(job._id);  // 불필요!
    if (status.status === 2 && status.url) { ... }
  }, 5000);
}
```

#### 변경 설계

**파일 1: `frontend/src/lib/api.ts`**

```typescript
// 변경: url 필드 추가
export interface FaceSwapGenerateResult {
  jobs: { _id: string; status: number; url?: string }[];
}
```

**파일 2: `frontend/src/components/FaceSwapFlow.tsx`**

```typescript
// 변경: url 있으면 즉시 처리, 없으면 기존 폴링 폴백
const { jobs } = await generateFaceSwap(selectedPhoto.id, model.id, 2);

let completed = 0;
const totalJobs = jobs.length;

for (const job of jobs) {
  // 이미 완료된 job (서버가 fal.subscribe로 블로킹 후 반환)
  if (job.status === 2 && job.url) {
    const saved = await saveFaceSwapResult({
      treatment_photo_id: selectedPhoto.id,
      face_model_id: model.id,
      result_url: job.url,
    });
    setResults((prev) => [...prev, saved]);
    completed++;
    if (completed >= totalJobs) setStep("results");
    continue;  // 폴링 스킵
  }

  // 미완료 job만 폴링 (폴백)
  const startTime = Date.now();
  const interval = setInterval(async () => { /* 기존 폴링 로직 */ }, POLL_INTERVAL);
  pollingRef.current.push(interval);
}
```

#### Acceptance Criteria

- [ ] AC-01-1: `generateFaceSwap` 호출 후, 서버 응답의 `jobs[].url`이 존재하면 `getFaceSwapStatus` API가 호출되지 않음
- [ ] AC-01-2: `jobs[].url`이 없는 경우 (폴백) 기존 5초 폴링이 정상 동작
- [ ] AC-01-3: 결과 화면(step="results")에 페이스 스왑 이미지가 정상 표시
- [ ] AC-01-4: `npm run build` 시 타입 에러 없음

---

### FR-02: 사진 업로드 병렬화

#### 현재 문제

```typescript
// capture/page.tsx:64-79 -- 순차 업로드
for (let i = 0; i < items.length; i++) {
  setUploadProgress({ current: i + 1, total: items.length });
  await api.uploadTreatmentPhoto(...);  // 하나씩 순서대로
}
```

#### 변경 설계

**파일: `frontend/src/app/treatments/[id]/capture/page.tsx`**

```typescript
// Promise.allSettled + 동시 3개 제한
const CONCURRENT_LIMIT = 3;

async function uploadAllItems(items: CapturedMedia[]) {
  const results: { index: number; status: "ok" | "fail" }[] = [];
  let inFlight = 0;
  let nextIdx = 0;

  return new Promise<typeof results>((resolve) => {
    function startNext() {
      while (inFlight < CONCURRENT_LIMIT && nextIdx < items.length) {
        const idx = nextIdx++;
        inFlight++;
        api.uploadTreatmentPhoto(
          treatmentId, items[idx].blob, items[idx].photoType,
          undefined,
          { mediaType: items[idx].type, videoDuration: items[idx].durationSeconds, thumbnail: items[idx].thumbnailBlob }
        )
          .then(() => { results.push({ index: idx, status: "ok" }); })
          .catch(() => { results.push({ index: idx, status: "fail" }); })
          .finally(() => {
            inFlight--;
            setUploadProgress({ current: results.length, total: items.length });
            if (results.length === items.length) resolve(results);
            else startNext();
          });
      }
    }
    startNext();
  });
}

// 사용
const results = await uploadAllItems(capturedItems);
const failed = results.filter(r => r.status === "fail");
if (failed.length > 0) {
  alert(`${failed.length}장 업로드 실패. 나머지 ${results.length - failed.length}장은 성공했습니다.`);
}
router.push(`/treatments/${treatmentId}`);
```

#### Acceptance Criteria

- [ ] AC-02-1: 5장 선택 시 동시에 최대 3장씩 업로드 (Network 탭에서 확인)
- [ ] AC-02-2: 1장 실패해도 나머지 장은 정상 업로드 완료
- [ ] AC-02-3: 실패 건수를 사용자에게 알림 (`N장 업로드 실패` 메시지)
- [ ] AC-02-4: 진행률 표시가 완료된 건 수 기준으로 업데이트 (`current/total`)
- [ ] AC-02-5: 모두 성공 시 자동으로 시술 상세 페이지로 이동

---

### FR-03: 갤러리 선택 지원

#### 현재 문제

```html
<!-- NativeCapture.tsx:139-146 -- capture 강제 -->
<input accept="image/*" capture="environment" />
<!-- 갤러리 접근 불가, multiple 미지원 -->
```

#### 변경 설계

**파일: `frontend/src/components/NativeCapture.tsx`**

Props 변경:
```typescript
interface NativeCaptureProps {
  onCapture: (media: CapturedMedia) => void;
  onCaptureMultiple?: (media: CapturedMedia[]) => void;  // 새 prop (갤러리 다중 선택)
  disabled?: boolean;
}
```

UI 변경: 2열 → 3열 그리드 (카메라 / 갤러리 / 영상)
```
┌──────────────────────────────────────┐
│  시술 완료 후 사진 또는 영상을 촬영하세요  │
│                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │  📷  │  │  🖼️  │  │  🎬  │       │
│  │ 카메라│  │갤러리 │  │ 영상  │       │
│  └──────┘  └──────┘  └──────┘       │
└──────────────────────────────────────┘
```

Hidden inputs:
```html
<!-- 카메라: capture 유지, 단일 -->
<input accept="image/*" capture="environment" />

<!-- 갤러리: capture 제거, multiple 추가 -->
<input accept="image/*" multiple />

<!-- 영상: 기존 유지 -->
<input accept="video/*" capture="environment" />
```

갤러리 multiple 핸들러:
```typescript
const handleGalleryChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length === 1) {
      const previewUrl = URL.createObjectURL(files[0]);
      onCapture({ blob: files[0], type: "photo", previewUrl, photoType: "after" });
    } else if (onCaptureMultiple) {
      const items = files.map(f => ({
        blob: f, type: "photo" as const, previewUrl: URL.createObjectURL(f), photoType: "after"
      }));
      onCaptureMultiple(items);
    } else {
      // fallback: 첫 장만
      const previewUrl = URL.createObjectURL(files[0]);
      onCapture({ blob: files[0], type: "photo", previewUrl, photoType: "after" });
    }
    e.target.value = "";
  },
  [onCapture, onCaptureMultiple],
);
```

#### Acceptance Criteria

- [ ] AC-03-1: "카메라" 버튼 클릭 시 네이티브 카메라 실행 (기존 동작 유지)
- [ ] AC-03-2: "갤러리" 버튼 클릭 시 갤러리 열림 (카메라 아님)
- [ ] AC-03-3: 갤러리에서 다중 선택 시 모든 사진이 캡처 리스트에 추가
- [ ] AC-03-4: 갤러리에서 단일 선택 시 기존 `onCapture` 콜백으로 처리
- [ ] AC-03-5: "영상" 버튼 기존 동작 유지 (카메라 영상 촬영)

---

### FR-04: 캐러셀 퀵 액션 바

#### 현재 흐름 (3탭)

```
캐러셀에서 사진 보기 → 스크롤 아래 "사진 관리" 그리드 → 사진 탭 → ActionModal 열기
```

#### 변경 설계

**파일 1: `frontend/src/components/PhotoCarousel.tsx`**

새 prop 추가:
```typescript
interface PhotoCarouselProps {
  photos: TreatmentPhoto[];
  children?: (activeIndex: number) => React.ReactNode;
  onAction?: (photo: TreatmentPhoto, action: string) => void;  // 새 prop
}
```

캐러셀 아래 (dot indicators 밑) 퀵 액션 바 렌더링:
```
┌────────────────────────────────────┐
│         [사진 캐러셀]               │
│     ← ○ ○ ● ○ ○  2/5  →          │
├────────────────────────────────────┤
│  📌 핀   🤖 AI   🔲 모자이크  📁 폴리오 │
└────────────────────────────────────┘
```

```tsx
{/* Quick Action Bar */}
{onAction && photos.length > 0 && (
  <div className="flex justify-center gap-6 py-2 bg-card/80 backdrop-blur-sm">
    <button onClick={() => onAction(photos[activeIndex], "annotate")}
      className="flex flex-col items-center gap-0.5">
      <PinIcon size={18} />
      <span className="text-[10px] text-muted-foreground">핀</span>
    </button>
    <button onClick={() => onAction(photos[activeIndex], "faceswap")}
      disabled={photos[activeIndex]?.media_type === "video"}
      className="flex flex-col items-center gap-0.5 disabled:opacity-30">
      <AIIcon size={18} />
      <span className="text-[10px] text-muted-foreground">AI</span>
    </button>
    <button onClick={() => onAction(photos[activeIndex], "mosaic")}
      disabled={photos[activeIndex]?.media_type === "video"}
      className="flex flex-col items-center gap-0.5 disabled:opacity-30">
      <MosaicIcon size={18} />
      <span className="text-[10px] text-muted-foreground">모자이크</span>
    </button>
    <button onClick={() => onAction(photos[activeIndex], "portfolio")}
      className="flex flex-col items-center gap-0.5">
      <PortfolioIcon size={18} />
      <span className="text-[10px] text-muted-foreground">포트폴리오</span>
    </button>
  </div>
)}
```

**파일 2: `frontend/src/app/treatments/[id]/page.tsx`**

```tsx
<PhotoCarousel
  photos={sortedPhotos}
  onAction={(photo, action) => {
    switch (action) {
      case "annotate":
        if ((photo.media_type || "photo") === "photo") setAnnotatingPhoto(photo);
        break;
      case "faceswap":
        setFaceSwapPreselect(photo);
        setShowFaceSwap(true);
        break;
      case "mosaic":
        setMosaicPhoto(photo);
        break;
      case "portfolio":
        handleAddToPortfolio(photo);
        break;
    }
  }}
>
```

#### Acceptance Criteria

- [ ] AC-04-1: 캐러셀 아래 4개 아이콘 버튼 표시 (핀, AI, 모자이크, 포트폴리오)
- [ ] AC-04-2: 캐러셀 슬라이드 시 버튼이 현재 활성 사진에 대해 동작
- [ ] AC-04-3: "핀" 탭 → `PhotoAnnotationEditor` 열림 (현재 사진)
- [ ] AC-04-4: "AI" 탭 → `FaceSwapFlow` 열림 (현재 사진 프리셀렉트)
- [ ] AC-04-5: "모자이크" 탭 → `MosaicEditor` 열림 (현재 사진)
- [ ] AC-04-6: "포트폴리오" 탭 → 포트폴리오 추가 처리
- [ ] AC-04-7: 영상 사진에서는 AI/모자이크 버튼 비활성화 (disabled)
- [ ] AC-04-8: 기존 사진 그리드 ActionModal도 유지 (삭제하지 않음)

---

### FR-05: 종횡비 버그 수정

#### 현재 문제

```typescript
// PhotoAnnotationEditor.tsx:52 -- 4:3 하드코딩
return { width: rect.width, height: rect.width * 0.75 };

// DrawingCanvas.tsx:16-18 -- 외부에서 고정 사이즈 전달받음
interface DrawingCanvasProps {
  width: number;   // 부모가 4:3 기준으로 전달
  height: number;
}
```

#### 변경 설계

**파일 1: `frontend/src/components/PhotoAnnotationEditor.tsx`**

```typescript
// getImageDimensions: 이미지 로드 후 실제 비율 사용
const [imageDimensions, setImageDimensions] = useState<{width: number; height: number} | null>(null);

const getImageDimensions = useCallback(() => {
  if (imageDimensions) return imageDimensions;
  if (!containerRef.current) return { width: 480, height: 360 };
  const rect = containerRef.current.getBoundingClientRect();
  return { width: rect.width, height: rect.width * 0.75 }; // 폴백
}, [imageDimensions]);

// 이미지 onLoad에서 실제 비율 계산
const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  if (!containerRef.current) return;
  const containerWidth = containerRef.current.getBoundingClientRect().width;
  const ratio = img.naturalHeight / img.naturalWidth;
  setImageDimensions({ width: containerWidth, height: containerWidth * ratio });
}, []);
```

이미지 요소에 `onLoad` 추가:
```tsx
<img
  ref={imageRef}
  src={photoUrl}
  onLoad={handleImageLoad}
  style={{ width: dims.width, height: dims.height }}
  ...
/>
```

**파일 2: `frontend/src/components/DrawingCanvas.tsx`**

DrawingCanvas는 이미 `width`/`height` props를 받으므로 코드 변경 불필요.
`PhotoAnnotationEditor`가 올바른 사이즈를 전달하면 자동으로 해결됨.

단, `PhotoAnnotationEditor`가 `showDrawingCanvas` 전환 시 `getImageDimensions()`로 사이즈를 전달하는 부분 확인 필요.

#### Acceptance Criteria

- [ ] AC-05-1: 16:9 사진에서 `PhotoAnnotationEditor` 열면 이미지가 16:9 비율로 표시
- [ ] AC-05-2: 1:1 사진에서 `PhotoAnnotationEditor` 열면 이미지가 1:1 비율로 표시
- [ ] AC-05-3: 핀 어노테이션 좌표가 이미지 위 정확한 위치에 표시 (4:3이 아닌 사진에서도)
- [ ] AC-05-4: DrawingCanvas 그리기 영역이 이미지와 동일한 크기
- [ ] AC-05-5: 기존 4:3 사진의 어노테이션/드로잉 데이터 호환성 유지 (좌표가 퍼센트 기반이므로 자동 호환)

---

## 4. Implementation Order

| Step | FR | Files | Est. | Depends On |
|:----:|-----|-------|:----:|:----------:|
| 1 | FR-01 | `api.ts`, `FaceSwapFlow.tsx` | ~20 LOC | - |
| 2 | FR-05 | `PhotoAnnotationEditor.tsx` | ~25 LOC | - |
| 3 | FR-02 | `capture/page.tsx` | ~40 LOC | - |
| 4 | FR-03 | `NativeCapture.tsx`, `capture/page.tsx` | ~50 LOC | FR-02 |
| 5 | FR-04 | `PhotoCarousel.tsx`, `[id]/page.tsx` | ~60 LOC | - |

Step 1-3은 서로 독립적이므로 병렬 구현 가능.

---

## 5. Test Plan

### 5.1 수동 테스트 체크리스트

| # | 테스트 | FR | 방법 |
|---|--------|-----|------|
| T-01 | FaceSwap 생성 후 즉시 결과 표시 | FR-01 | Network 탭에서 status API 호출 0건 확인 |
| T-02 | 사진 3장 업로드 → 병렬 처리 | FR-02 | Network 탭에서 동시 요청 확인 |
| T-03 | 1장 실패 시 나머지 성공 확인 | FR-02 | 개발자 도구로 1건 네트워크 차단 |
| T-04 | 갤러리 버튼 → 갤러리 열림 | FR-03 | 모바일 실기기 테스트 |
| T-05 | 갤러리 다중 선택 | FR-03 | 2장 이상 선택 후 리스트 확인 |
| T-06 | 캐러셀 핀 버튼 → 어노테이션 에디터 | FR-04 | 탭 후 에디터 열림 확인 |
| T-07 | 캐러셀 슬라이드 후 AI 버튼 | FR-04 | 2번째 사진으로 이동 후 AI 버튼 탭 |
| T-08 | 16:9 사진에 핀 찍기 | FR-05 | 핀 좌표가 정확한 위치에 표시 |
| T-09 | 기존 4:3 사진 어노테이션 호환 | FR-05 | 기존 데이터 있는 사진 열기 |

### 5.2 E2E 테스트 (Playwright)

기존 `tests/e2e/conftest.py` 활용. FR-01, FR-02는 API 의존성 있어 E2E 테스트 범위에서 제외.
FR-04 (퀵 액션 바 렌더링)만 스모크 테스트 가능.

---

## 6. Security Considerations

- [x] 파일 업로드 크기 제한 기존 유지 (10MB)
- [x] Rate limit 기존 유지 (AI API 10/min)
- [x] 인증 체계 변경 없음 (withShopAuth)
- [x] 새로운 API 엔드포인트 추가 없음

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-06 | Initial draft | Claude (Opus) |
