import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * PUT /api/admin/face-models/{modelId}
 * 글로벌 모델 수정
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
 * 글로벌 모델 비활성화
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
