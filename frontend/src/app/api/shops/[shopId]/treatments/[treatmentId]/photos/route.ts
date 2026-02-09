import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string; treatmentId: string }> }
) {
  const { shopId, treatmentId } = await params;
  const supabase = createServerClient();

  // Verify treatment exists
  const { data: treatment } = await supabase
    .from("treatments")
    .select("id")
    .eq("id", treatmentId)
    .eq("shop_id", shopId)
    .single();

  if (!treatment) {
    return NextResponse.json({ detail: "Treatment not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const photoType = (formData.get("photo_type") as string) || "after";
  const caption = formData.get("caption") as string | null;

  if (!file) {
    return NextResponse.json({ detail: "No file provided" }, { status: 400 });
  }

  // Upload to Supabase Storage
  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `photos/${treatmentId}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("treatment-photos")
    .upload(filePath, buffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ detail: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("treatment-photos")
    .getPublicUrl(filePath);

  // Save photo record
  const { data: photo, error } = await supabase
    .from("treatment_photos")
    .insert({
      treatment_id: treatmentId,
      photo_url: urlData.publicUrl,
      photo_type: photoType,
      caption: caption,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(photo, { status: 201 });
}
