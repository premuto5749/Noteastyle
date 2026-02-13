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
  const mediaType = (formData.get("media_type") as string) || "photo";
  const videoDuration = formData.get("video_duration_seconds") as string | null;
  const thumbnail = formData.get("thumbnail") as File | null;

  if (!file) {
    return NextResponse.json({ detail: "No file provided" }, { status: 400 });
  }

  // Upload main file to Supabase Storage
  const ext = file.name.split(".").pop() || (mediaType === "video" ? "webm" : "jpg");
  const prefix = mediaType === "video" ? "videos" : "photos";
  const filePath = `${prefix}/${treatmentId}/${randomUUID()}.${ext}`;
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

  // Upload thumbnail if provided (for videos)
  let thumbnailUrl: string | null = null;
  if (thumbnail && mediaType === "video") {
    const thumbExt = thumbnail.name.split(".").pop() || "jpg";
    const thumbPath = `thumbnails/${treatmentId}/${randomUUID()}.${thumbExt}`;
    const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer());

    const { error: thumbError } = await supabase.storage
      .from("treatment-photos")
      .upload(thumbPath, thumbBuffer, { contentType: thumbnail.type });

    if (!thumbError) {
      const { data: thumbUrlData } = supabase.storage
        .from("treatment-photos")
        .getPublicUrl(thumbPath);
      thumbnailUrl = thumbUrlData.publicUrl;
    }
  }

  // Save record
  const { data: photo, error } = await supabase
    .from("treatment_photos")
    .insert({
      treatment_id: treatmentId,
      photo_url: urlData.publicUrl,
      photo_type: photoType,
      caption: caption,
      media_type: mediaType,
      video_duration_seconds: videoDuration ? parseInt(videoDuration) : null,
      thumbnail_url: thumbnailUrl,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(photo, { status: 201 });
}
