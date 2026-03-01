# Plan: Voice + Photo Annotation Enhancement

> PDCA Phase: **Plan**
> Feature: `voice-photo-annotation`
> Created: 2026-03-01
> Status: Draft

---

## 1. Background & Motivation

### Problem Statement

현재 시술 기록 시스템은 두 가지 독립적 기능(음성 메모, 사진 핀 어노테이션)을 제공하지만, 이들이 **유기적으로 연결되지 않음**. 실제 미용실 워크플로우에서 디자이너는 사진을 보며 "여기는 이렇게 했고, 저기는 저렇게 했다"고 설명하는데, 이 자연스러운 흐름이 시스템에 반영되지 않고 있다.

**현재 한계점:**

| 문제 | 현재 상태 | 목표 |
|------|----------|------|
| 음성 입력 방식 | 실시간 녹음만 가능 | 녹음 + 파일 업로드 듀얼 모드 |
| 음성 → 시각 연결 | 음성 결과가 텍스트 필드에만 채워짐 | 핵심 코멘트가 칩으로 추출되어 사진 위 배치 가능 |
| 사진 어노테이션 | 핀 + 텍스트(50자)만 지원 | 자유 드로잉 캔버스(원, 화살표, 자유선) + 핀 |
| 시술 데이터 축적 | 개별 시술 기록으로만 존재 | 고객 히스토리 분석, 제품 트렌드, 용어 학습 |

### 사용자 워크플로우 (목표)

```
1. 전후좌우 사진 촬영 (4장 세트)
2. 각 사진 위에 자유 드로잉으로 시술 영역 표시
3. 음성으로 시술 내용 설명 (녹음 또는 파일 업로드)
4. AI가 음성에서 핵심 코멘트 추출 → 칩 생성
5. 칩을 사진 위에 드래그하여 배치
6. 축적된 데이터로 고객 히스토리/제품 트렌드/용어 사전 자동 구축
```

### Impact

| 가치 | 설명 | 대상 |
|------|------|------|
| 시술 기록 효율 | 음성 + 드로잉으로 30초 안에 시술 포인트 기록 | 디자이너 |
| 시술 재현성 | 다음 방문 시 정확한 시술 위치/방법 참조 | 디자이너 |
| 고객 소통 | 시술 전후 사진에 드로잉으로 설명 → 고객 이해도 향상 | 고객 |
| 사업 인사이트 | 축적 데이터 분석 → 제품/서비스 의사결정 | 매장 owner |
| 용어 표준화 | 뷰티 업계 용어 학습 → AI 인식률 향상 | 시스템 전체 |

### Success Criteria

- [ ] 음성 입력: 실시간 녹음 + 오디오 파일 업로드 듀얼 모드
- [ ] AI 칩 추출: 음성에서 핵심 코멘트 자동 추출 → 드래그 가능한 칩 생성
- [ ] 자유 드로잉: 사진 위에 원, 화살표, 자유선 그리기 (색상/두께 선택)
- [ ] 칩 → 사진 배치: AI 칩을 사진 위 특정 위치에 배치
- [ ] 기존 핀 어노테이션과 공존 (드로잉 + 핀 + 칩 모두 지원)
- [ ] 고객 히스토리 분석 API (시술 이력 기반 요약)
- [ ] 제품 트렌드 분석 API (매장 내 제품 사용 통계)
- [ ] 뷰티 용어 학습 시스템 (매장별 용어 사전 자동 구축)
- [ ] `npm run build` 성공

---

## 2. Scope

### In Scope

#### 2-1. 음성 입력 듀얼 모드 (핵심)

| # | 항목 | 설명 |
|---|------|------|
| 1 | 오디오 파일 업로드 | `<input type="file" accept="audio/*">` 추가 |
| 2 | VoiceMemo 컴포넌트 확장 | 녹음 / 파일 선택 탭 UI |
| 3 | 동일 파이프라인 처리 | 녹음이든 파일이든 동일한 Whisper → GPT-4o 파이프라인 |
| 4 | 파일 크기 제한 | 최대 25MB (Whisper API 제한) |

#### 2-2. AI 핵심 코멘트 칩 추출 (핵심)

| # | 항목 | 설명 |
|---|------|------|
| 1 | GPT-4o 프롬프트 확장 | 기존 구조화 출력 + `key_comments` 배열 추가 |
| 2 | 칩 데이터 구조 | `{ id, text, category, confidence }` |
| 3 | 칩 카테고리 | 시술부위, 약제, 시간, 주의사항, 결과평가 |
| 4 | 칩 UI 컴포넌트 | 드래그 가능한 칩 (색상별 카테고리 구분) |
| 5 | 사진 위 배치 | 칩을 사진 위 좌표에 드롭하여 배치 |
| 6 | DB 저장 | `treatment_photos.annotations` JSONB에 칩 데이터 추가 |

#### 2-3. 자유 드로잉 캔버스 (핵심)

| # | 항목 | 설명 |
|---|------|------|
| 1 | Canvas 오버레이 | 사진 위에 투명 `<canvas>` 레이어 |
| 2 | 드로잉 도구 | 자유선, 원, 화살표, 직선 |
| 3 | 스타일 옵션 | 색상 (빨강/파랑/노랑/흰색), 두께 (1/2/4px) |
| 4 | 실행 취소/다시 실행 | Undo/Redo 스택 |
| 5 | 드로잉 데이터 저장 | SVG 패스 또는 Canvas 이미지로 저장 |
| 6 | DB 저장 | `treatment_photos` 에 drawing_data 필드 추가 |

#### 2-4. 고객 히스토리 분석 (부가)

| # | 항목 | 설명 |
|---|------|------|
| 1 | 히스토리 API | 고객별 시술 이력 타임라인 + AI 요약 |
| 2 | 주요 패턴 추출 | 선호 시술, 주기, 제품 이력 |
| 3 | 다음 방문 제안 | 히스토리 기반 추천 |

#### 2-5. 제품 트렌드 분석 (부가)

| # | 항목 | 설명 |
|---|------|------|
| 1 | 매장 통계 API | 기간별 제품 사용량/빈도 집계 |
| 2 | 인기 제품 랭킹 | 제품별 사용 횟수, 고객 만족도 연관 |

#### 2-6. 뷰티 용어 학습 시스템 (부가)

| # | 항목 | 설명 |
|---|------|------|
| 1 | 용어 사전 테이블 | `shop_terminology` — 매장별 커스텀 용어 저장 |
| 2 | 자동 용어 수집 | 음성 메모에서 반복 등장하는 전문 용어 추출 |
| 3 | 용어 프로필 | premuto ToneProfile 패턴 참고 — 가중치 기반 병합 |
| 4 | Whisper 프롬프트 주입 | 매장 용어 사전을 Whisper initial_prompt에 주입 → 인식률 향상 |
| 5 | GPT-4o 컨텍스트 | 매장 용어를 시스템 프롬프트에 포함 → 구조화 정확도 향상 |

### Out of Scope

- 실시간 음성-사진 동기화 (음성 타임스탬프와 사진 연결)
- 멀티 디바이스 동시 편집
- 오프라인 모드 (Service Worker)
- 외부 CRM 연동

---

## 3. Technical Analysis

### 3-1. 기존 코드 분석

#### 음성 파이프라인 (확장 대상)

| 파일 | 역할 | 변경 필요 |
|------|------|----------|
| `components/VoiceMemo.tsx` | 기본 녹음 (MediaRecorder, Blob 반환) | 파일 업로드 탭 추가 |
| `components/VoiceNote.tsx` | 풀 모달 (녹음→변환→확인→저장) | 칩 추출 결과 표시 추가 |
| `api/voice/transcribe/route.ts` | requireAuth + rate limit | 파일 업로드 대응 |
| `lib/services/openai-service.ts` | Whisper + GPT-4o 2단계 | 칩 추출 스키마 확장, 용어 프롬프트 주입 |

**현재 GPT-4o 출력 스키마:**
```typescript
{
  customer_name, service_type, products_used: [{brand, code, area}],
  area, duration_minutes, satisfaction, next_visit_recommendation, summary
}
```

**확장 스키마:**
```typescript
{
  ...기존 필드,
  key_comments: [
    { text: string, category: "area"|"product"|"time"|"caution"|"result", confidence: number }
  ]
}
```

#### 사진 어노테이션 (확장 대상)

| 파일 | 역할 | 변경 필요 |
|------|------|----------|
| `components/PhotoAnnotationEditor.tsx` | 핀 기반 (max 10, 50자, % 좌표) | 드로잉 + 칩 레이어 추가 |
| `components/AnnotationOverlay.tsx` | 읽기 전용 핀 표시 | 드로잉 + 칩 렌더링 추가 |
| `api/.../photos/[photoId]/route.ts` | PATCH — 어노테이션 저장 | drawing_data 필드 추가 |

**현재 어노테이션 구조:**
```typescript
interface PhotoAnnotation {
  id: string; x: number; y: number; text: string;
}
// JSONB in treatment_photos.annotations
```

**확장 구조:**
```typescript
interface PhotoAnnotation {
  id: string; x: number; y: number; text: string;
  type: "pin" | "chip";           // 신규
  category?: string;               // 칩 카테고리
  source?: "manual" | "voice_ai";  // 입력 소스
}

interface DrawingData {
  shapes: DrawingShape[];
  version: number;
}

// react-konva 기반 — Konva shape props와 1:1 대응
interface DrawingShape {
  type: "freehand" | "circle" | "arrow" | "line";
  points?: number[];               // freehand/arrow/line: % 좌표 [x1,y1,x2,y2,...]
  x?: number;                      // circle: 중심 x (%)
  y?: number;                      // circle: 중심 y (%)
  radius?: number;                 // circle: 반지름 (%)
  stroke: string;
  strokeWidth: number;
}
```

### 3-2. DB 스키마 변경

#### 기존 테이블 수정

```sql
-- treatment_photos 테이블에 drawing_data 추가
ALTER TABLE treatment_photos
ADD COLUMN drawing_data JSONB DEFAULT NULL;
```

#### 신규 테이블

```sql
-- 매장별 용어 사전
CREATE TABLE shop_terminology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  category TEXT,                    -- 시술, 제품, 부위, 도구
  frequency INTEGER DEFAULT 1,
  confidence NUMERIC(3,2) DEFAULT 0.5,
  aliases TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, term)
);

CREATE INDEX idx_shop_terminology_shop ON shop_terminology(shop_id);
```

### 3-3. 기술 선택

#### 캔버스 드로잉

| 옵션 | 크기(gzip) | React 친화 | 모바일 터치 | 선택 |
|------|-----------|:----------:|:----------:|------|
| HTML Canvas API (직접) | 0KB | X | 직접 구현 | - |
| fabric.js | ~100KB | X | O | - |
| **react-konva (Konva.js)** | ~50KB | O | O (내장) | **선택** |
| excalidraw | ~500KB+ | O | O | 과도함 |

**선택: react-konva** — React 컴포넌트 모델로 `<Line>`, `<Circle>`, `<Arrow>` 등 shape를 선언적으로 사용 가능. 모바일 터치 이벤트(touchstart/touchmove/touchend, 핀치 줌 구분)가 내장되어 있어 직접 구현 대비 안정성이 높음. `next/dynamic`으로 lazy import하면 해당 페이지에서만 로드되어 다른 페이지 번들에 영향 없음.

```tsx
// 사용 예시
<Stage width={w} height={h}>
  <Layer>
    <Image image={photo} />              {/* 배경 사진 */}
    <Line points={[...]} stroke="red" /> {/* 자유 드로잉 */}
    <Circle x={50} y={30} radius={20} /> {/* 원 마킹 */}
    <Arrow points={[...]} />             {/* 화살표 */}
  </Layer>
</Stage>
```

#### 드로잉 데이터 저장 방식

| 옵션 | 장점 | 단점 | 선택 |
|------|------|------|------|
| SVG 패스 데이터 | 벡터, 크기 작음, 편집 가능 | 구현 복잡 | - |
| Canvas toDataURL (PNG) | 간단 | 크기 큼, 편집 불가 | - |
| 좌표 배열 (JSONB) | 편집 가능, 크기 작음, 해상도 독립 | 렌더링 재구현 필요 | **선택** |

**이유**: % 기반 좌표 배열로 저장하면 해상도 독립적이고 (기존 핀 어노테이션과 동일 방식), 데이터 크기가 작으며, 나중에 편집도 가능.

#### 용어 학습 패턴 (premuto-automation 참고)

premuto-automation의 ToneProfile 시스템 핵심 패턴:

```
1. 소스 텍스트 분석 → AI 추출 (emotion_spectrum, sentence_style, frequent_expressions)
2. 가중치 기반 병합: (old_value * count + new_value) / (count + 1)
3. 신뢰도 공식: min(0.95, 0.4 + samples_count * 0.1)
4. 프롬프트 주입: 학습된 프로필을 시스템 프롬프트에 삽입
```

**적용 방식**: 매장별 `shop_terminology` 테이블에 음성 메모에서 추출된 용어를 누적 저장 → 빈도 가중치로 신뢰도 계산 → Whisper `initial_prompt`와 GPT-4o 시스템 프롬프트에 주입.

---

## 4. Implementation Phases

### Phase A: 음성 듀얼 모드 + 칩 추출 (우선순위 1)

**예상 작업량**: 중 (3-4일)

1. VoiceMemo 컴포넌트에 파일 업로드 탭 추가
2. API Route에서 파일 업로드 대응 (multipart)
3. GPT-4o 출력 스키마에 `key_comments` 추가
4. openai-service.ts 프롬프트 수정
5. VoiceNote 모달에 칩 추출 결과 표시
6. 칩 드래그 & 드롭 UI

### Phase B: 자유 드로잉 캔버스 (우선순위 1)

**예상 작업량**: 중 (3-4일)

1. `DrawingCanvas` 컴포넌트 신규 생성
2. 도구 팔레트 (자유선, 원, 화살표, 직선 / 색상, 두께)
3. Undo/Redo 스택
4. `PhotoAnnotationEditor`에 드로잉 레이어 통합
5. DB 마이그레이션 (`drawing_data` 컬럼)
6. API 저장/로드
7. `AnnotationOverlay`에 드로잉 렌더링

### Phase C: 칩 → 사진 배치 통합 (우선순위 1)

**예상 작업량**: 소 (1-2일)

1. 칩 배치 UI (드래그 → 사진 드롭)
2. 어노테이션 데이터 구조 확장 (`type: "chip"`)
3. 기존 핀 + 칩 + 드로잉 공존 렌더링

### Phase D: 고객 히스토리 + 제품 트렌드 (우선순위 2)

**예상 작업량**: 소 (2일)

1. 고객 히스토리 API (`/shops/{id}/customers/{cid}/history`)
2. GPT-4o 기반 히스토리 요약
3. 제품 트렌드 API (`/shops/{id}/analytics/products`)
4. SQL 집계 쿼리 (기간별 제품 사용량)

### Phase E: 뷰티 용어 학습 시스템 (우선순위 2)

**예상 작업량**: 중 (2-3일)

1. `shop_terminology` 테이블 마이그레이션
2. 음성 처리 시 자동 용어 수집 로직
3. 가중치 기반 병합 (premuto 패턴)
4. Whisper initial_prompt 주입
5. GPT-4o 시스템 프롬프트 주입
6. 용어 관리 UI (설정 페이지)

---

## 5. Risks & Mitigations

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| 캔버스 드로잉 모바일 성능 | 터치 지연, 프레임 드롭 | react-konva 내장 최적화 + 포인트 간소화(Douglas-Peucker) |
| 드로잉 데이터 크기 | JSONB 과대 → DB 성능 | 포인트 간소화, 최대 패스 수 제한 (50) |
| 칩 추출 정확도 | GPT-4o가 적절한 칩을 못 뽑음 | few-shot 예시 + 카테고리 제약 + 수동 편집 지원 |
| Whisper 오디오 파일 크기 | 25MB 제한 초과 | 클라이언트에서 크기 체크, 초과 시 안내 메시지 |
| 용어 학습 노이즈 | 부정확한 용어가 사전에 축적 | 최소 빈도 threshold (3회), 관리자 수동 정리 UI |

---

## 6. API Changes Summary

### 신규 엔드포인트

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/shops/{id}/customers/{cid}/history` | withShopAuth | 고객 시술 히스토리 + AI 요약 |
| GET | `/shops/{id}/analytics/products` | withShopAuth | 제품 사용 트렌드 |
| GET | `/shops/{id}/terminology` | withShopAuth | 매장 용어 사전 |
| PUT | `/shops/{id}/terminology/{tid}` | withShopAuth(owner,admin) | 용어 수정 |
| DELETE | `/shops/{id}/terminology/{tid}` | withShopAuth(owner,admin) | 용어 삭제 |

### 기존 엔드포인트 수정

| Method | Path | 변경 내용 |
|--------|------|----------|
| POST | `/api/voice/transcribe` | 파일 업로드 대응 + key_comments 반환 |
| PATCH | `/shops/{id}/treatments/{tid}/photos/{pid}` | drawing_data 필드 추가 |

---

## 7. Dependencies

| 의존성 | 용도 | 추가 설치 필요 |
|--------|------|---------------|
| OpenAI API (Whisper + GPT-4o) | 음성 변환 + 칩 추출 + 히스토리 요약 | 이미 사용 중 |
| **konva + react-konva** | 사진 위 드로잉 캔버스 | `npm install konva react-konva` |

**번들 영향**: react-konva ~50KB (gzip). `next/dynamic(() => import(...), { ssr: false })`로 드로잉 페이지에서만 로드 → 다른 페이지 영향 없음.

---

## 8. Cost Analysis

| 항목 | 현재 비용 | 추가 비용 | 비고 |
|------|----------|----------|------|
| Whisper API | ~$1/월/매장 | +$0.5 (파일 업로드 증가) | $0.006/분 |
| GPT-4o | 기존 시술 구조화 | +$0.3 (칩 추출 추가 토큰) | 스키마 확장으로 약간 증가 |
| GPT-4o (히스토리) | 없음 | +$0.5 (요약 생성) | 요청 시에만 호출 |
| Supabase Storage | 기존 사진 | 추가 없음 | 드로잉은 JSONB 저장 |
| **합계** | ~$1/월/매장 | **+~$1.3/월/매장** | |

---

## 9. References

- **기존 코드**: `VoiceMemo.tsx`, `VoiceNote.tsx`, `PhotoAnnotationEditor.tsx`, `AnnotationOverlay.tsx`
- **API**: `openai-service.ts`, `api/voice/transcribe/route.ts`
- **premuto-automation 톤 학습**: `blog_automation/tone_learner.py` — ToneProfile 가중치 병합 패턴
- **Whisper API 문서**: initial_prompt 파라미터로 도메인 용어 주입 가능
