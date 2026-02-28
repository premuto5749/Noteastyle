# Face Swap 모델 관리 고도화 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 슈퍼 어드민이 기본 제공 Face Swap 모델(소스 얼굴 이미지)을 등록/관리하고, 모든 매장에서 기본 모델 + 커스텀 모델을 합쳐서 사용할 수 있게 한다.

**Architecture:** 기존 `ai_face_models` 테이블에 `is_global`, `category`, `sort_order` 컬럼을 추가하고 `shop_id`를 nullable로 변경. 관리자 API 4개 신규, 매장 모델 조회 API 1개 수정, 관리자 UI 페이지 1개 신규, FaceSwapFlow 모델 선택 UI 수정.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (PostgreSQL + Storage), Tailwind CSS v4

---

## Task 1: DB 마이그레이션

**Files:**
- Create: `supabase/migrations/024_face_model_global.sql`

**Step 1: 마이그레이션 SQL 작성**

```sql
-- 024_face_model_global.sql
-- Face Swap 모델에 글로벌(기본 제공) 지원 추가

-- 1. shop_id를 nullable로 변경 (글로벌 모델은 shop_id = NULL)
ALTER TABLE ai_face_models ALTER COLUMN shop_id DROP NOT NULL;

-- 2. 새 컬럼 추가
ALTER TABLE ai_face_models ADD COLUMN is_global boolean NOT NULL DEFAULT false;
ALTER TABLE ai_face_models ADD COLUMN category text NOT NULL DEFAULT 'uncategorized';
ALTER TABLE ai_face_models ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- 3. 글로벌 모델 조회용 partial index
CREATE INDEX idx_face_models_global ON ai_face_models (is_global, sort_order) WHERE is_global = true;
```

**Step 2: 마이그레이션 적용 확인**

Run: `cd frontend && npx supabase db push` (로컬 Supabase 사용 시)
또는 원격 Supabase Dashboard에서 SQL Editor로 직접 실행.

Expected: 테이블에 `is_global`, `category`, `sort_order` 컬럼 추가됨, `shop_id` nullable됨.

**Step 3: 커밋**

```bash
git add supabase/migrations/024_face_model_global.sql
git commit -m "feat: ai_face_models에 is_global, category, sort_order 추가 (마이그레이션 024)"
```

---

## Task 2: TypeScript 타입 업데이트

**Files:**
- Modify: `frontend/src/lib/api.ts:115-123` (FaceModel 인터페이스)

**Step 1: FaceModel 인터페이스에 새 필드 추가**

현재 `frontend/src/lib/api.ts:115-123`:
```typescript
export interface FaceModel {
  id: string;
  shop_id: string;
  name: string;
  gender: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
}
```

변경 후:
```typescript
export interface FaceModel {
  id: string;
  shop_id: string | null;
  name: string;
  gender: string;
  image_url: string;
  is_active: boolean;
  is_global: boolean;
  category: string;
  sort_order: number;
  created_at: string;
}
```

**Step 2: 커밋**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: FaceModel 타입에 is_global, category, sort_order 추가"
```

---

## Task 3: 매장 모델 조회 API 수정 (글로벌 모델 포함)

**Files:**
- Modify: `frontend/src/app/api/shops/[shopId]/face-models/route.ts` (GET 핸들러)

**Step 1: GET 핸들러에서 글로벌 모델 포함 반환**

현재 코드 (`route.ts:5-18`):
```typescript
export const GET = withShopAuth(async (_req, params, _member) => {
  const supabase = createServiceClient();
  const shopId = params.shopId;

  const { data, error } = await supabase
    .from("ai_face_models")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data);
});
```

변경 후:
```typescript
export const GET = withShopAuth(async (_req, params, _member) => {
  const supabase = createServiceClient();
  const shopId = params.shopId;

  // 매장 모델 + 글로벌 모델 합쳐서 반환
  const { data, error } = await supabase
    .from("ai_face_models")
    .select("*")
    .eq("is_active", true)
    .or(`shop_id.eq.${shopId},is_global.eq.true`)
    .order("is_global", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data);
});
```

**핵심 변경**: `.eq("shop_id", shopId)` → `.or(...)` 로 글로벌 모델도 포함. 정렬은 글로벌 먼저 → sort_order → 최신순.

**Step 2: 빌드 확인**

Run: `cd frontend && npm run build`
Expected: 빌드 성공 (타입 에러 없음)

**Step 3: 커밋**

```bash
git add frontend/src/app/api/shops/[shopId]/face-models/route.ts
git commit -m "feat: 매장 모델 조회 API에 글로벌 모델 포함 반환"
```

---

## Task 4: 관리자 Face Model API (CRUD 4개)

**Files:**
- Create: `frontend/src/app/api/admin/face-models/route.ts` (GET, POST)
- Create: `frontend/src/app/api/admin/face-models/[modelId]/route.ts` (PUT, DELETE)

**Step 1: GET + POST 라우트 생성**

`frontend/src/app/api/admin/face-models/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/face-models
 * 글로벌 모델 목록 (비활성 포함)
 */
export async function GET() {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return error;

  const supabase = createServiceClient();

  const { data, error: dbError } = await supabase
    .from("ai_face_models")
    .select("*")
    .eq("is_global", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/admin/face-models
 * 글로벌 모델 생성 (FormData: name, gender, category, file)
 */
export async function POST(request: NextRequest) {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return error;

  const formData = await request.formData();
  const name = formData.get("name") as string;
  const gender = formData.get("gender") as string;
  const category = (formData.get("category") as string) || "uncategorized";
  const file = formData.get("file") as File;

  if (!name || !gender || !file) {
    return NextResponse.json(
      { error: "name, gender, file은 필수입니다." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Upload to Storage (global 경로)
  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `face-models/global/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("treatment-photos")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("treatment-photos")
    .getPublicUrl(filePath);

  // Insert DB (shop_id = null, is_global = true)
  const { data, error: dbError } = await supabase
    .from("ai_face_models")
    .insert({
      shop_id: null,
      name,
      gender,
      image_url: urlData.publicUrl,
      is_global: true,
      category,
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
```

**Step 2: PUT + DELETE 라우트 생성**

`frontend/src/app/api/admin/face-models/[modelId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * PUT /api/admin/face-models/{modelId}
 * 글로벌 모델 수정 (name, gender, category, sort_order, is_active)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return error;

  const { modelId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "유효하지 않은 JSON입니다." }, { status: 400 });
  }

  // 허용 필드만 추출
  const allowedFields = ["name", "gender", "category", "sort_order", "is_active"];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "수정할 필드가 없습니다." }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error: dbError } = await supabase
    .from("ai_face_models")
    .update(updates)
    .eq("id", modelId)
    .eq("is_global", true)
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "모델을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/admin/face-models/{modelId}
 * 글로벌 모델 비활성화 (soft delete)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return error;

  const { modelId } = await params;

  const supabase = createServiceClient();

  const { error: dbError } = await supabase
    .from("ai_face_models")
    .update({ is_active: false })
    .eq("id", modelId)
    .eq("is_global", true);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
```

**Step 3: 빌드 확인**

Run: `cd frontend && npm run build`
Expected: 빌드 성공

**Step 4: 커밋**

```bash
git add frontend/src/app/api/admin/face-models/
git commit -m "feat: 관리자 Face Model CRUD API (GET/POST/PUT/DELETE)"
```

---

## Task 5: 관리자 Face Model 관리 페이지

**Files:**
- Create: `frontend/src/app/admin/face-models/page.tsx`
- Modify: `frontend/src/app/admin/page.tsx:128-162` (관리 메뉴에 링크 추가)

**Step 1: 관리 페이지 생성**

`frontend/src/app/admin/face-models/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import Image from "next/image";
import type { FaceModel } from "@/lib/api";

export default function AdminFaceModelsPage() {
  const { isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const [models, setModels] = useState<FaceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAdmin) router.push("/");
  }, [isLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) fetchModels();
  }, [isAdmin]);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/face-models");
      if (res.ok) {
        setModels(await res.json());
      } else {
        setError("모델 목록을 불러오지 못했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!name || !file) return;
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("gender", gender);
      formData.append("category", category || "uncategorized");
      formData.append("file", file);

      const res = await fetch("/api/admin/face-models", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        await fetchModels();
        setShowAdd(false);
        setName("");
        setCategory("");
        setFile(null);
      } else {
        const data = await res.json();
        setError(data.error || "모델 추가에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
    setSubmitting(false);
  };

  const handleToggleActive = async (model: FaceModel) => {
    if (model.is_active) {
      if (!confirm(`"${model.name}" 모델을 비활성화하시겠습니까?`)) return;
      try {
        await fetch(`/api/admin/face-models/${model.id}`, { method: "DELETE" });
        await fetchModels();
      } catch {
        setError("비활성화에 실패했습니다.");
      }
    } else {
      try {
        await fetch(`/api/admin/face-models/${model.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: true }),
        });
        await fetchModels();
      } catch {
        setError("활성화에 실패했습니다.");
      }
    }
  };

  const startEdit = (model: FaceModel) => {
    setEditingId(model.id);
    setEditName(model.name);
    setEditGender(model.gender);
    setEditCategory(model.category);
    setEditSortOrder(model.sort_order);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/admin/face-models/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          gender: editGender,
          category: editCategory,
          sort_order: editSortOrder,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchModels();
      } else {
        const data = await res.json();
        setError(data.error || "수정에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
  };

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-subtle text-sm">확인 중...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto">
      <PageHeader title="기본 Face Model 관리" backHref="/admin" />

      <div className="px-4 pb-24">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Add button */}
        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full mb-4 py-3 border border-dashed border-input rounded-xl text-sm text-muted-foreground active:bg-surface"
          >
            + 기본 모델 추가
          </button>
        ) : (
          <div className="mb-4 bg-surface border border-border rounded-xl p-4 space-y-3">
            <input
              type="text"
              placeholder="모델 이름 (예: 여성 A)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setGender("female")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  gender === "female"
                    ? "bg-accent text-accent-foreground"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                여성
              </button>
              <button
                onClick={() => setGender("male")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  gender === "male"
                    ? "bg-accent text-accent-foreground"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                남성
              </button>
            </div>
            <input
              type="text"
              placeholder="카테고리 (예: 여성-20대)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
            />
            <label className="block text-center text-sm py-2 rounded-lg cursor-pointer bg-card border border-border text-muted-foreground">
              {file ? file.name : "얼굴 사진 선택"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAdd(false); setName(""); setCategory(""); setFile(null); }}
                className="flex-1 py-2 text-sm text-muted-foreground border border-border rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleAdd}
                disabled={!name || !file || submitting}
                className="flex-1 py-2 text-sm text-accent-foreground bg-accent rounded-lg disabled:opacity-50"
              >
                {submitting ? "추가 중..." : "추가"}
              </button>
            </div>
          </div>
        )}

        {/* Model list */}
        {loading ? (
          <div className="text-center py-8 text-subtle text-sm">불러오는 중...</div>
        ) : models.length === 0 ? (
          <div className="text-center py-8 text-subtle text-sm">
            등록된 기본 모델이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {models.map((model) => (
              <div
                key={model.id}
                className={`p-3 bg-card border rounded-xl ${
                  model.is_active ? "border-border" : "border-border opacity-50"
                }`}
              >
                {editingId === model.id ? (
                  /* Edit mode */
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
                    />
                    <div className="flex gap-2">
                      <select
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value)}
                        className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
                      >
                        <option value="female">여성</option>
                        <option value="male">남성</option>
                      </select>
                      <input
                        type="text"
                        placeholder="카테고리"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">정렬:</label>
                      <input
                        type="number"
                        value={editSortOrder}
                        onChange={(e) => setEditSortOrder(Number(e.target.value))}
                        className="w-20 text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)} className="flex-1 py-2 text-sm text-muted-foreground border border-border rounded-lg">취소</button>
                      <button onClick={handleSaveEdit} className="flex-1 py-2 text-sm text-accent-foreground bg-accent rounded-lg">저장</button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-muted relative flex-shrink-0">
                      <Image
                        src={model.image_url}
                        alt={model.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{model.name}</span>
                        {!model.is_active && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400">비활성</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {model.gender === "male" ? "남성" : "여성"}
                        {model.category !== "uncategorized" && ` · ${model.category}`}
                        {` · 정렬: ${model.sort_order}`}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(model)}
                        className="p-2 text-muted-foreground hover:text-foreground"
                        title="수정"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggleActive(model)}
                        className={`p-2 ${model.is_active ? "text-red-500" : "text-green-500"}`}
                        title={model.is_active ? "비활성화" : "활성화"}
                      >
                        {model.is_active ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: 관리자 메인 페이지에 링크 추가**

`frontend/src/app/admin/page.tsx` — 기존 "사이트 설정 관리" `<a>` 태그 뒤에 (line ~161, `</a>` 이후 `</div>` 이전) 새 링크를 추가:

```tsx
            <a
              href="/admin/face-models"
              className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    기본 Face Model 관리
                  </div>
                  <div className="text-xs text-muted-foreground">
                    모든 매장에 제공되는 기본 AI 얼굴 모델
                  </div>
                </div>
              </div>
              <svg
                className="w-5 h-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
```

**Step 3: 빌드 확인**

Run: `cd frontend && npm run build`
Expected: 빌드 성공

**Step 4: 커밋**

```bash
git add frontend/src/app/admin/face-models/page.tsx frontend/src/app/admin/page.tsx
git commit -m "feat: 관리자 기본 Face Model 관리 페이지 추가"
```

---

## Task 6: FaceSwapFlow 모델 선택에 "기본" 배지 추가

**Files:**
- Modify: `frontend/src/components/FaceSwapFlow.tsx:249-272` (모델 선택 UI)

**Step 1: 모델 선택 카드에 글로벌 배지 추가**

현재 코드 (`FaceSwapFlow.tsx:250-271`):
```tsx
<div className="flex gap-3">
  {models.map((model) => (
    <button
      key={model.id}
      onClick={() => handleModelSelect(model)}
      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border active:border-accent active:bg-info-bg transition-colors flex-1"
    >
      <div className="w-16 h-16 rounded-full overflow-hidden bg-muted relative">
        <Image
          src={model.image_url}
          alt={model.name}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>
      <span className="text-xs font-medium text-foreground">{model.name}</span>
      <span className="text-[10px] text-subtle">
        {model.gender === "male" ? "남성" : "여성"}
      </span>
    </button>
  ))}
</div>
```

변경 후:
```tsx
<div className="flex gap-3 overflow-x-auto pb-2">
  {models.map((model) => (
    <button
      key={model.id}
      onClick={() => handleModelSelect(model)}
      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border active:border-accent active:bg-info-bg transition-colors min-w-[90px]"
    >
      <div className="w-16 h-16 rounded-full overflow-hidden bg-muted relative">
        <Image
          src={model.image_url}
          alt={model.name}
          fill
          className="object-cover"
          sizes="64px"
        />
        {model.is_global && (
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-accent text-accent-foreground text-[9px] font-bold rounded-full">
            기본
          </div>
        )}
      </div>
      <span className="text-xs font-medium text-foreground">{model.name}</span>
      <span className="text-[10px] text-subtle">
        {model.gender === "male" ? "남성" : "여성"}
      </span>
    </button>
  ))}
</div>
```

**핵심 변경 3개:**
1. `flex-1` → `min-w-[90px]` + `overflow-x-auto pb-2` (모델이 많아지면 가로 스크롤)
2. `model.is_global && (...)` 조건부 "기본" 배지 추가
3. 배지는 아바타 하단 중앙에 겹쳐서 표시

**Step 2: 빌드 확인**

Run: `cd frontend && npm run build`
Expected: 빌드 성공

**Step 3: 커밋**

```bash
git add frontend/src/components/FaceSwapFlow.tsx
git commit -m "feat: FaceSwapFlow 모델 선택에 글로벌 모델 '기본' 배지 표시"
```

---

## Task 7: 빌드 검증 + 최종 커밋

**Step 1: 전체 빌드 검증**

Run: `cd frontend && npm run build`
Expected: 빌드 성공, 타입 에러 없음

**Step 2: lint 검증**

Run: `cd frontend && npm run lint`
Expected: 에러 없음

**Step 3: 수동 테스트 체크리스트 (선택)**

개발 서버를 띄워서 확인:
```bash
cd frontend && npm run dev
```

- [ ] `/admin` → "기본 Face Model 관리" 메뉴 링크 표시됨
- [ ] `/admin/face-models` → 기본 모델 추가/수정/비활성화 동작
- [ ] 시술 상세 → "AI Faceswap" → 모델 선택 단계에 글로벌 모델 + 매장 모델 합쳐서 표시
- [ ] 글로벌 모델에 "기본" 배지 표시
- [ ] 글로벌 모델이 매장 모델보다 먼저 정렬됨
