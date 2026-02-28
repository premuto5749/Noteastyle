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
