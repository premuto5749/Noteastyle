import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

async function downloadToStorage(
  supabase: ReturnType<typeof createServerClient>,
  sourceUrl: string,
  treatmentPhotoId: string
): Promise<string> {
  // Download image from Replicate
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";

  // Upload to Supabase Storage
  const filePath = `face-swap-results/${treatmentPhotoId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("treatment-photos")
    .upload(filePath, buffer, { contentType, upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage
    .from("treatment-photos")
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const { treatment_photo_id, face_model_id, result_url } = await request.json();

  if (!treatment_photo_id || !face_model_id || !result_url) {
    return NextResponse.json(
      { detail: "treatment_photo_id, face_model_id, and result_url are required" },
      { status: 400 }
    );
  }

  // Download from Replicate and persist to Supabase Storage
  let permanentUrl: string;
  try {
    permanentUrl = await downloadToStorage(supabase, result_url, treatment_photo_id);
  } catch {
    // Fallback: save original URL if download fails
    permanentUrl = result_url;
  }

  const { data, error } = await supabase
    .from("face_swap_results")
    .insert({
      treatment_photo_id,
      face_model_id,
      result_url: permanentUrl,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const treatmentPhotoId = searchParams.get("treatment_photo_id");

  if (!treatmentPhotoId) {
    return NextResponse.json(
      { detail: "treatment_photo_id is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("face_swap_results")
    .select("*")
    .eq("treatment_photo_id", treatmentPhotoId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data);
}
