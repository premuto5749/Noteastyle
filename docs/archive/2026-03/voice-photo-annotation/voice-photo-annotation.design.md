# Design: Voice + Photo Annotation Enhancement

> PDCA Phase: **Design**
> Feature: `voice-photo-annotation`
> Plan Reference: `docs/01-plan/features/voice-photo-annotation.plan.md`
> Created: 2026-03-01
> Status: Draft

---

## 1. Architecture Overview

### 시스템 변경 범위

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 15)                                       │
│                                                              │
│  [신규] DrawingCanvas ─────┐                                 │
│  [신규] VoiceChipTray      │                                 │
│  [신규] TerminologyManager │                                 │
│                            ▼                                 │
│  [수정] VoiceMemo ──> VoiceNote ──> PhotoAnnotationEditor    │
│           │                │              │                  │
│           │ 파일업로드 추가  │ 칩추출 표시   │ 드로잉+칩 통합   │
│           ▼                ▼              ▼                  │
│  [수정] AnnotationOverlay (드로잉+칩 렌더링)                   │
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │  API Routes                                 │              │
│  │  [수정] POST /voice/transcribe              │              │
│  │  [수정] PATCH /photos/{pid}                 │              │
│  │  [신규] GET  /customers/{cid}/history       │              │
│  │  [신규] GET  /analytics/products            │              │
│  │  [신규] CRUD /terminology                   │              │
│  └────────────────────────────────────────────┘              │
│                    │                                          │
│         ┌──────────┼──────────┐                               │
│         ▼          ▼          ▼                               │
│     Supabase    OpenAI     react-konva                       │
│     (DB+Storage) (Whisper   (드로잉 렌더링)                    │
│                  +GPT-4o)                                     │
└─────────────────────────────────────────────────────────────┘
```

### 데이터 흐름

```
음성 녹음/파일 ──> Whisper ──> 텍스트 ──> GPT-4o ──> { 기존필드 + key_comments[] }
                                                          │
                                                          ▼
                                                   VoiceChipTray
                                                   (드래그 가능한 칩)
                                                          │
                                            ┌─────────────┤
                                            ▼             ▼
                                      사진에 배치     용어 자동 수집
                                     (annotations     (shop_terminology)
                                      JSONB)                │
                                                            ▼
                                                     Whisper/GPT-4o
                                                     프롬프트 주입
```

---

## 2. Component Design

### 2-1. VoiceMemo 확장 (파일 업로드 추가)

**파일**: `frontend/src/components/VoiceMemo.tsx`

**현재 Props:**
```typescript
interface VoiceMemoProps {
  onResult: (audioBlob: Blob) => void;
  disabled?: boolean;
}
```

**변경 없음** — Props 유지. 내부에 모드 전환 UI 추가.

**변경 내용:**
```typescript
// 신규 state
const [mode, setMode] = useState<"record" | "upload">("record");

// 파일 업로드 핸들러
const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 25 * 1024 * 1024) {
    alert("오디오 파일은 25MB 이하만 가능합니다.");
    return;
  }
  onResult(file);  // Blob 호환 — File extends Blob
};
```

**UI 변경:**
```
┌──────────────────────────────┐
│  [🎤 녹음]  [📁 파일 선택]     │  ← 탭 전환
├──────────────────────────────┤
│  (녹음 모드: 기존 UI 그대로)    │
│  (파일 모드: file input + info) │
└──────────────────────────────┘
```

- 탭 전환: `mode` state로 `"record"` / `"upload"` 전환
- 파일 모드: `<input type="file" accept="audio/*" />` + 파일명/크기 표시
- 기존 녹음 로직 100% 유지

---

### 2-2. openai-service.ts 확장 (칩 추출 + 용어 주입)

**파일**: `frontend/src/lib/services/openai-service.ts`

#### 스키마 확장

```typescript
// 신규 Zod 스키마
const KeyComment = z.object({
  text: z.string(),
  category: z.enum(["area", "product", "time", "caution", "result"]),
});

// 기존 TreatmentExtraction 확장
const TreatmentExtraction = z.object({
  // ... 기존 필드 모두 유지 ...
  customer_name: z.string().nullable().optional(),
  service_type: z.string().nullable().optional(),
  products_used: z.array(ProductInfo).nullable().optional(),
  area: z.string().nullable().optional(),
  duration_minutes: z.number().nullable().optional(),
  satisfaction: z.string().nullable().optional(),
  next_visit_recommendation: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  // 신규
  key_comments: z.array(KeyComment).nullable().optional(),
});
```

#### 함수 시그니처 변경

```typescript
// 기존
export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string>

// 변경 — 용어 사전 주입 파라미터 추가
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  terminology?: string[]  // 매장 용어 목록
): Promise<string>
```

**Whisper initial_prompt 주입:**
```typescript
const transcription = await openai.audio.transcriptions.create({
  model: "whisper-1",
  file: new File([new Uint8Array(audioBuffer)], filename),
  language: "ko",
  // 신규: 매장 용어를 initial_prompt에 주입하여 인식률 향상
  ...(terminology?.length && {
    prompt: `미용실 시술 기록입니다. 관련 용어: ${terminology.slice(0, 50).join(", ")}`,
  }),
});
```

**GPT-4o 프롬프트 확장:**
```typescript
// extractTreatmentInfo 시스템 프롬프트 추가 내용
const systemPrompt = `당신은 한국 미용실 시술 기록 전문 AI 어시스턴트입니다.
... (기존 프롬프트) ...

추가 지시:
- key_comments: 음성에서 핵심 코멘트를 추출하세요.
  - 각 코멘트는 사진 위에 배치할 수 있는 짧은 문구(20자 이내)입니다.
  - 카테고리: area(시술부위), product(약제/제품), time(시간), caution(주의사항), result(결과평가)
  - 최대 8개까지 추출하세요.
${terminology?.length ? `\n매장 전문 용어: ${terminology.join(", ")}` : ""}`;
```

#### transcribeAndExtract 확장

```typescript
// 기존
export async function transcribeAndExtract(
  audioBuffer: Buffer, filename: string
): Promise<TreatmentExtractionResult>

// 변경
export async function transcribeAndExtract(
  audioBuffer: Buffer,
  filename: string,
  terminology?: string[]
): Promise<TreatmentExtractionResult>
```

---

### 2-3. VoiceNote 확장 (칩 표시)

**파일**: `frontend/src/components/VoiceNote.tsx`

**현재 상태 머신:**
```
idle → recording → processing → confirming → saved
```

**변경 없음** — 상태 머신 유지. `confirming` 단계에서 칩 목록 표시 추가.

**변경 내용:**
```typescript
// confirming 상태 렌더링에 칩 목록 추가
{state === "confirming" && editedResult?.key_comments && (
  <div className="mt-3">
    <label className="text-xs text-muted-foreground block mb-2">핵심 코멘트</label>
    <div className="flex flex-wrap gap-2">
      {editedResult.key_comments.map((comment, i) => (
        <span
          key={i}
          className={`text-xs px-2 py-1 rounded-full ${CHIP_COLORS[comment.category]}`}
        >
          {comment.text}
        </span>
      ))}
    </div>
    <p className="text-xs text-subtle mt-1">
      저장 후 사진 위에 배치할 수 있습니다
    </p>
  </div>
)}
```

**칩 카테고리별 색상:**
```typescript
const CHIP_COLORS: Record<string, string> = {
  area: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  product: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  time: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  caution: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  result: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
};
```

---

### 2-4. DrawingCanvas (신규 컴포넌트)

**파일**: `frontend/src/components/DrawingCanvas.tsx`

**의존성**: `konva`, `react-konva` — `next/dynamic`으로 lazy import (SSR 비활성)

```typescript
interface DrawingCanvasProps {
  imageUrl: string;              // 배경 사진 URL
  initialShapes?: DrawingShape[]; // 기존 드로잉 데이터
  onSave: (shapes: DrawingShape[]) => void;
  onClose: () => void;
  width: number;                 // 컨테이너 너비
  height: number;                // 컨테이너 높이
}

type DrawingTool = "freehand" | "circle" | "arrow" | "line" | "eraser";

interface DrawingShape {
  id: string;
  type: "freehand" | "circle" | "arrow" | "line";
  points?: number[];       // % 좌표 [x1,y1,x2,y2,...] — freehand/arrow/line
  x?: number;              // % — circle 중심
  y?: number;              // % — circle 중심
  radius?: number;         // % — circle 반지름
  stroke: string;          // hex color
  strokeWidth: number;     // px
}
```

**상태 관리:**
```typescript
const [tool, setTool] = useState<DrawingTool>("freehand");
const [color, setColor] = useState("#FF0000");
const [strokeWidth, setStrokeWidth] = useState(2);
const [shapes, setShapes] = useState<DrawingShape[]>(initialShapes ?? []);
const [undoStack, setUndoStack] = useState<DrawingShape[][]>([]);
const [redoStack, setRedoStack] = useState<DrawingShape[][]>([]);
const [isDrawing, setIsDrawing] = useState(false);
const [currentPoints, setCurrentPoints] = useState<number[]>([]);
const stageRef = useRef<Konva.Stage>(null);
```

**좌표 변환:**
```typescript
// 픽셀 → % 변환 (저장 시)
const toPercent = (px: number, total: number) => (px / total) * 100;

// % → 픽셀 변환 (렌더링 시)
const toPx = (pct: number, total: number) => (pct / 100) * total;
```

**터치/마우스 이벤트:**
```typescript
// Stage 이벤트 핸들러
const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
  if (tool === "eraser") { /* 해당 shape 삭제 */ return; }
  setIsDrawing(true);
  pushUndo();
  const pos = e.target.getStage()!.getPointerPosition()!;
  setCurrentPoints([toPercent(pos.x, width), toPercent(pos.y, height)]);
};

const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
  if (!isDrawing) return;
  const pos = e.target.getStage()!.getPointerPosition()!;
  if (tool === "freehand") {
    setCurrentPoints(prev => [...prev, toPercent(pos.x, width), toPercent(pos.y, height)]);
  }
  // circle/arrow/line: 시작점~현재점으로 프리뷰
};

const handlePointerUp = () => {
  if (!isDrawing) return;
  setIsDrawing(false);
  // 최종 shape 생성하여 shapes 배열에 추가
  const newShape = buildShape(tool, currentPoints, color, strokeWidth);
  setShapes(prev => [...prev, newShape]);
  setCurrentPoints([]);
};
```

**Undo/Redo:**
```typescript
const pushUndo = () => {
  setUndoStack(prev => [...prev, shapes]);
  setRedoStack([]); // redo 초기화
};

const undo = () => {
  if (undoStack.length === 0) return;
  setRedoStack(prev => [...prev, shapes]);
  setShapes(undoStack[undoStack.length - 1]);
  setUndoStack(prev => prev.slice(0, -1));
};

const redo = () => {
  if (redoStack.length === 0) return;
  setUndoStack(prev => [...prev, shapes]);
  setShapes(redoStack[redoStack.length - 1]);
  setRedoStack(prev => prev.slice(0, -1));
};
```

**도구 팔레트 UI:**
```
┌───────────────────────────────────────────┐
│ [✏️] [⭕] [→] [─] [🧹]  │ [🔴][🔵][🟡][⚪] │ [↩️][↪️] │
│ 도구                      색상              Undo/Redo  │
├───────────────────────────────────────────┤
│                                           │
│           사진 + 드로잉 캔버스              │
│           (react-konva Stage)             │
│                                           │
├───────────────────────────────────────────┤
│         [취소]            [저장]            │
└───────────────────────────────────────────┘
```

**제약 조건:**
- 최대 shape 수: 50개
- 자유선 포인트 간소화: Douglas-Peucker 알고리즘 (epsilon = 0.5%)
- JSONB 크기 제한: ~100KB (포인트 수로 자연 제한)

---

### 2-5. VoiceChipTray (신규 컴포넌트)

**파일**: `frontend/src/components/VoiceChipTray.tsx`

```typescript
interface KeyComment {
  text: string;
  category: "area" | "product" | "time" | "caution" | "result";
}

interface VoiceChipTrayProps {
  comments: KeyComment[];
  onPlaceOnPhoto: (comment: KeyComment) => void;  // 사진 배치 요청
  onRemove: (index: number) => void;
}
```

**동작:**
- 칩 목록을 수평 스크롤로 표시
- 각 칩 탭 → `onPlaceOnPhoto` 콜백 → PhotoAnnotationEditor에서 위치 선택 모드 진입
- 배치된 칩은 목록에서 제거 (또는 흐리게 표시)

**UI:**
```
┌──────────────────────────────────────────────────┐
│ AI 코멘트:                                        │
│ [뿌리 염색] [로레알 7.1] [30분 방치] [손상 주의] → │  ← 수평 스크롤
│ 탭하여 사진에 배치                                  │
└──────────────────────────────────────────────────┘
```

---

### 2-6. PhotoAnnotationEditor 통합 리디자인

**파일**: `frontend/src/components/PhotoAnnotationEditor.tsx`

**현재 구조**: 핀 전용 에디터 (tap → text input → save)

**변경**: 3개 레이어 통합 관리 (핀 + 칩 + 드로잉)

#### Props 확장

```typescript
interface PhotoAnnotationEditorProps {
  photo: TreatmentPhoto;
  onSave: (data: {
    annotations: PhotoAnnotation[];
    drawing_data: DrawingData | null;
  }) => Promise<void>;
  onClose: () => void;
  // 신규
  pendingChips?: KeyComment[];  // VoiceNote에서 전달받은 AI 칩
}
```

#### PhotoAnnotation 타입 확장

```typescript
// 기존 — 하위 호환 유지
interface PhotoAnnotation {
  id: string;
  x: number;          // 0-100 %
  y: number;          // 0-100 %
  text: string;       // max 50자

  // 신규 (optional — 기존 데이터 호환)
  type?: "pin" | "chip";
  category?: "area" | "product" | "time" | "caution" | "result";
  source?: "manual" | "voice_ai";
}
```

**하위 호환**: `type` 미지정 시 `"pin"`으로 처리. 기존 어노테이션 데이터 마이그레이션 불필요.

#### 모드 전환 UI

```
┌──────────────────────────────────────────┐
│ [📌 핀]  [✏️ 드로잉]  [💬 AI칩]           │  ← 모드 탭
├──────────────────────────────────────────┤
│                                          │
│            사진 + 오버레이                 │
│                                          │
├──────────────────────────────────────────┤
│ (모드별 하단 컨트롤)                       │
│  핀: 텍스트 입력                          │
│  드로잉: DrawingCanvas 도구 팔레트         │
│  AI칩: VoiceChipTray                     │
├──────────────────────────────────────────┤
│         [취소]            [저장]           │
└──────────────────────────────────────────┘
```

**상태:**
```typescript
const [editMode, setEditMode] = useState<"pin" | "drawing" | "chip">("pin");
const [annotations, setAnnotations] = useState<PhotoAnnotation[]>(
  photo.annotations ?? []
);
const [drawingShapes, setDrawingShapes] = useState<DrawingShape[]>(
  photo.drawing_data?.shapes ?? []
);
```

---

### 2-7. AnnotationOverlay 확장 (읽기 전용 표시)

**파일**: `frontend/src/components/AnnotationOverlay.tsx`

**변경 내용:**
- 기존 핀 렌더링 유지
- `type === "chip"` 어노테이션은 카테고리별 색상 배지로 렌더링
- `drawing_data` 있으면 SVG/Canvas로 드로잉 오버레이 렌더링

```typescript
interface AnnotationOverlayProps {
  annotations: PhotoAnnotation[];
  drawingData?: DrawingData | null;  // 신규
  onPinTap?: () => void;
}
```

**드로잉 렌더링:**
- react-konva의 `Stage` + `Layer`를 읽기 전용으로 사용
- `listening={false}`로 이벤트 비활성화 (성능 최적화)
- `next/dynamic`으로 lazy import

---

## 3. Data Model

### 3-1. treatment_photos 테이블 변경

```sql
-- 마이그레이션: 027_add_drawing_data.sql
ALTER TABLE treatment_photos
ADD COLUMN drawing_data JSONB DEFAULT NULL;

COMMENT ON COLUMN treatment_photos.drawing_data IS
  'react-konva 기반 드로잉 데이터. { shapes: DrawingShape[], version: 1 }';
```

**drawing_data JSONB 구조:**
```json
{
  "version": 1,
  "shapes": [
    {
      "id": "s1",
      "type": "freehand",
      "points": [10.5, 20.3, 11.2, 21.1, 12.0, 22.5],
      "stroke": "#FF0000",
      "strokeWidth": 2
    },
    {
      "id": "s2",
      "type": "circle",
      "x": 45.0,
      "y": 60.0,
      "radius": 8.5,
      "stroke": "#0000FF",
      "strokeWidth": 2
    },
    {
      "id": "s3",
      "type": "arrow",
      "points": [30.0, 40.0, 50.0, 60.0],
      "stroke": "#FFFF00",
      "strokeWidth": 2
    }
  ]
}
```

### 3-2. annotations JSONB 확장 (하위 호환)

**기존 데이터 예시:**
```json
[{ "id": "a1", "x": 45.2, "y": 30.1, "text": "뿌리 염색 7.1" }]
```

**확장 데이터 예시:**
```json
[
  { "id": "a1", "x": 45.2, "y": 30.1, "text": "뿌리 염색 7.1" },
  { "id": "a2", "x": 60.0, "y": 50.0, "text": "로레알 7.1", "type": "chip", "category": "product", "source": "voice_ai" }
]
```

**호환 규칙**: `type` 필드 없으면 `"pin"`으로 간주. API 검증 로직에서 `type`, `category`, `source` 필드를 optional로 허용.

### 3-3. shop_terminology 테이블 (신규)

```sql
-- 마이그레이션: 028_shop_terminology.sql
CREATE TABLE shop_terminology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  category TEXT CHECK (category IN ('service', 'product', 'area', 'tool', 'other')),
  frequency INTEGER NOT NULL DEFAULT 1,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.50,
  aliases TEXT[] DEFAULT '{}',
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, term)
);

CREATE INDEX idx_shop_terminology_shop ON shop_terminology(shop_id);
CREATE INDEX idx_shop_terminology_freq ON shop_terminology(shop_id, frequency DESC);
```

### 3-4. VoiceMemoResult 타입 확장

```typescript
// frontend/src/lib/api.ts
export interface KeyComment {
  text: string;
  category: "area" | "product" | "time" | "caution" | "result";
}

export interface VoiceMemoResult {
  // 기존 필드 전부 유지
  customer_name: string | null;
  service_type: string | null;
  products_used: ProductUsed[] | null;
  area: string | null;
  duration_minutes: number | null;
  satisfaction: string | null;
  next_visit_recommendation: string | null;
  summary: string | null;
  // 신규
  key_comments: KeyComment[] | null;
}
```

---

## 4. API Design

### 4-1. POST /api/voice/transcribe (수정)

**변경점:**
- 요청에 `shop_id` 파라미터 추가 (용어 조회용)
- 응답에 `key_comments` 필드 추가
- 처리 후 용어 자동 수집 트리거

**요청:**
```
POST /api/voice/transcribe
Content-Type: multipart/form-data

FormData:
  file: Blob (audio)
  shop_id?: string (optional — 용어 사전 활용)
```

**응답:**
```json
{
  "customer_name": "김미영",
  "service_type": "염색",
  "products_used": [{ "brand": "로레알", "code": "7.1", "area": "뿌리" }],
  "area": "뿌리",
  "duration_minutes": 30,
  "satisfaction": null,
  "next_visit_recommendation": "4주 후 리터치",
  "summary": "뿌리 염색 로레알 7.1 사용, 30분 방치 후 워싱",
  "key_comments": [
    { "text": "뿌리 3cm 리터치", "category": "area" },
    { "text": "로레알 7.1", "category": "product" },
    { "text": "30분 방치", "category": "time" },
    { "text": "두피 민감 주의", "category": "caution" }
  ]
}
```

**내부 로직 변경:**
```typescript
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const rl = checkRateLimit(`voice:${auth.user.id}`, AI_API_RATE_LIMIT);
  if (!rl.allowed) return NextResponse.json({ error: "..." }, { status: 429 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const shopId = formData.get("shop_id") as string | null;

  // ... 기존 검증 ...

  // 신규: 매장 용어 조회
  let terminology: string[] | undefined;
  if (shopId) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("shop_terminology")
      .select("term")
      .eq("shop_id", shopId)
      .order("frequency", { ascending: false })
      .limit(50);
    terminology = data?.map(d => d.term);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extraction = await transcribeAndExtract(buffer, file.name, terminology);

  // 신규: 용어 자동 수집 (비동기, 에러 무시)
  if (shopId && extraction.key_comments) {
    collectTerminology(shopId, extraction).catch(() => {});
  }

  return NextResponse.json(extraction);
}
```

### 4-2. PATCH /shops/{shopId}/treatments/{tid}/photos/{pid} (수정)

**변경점:** `drawing_data` 필드 추가, annotation 검증 확장

**요청 body 확장:**
```typescript
{
  annotations?: PhotoAnnotation[];  // 기존 + type/category/source optional
  photo_type?: string;
  drawing_data?: DrawingData | null;  // 신규
}
```

**검증 로직 추가:**
```typescript
// drawing_data 검증
if (drawing_data !== undefined) {
  if (drawing_data !== null) {
    if (!Array.isArray(drawing_data.shapes)) {
      return NextResponse.json({ error: "drawing_data.shapes must be an array" }, { status: 400 });
    }
    if (drawing_data.shapes.length > 50) {
      return NextResponse.json({ error: "Maximum 50 drawing shapes allowed" }, { status: 400 });
    }
  }
  updateData.drawing_data = drawing_data;
}

// annotation 검증 확장 — type/category/source는 optional 허용
if (annotations !== undefined) {
  // 기존 검증 유지 (10개, 50자, x/y 0-100)
  // 추가: type이 있으면 "pin" | "chip" 검증
  // 추가: category가 있으면 허용 목록 검증
}
```

### 4-3. GET /shops/{shopId}/customers/{cid}/history (신규)

**인증**: `withShopAuth`

**응답:**
```json
{
  "customer": {
    "id": "...",
    "name": "김미영",
    "visit_count": 8,
    "first_visit": "2025-06-15",
    "last_visit": "2026-02-28"
  },
  "treatments": [
    {
      "id": "...",
      "date": "2026-02-28",
      "service_type": "염색",
      "products_used": [{ "brand": "로레알", "code": "7.1" }],
      "satisfaction": "high",
      "photo_count": 3
    }
  ],
  "ai_summary": "8회 방문 단골 고객. 주 시술: 뿌리 염색(로레알 7.1). 4-5주 주기. 두피 민감하여 저자극 약제 선호. 최근 만족도 높음."
}
```

**AI 요약**: GPT-4o 호출 (시술 이력 JSON → 1문단 요약). Rate limit 적용.

### 4-4. GET /shops/{shopId}/analytics/products (신규)

**인증**: `withShopAuth`

**쿼리 파라미터:** `from`, `to` (ISO date)

**응답:**
```json
{
  "period": { "from": "2026-01-01", "to": "2026-03-01" },
  "products": [
    { "brand": "로레알", "code": "7.1", "usage_count": 45, "last_used": "2026-02-28" },
    { "brand": "웰라", "code": "8N", "usage_count": 23, "last_used": "2026-02-25" }
  ],
  "total_treatments": 120
}
```

**구현**: SQL 집계 — `treatments.products_used` JSONB 언래핑 + GROUP BY

```sql
SELECT
  p->>'brand' AS brand,
  p->>'code' AS code,
  COUNT(*) AS usage_count,
  MAX(t.created_at) AS last_used
FROM treatments t,
     jsonb_array_elements(t.products_used) AS p
WHERE t.shop_id = $1
  AND t.created_at BETWEEN $2 AND $3
  AND t.products_used IS NOT NULL
GROUP BY p->>'brand', p->>'code'
ORDER BY usage_count DESC
LIMIT 50;
```

### 4-5. CRUD /shops/{shopId}/terminology (신규)

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/shops/{id}/terminology` | withShopAuth | 용어 목록 (frequency DESC) |
| PUT | `/shops/{id}/terminology/{tid}` | withShopAuth(owner,admin) | 용어 수정 |
| DELETE | `/shops/{id}/terminology/{tid}` | withShopAuth(owner,admin) | 용어 삭제 |

**GET 응답:**
```json
{
  "terms": [
    { "id": "...", "term": "로레알", "category": "product", "frequency": 45, "confidence": 0.92 },
    { "id": "...", "term": "뿌리 리터치", "category": "service", "frequency": 30, "confidence": 0.85 }
  ]
}
```

**자동 수집은 POST /voice/transcribe 내부에서 처리** — 별도 POST 엔드포인트 불필요.

---

## 5. 용어 자동 수집 로직

**파일**: `frontend/src/lib/services/terminology-service.ts` (신규)

```typescript
export async function collectTerminology(
  shopId: string,
  extraction: TreatmentExtractionResult
): Promise<void> {
  const supabase = createServerClient();
  const terms: { term: string; category: string }[] = [];

  // 1. 제품명에서 수집
  extraction.products_used?.forEach(p => {
    if (p.brand) terms.push({ term: p.brand, category: "product" });
  });

  // 2. key_comments에서 수집
  extraction.key_comments?.forEach(c => {
    if (c.text.length >= 2 && c.text.length <= 20) {
      terms.push({ term: c.text, category: c.category });
    }
  });

  // 3. UPSERT — 이미 있으면 frequency + 1
  for (const { term, category } of terms) {
    await supabase.rpc("upsert_terminology", {
      p_shop_id: shopId,
      p_term: term,
      p_category: category,
    });
  }
}
```

**RPC 함수:**
```sql
-- 마이그레이션: 028_shop_terminology.sql
CREATE OR REPLACE FUNCTION upsert_terminology(
  p_shop_id UUID,
  p_term TEXT,
  p_category TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO shop_terminology (shop_id, term, category, frequency, last_used_at)
  VALUES (p_shop_id, p_term, p_category, 1, now())
  ON CONFLICT (shop_id, term)
  DO UPDATE SET
    frequency = shop_terminology.frequency + 1,
    confidence = LEAST(0.95, 0.40 + (shop_terminology.frequency + 1) * 0.05),
    last_used_at = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql;
```

**신뢰도 공식**: `min(0.95, 0.40 + frequency * 0.05)` — premuto ToneProfile 패턴 차용

---

## 6. Implementation Order

### Phase 1: DB + 타입 기반 (Day 1)

```
1. 마이그레이션 027: treatment_photos.drawing_data 컬럼
2. 마이그레이션 028: shop_terminology 테이블 + upsert_terminology RPC
3. KeyComment, DrawingShape, DrawingData 타입 정의 (lib/api.ts)
4. VoiceMemoResult에 key_comments 추가
5. PhotoAnnotation에 type/category/source optional 필드 추가
```

### Phase 2: 음성 파이프라인 확장 (Day 2-3)

```
1. openai-service.ts: TreatmentExtraction 스키마에 key_comments 추가
2. openai-service.ts: transcribeAudio에 terminology 파라미터 + initial_prompt
3. openai-service.ts: extractTreatmentInfo에 칩 추출 프롬프트
4. voice/transcribe API: shop_id 파라미터 + 용어 조회 + 용어 수집
5. VoiceMemo.tsx: 파일 업로드 탭 추가
6. VoiceNote.tsx: confirming 단계에 칩 목록 표시
7. lib/api.ts: transcribeVoiceMemo에 shopId 파라미터 추가
```

### Phase 3: 드로잉 캔버스 (Day 4-6)

```
1. npm install konva react-konva
2. DrawingCanvas 컴포넌트 신규 생성
3. 도구 팔레트 (freehand/circle/arrow/line/eraser)
4. 색상/두께 선택 UI
5. Undo/Redo
6. % 좌표 변환 + 저장
7. PATCH API: drawing_data 검증 + 저장
8. AnnotationOverlay: 드로잉 렌더링 (읽기 전용 Konva Stage)
```

### Phase 4: 칩 배치 통합 (Day 7)

```
1. VoiceChipTray 컴포넌트 신규 생성
2. PhotoAnnotationEditor 리디자인: 3모드 탭 (핀/드로잉/AI칩)
3. 칩 탭 → 사진 위 위치 선택 → annotation 추가 (type: "chip")
4. AnnotationOverlay: 칩 타입 렌더링 (카테고리별 색상 배지)
5. 기존 핀 + 칩 + 드로잉 공존 테스트
```

### Phase 5: 부가 기능 (Day 8-10)

```
1. GET /customers/{cid}/history API + GPT-4o 요약
2. GET /analytics/products API + SQL 집계
3. terminology-service.ts: 자동 수집 로직
4. CRUD /terminology API
5. 용어 관리 UI (설정 페이지)
```

---

## 7. File Change Summary

### 신규 파일

| 파일 | 설명 |
|------|------|
| `components/DrawingCanvas.tsx` | react-konva 기반 드로잉 에디터 |
| `components/VoiceChipTray.tsx` | AI 칩 목록 + 사진 배치 UI |
| `lib/services/terminology-service.ts` | 용어 자동 수집 로직 |
| `app/api/shops/[shopId]/customers/[customerId]/history/route.ts` | 고객 히스토리 |
| `app/api/shops/[shopId]/analytics/products/route.ts` | 제품 트렌드 |
| `app/api/shops/[shopId]/terminology/route.ts` | 용어 목록 |
| `app/api/shops/[shopId]/terminology/[termId]/route.ts` | 용어 수정/삭제 |
| `supabase/migrations/027_add_drawing_data.sql` | drawing_data 컬럼 |
| `supabase/migrations/028_shop_terminology.sql` | 용어 테이블 + RPC |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `components/VoiceMemo.tsx` | 파일 업로드 탭 (mode state) |
| `components/VoiceNote.tsx` | confirming 단계에 칩 목록 |
| `components/PhotoAnnotationEditor.tsx` | 3모드 탭 (핀/드로잉/AI칩) |
| `components/AnnotationOverlay.tsx` | 드로잉 + 칩 렌더링 |
| `lib/api.ts` | KeyComment, DrawingData 타입 + API 메서드 |
| `lib/services/openai-service.ts` | key_comments 스키마 + 용어 주입 |
| `app/api/voice/transcribe/route.ts` | shop_id + 용어 조회 + 수집 |
| `app/api/shops/[shopId]/.../photos/[photoId]/route.ts` | drawing_data 검증 |

---

## 8. Testing Strategy

### 단위 테스트 관점 (수동 검증)

| 시나리오 | 검증 항목 |
|---------|----------|
| 기존 핀 어노테이션 | type 미지정 데이터가 정상 렌더링되는지 |
| 파일 업로드 | 25MB 초과 파일 거부, 다양한 오디오 포맷 |
| 칩 추출 | GPT-4o가 key_comments를 올바른 카테고리로 반환하는지 |
| 드로잉 저장/로드 | % 좌표 변환 정확성, 다른 해상도에서 위치 유지 |
| 드로잉 모바일 | 터치 드로잉, 핀치 줌과 충돌 없는지 |
| 용어 수집 | UPSERT 정상 동작, frequency 증가 |
| 용어 주입 | Whisper initial_prompt에 용어 반영 |

### 하위 호환 테스트

| 시나리오 | 기대 결과 |
|---------|----------|
| 기존 annotations (type 없음) | `"pin"`으로 처리, 정상 표시 |
| drawing_data = null (기존 사진) | 드로잉 없이 핀만 표시 |
| key_comments = null (기존 음성 결과) | 칩 미표시, 기존 동작 유지 |

---

## 9. Performance Considerations

| 항목 | 대응 |
|------|------|
| react-konva 번들 (~50KB) | `next/dynamic({ ssr: false })` — 에디터 페이지에서만 로드 |
| 자유선 포인트 수 | Douglas-Peucker 간소화 (epsilon=0.5%) — 저장 전 적용 |
| 드로잉 읽기 전용 렌더링 | `listening={false}` + 캐싱 |
| 용어 조회 (매 음성 요청마다) | `ORDER BY frequency DESC LIMIT 50` — 인덱스 활용 |
| 히스토리 AI 요약 | 요청 시에만 GPT-4o 호출, 결과 캐싱 없음 (최신 데이터 반영) |
