import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

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

export const POST = withShopAuth(async (req, params, _member) => {
  const supabase = createServiceClient();
  const shopId = params.shopId;

  const formData = await req.formData();
  const name = formData.get("name") as string;
  const gender = formData.get("gender") as string;
  const file = formData.get("file") as File;

  if (!name || !gender || !file) {
    return NextResponse.json(
      { detail: "name, gender, and file are required" },
      { status: 400 }
    );
  }

  // Upload to Supabase Storage
  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `face-models/${shopId}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("treatment-photos")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ detail: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("treatment-photos")
    .getPublicUrl(filePath);

  const { data, error } = await supabase
    .from("ai_face_models")
    .insert({
      shop_id: shopId,
      name,
      gender,
      image_url: urlData.publicUrl,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
});
