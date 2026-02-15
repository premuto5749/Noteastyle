import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { faceSwap } from "@/lib/services/replicate-service";

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const { treatment_photo_id, face_model_id, count = 2 } = await request.json();

  if (!treatment_photo_id || !face_model_id) {
    return NextResponse.json(
      { detail: "treatment_photo_id and face_model_id are required" },
      { status: 400 }
    );
  }

  // Get the treatment photo URL
  const { data: photo } = await supabase
    .from("treatment_photos")
    .select("photo_url")
    .eq("id", treatment_photo_id)
    .single();

  if (!photo) {
    return NextResponse.json({ detail: "Treatment photo not found" }, { status: 404 });
  }

  // Get the face model image URL
  const { data: model } = await supabase
    .from("ai_face_models")
    .select("image_url")
    .eq("id", face_model_id)
    .single();

  if (!model) {
    return NextResponse.json({ detail: "Face model not found" }, { status: 404 });
  }

  try {
    // Call Replicate API `count` times in parallel
    const jobPromises = Array.from({ length: count }, () =>
      faceSwap(model.image_url, photo.photo_url)
    );
    const jobs = await Promise.all(jobPromises);

    return NextResponse.json({ jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Face swap generation failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
