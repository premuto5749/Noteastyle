import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { faceSwap } from "@/lib/services/replicate-service";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function faceSwapWithRetry(
  sourceUrl: string,
  targetUrl: string,
  maxRetries = 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await faceSwap(sourceUrl, targetUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("429") && attempt < maxRetries - 1) {
        await sleep(12000);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const { treatment_photo_id, face_model_id, count = 2 } = await request.json();

  if (!treatment_photo_id || !face_model_id) {
    return NextResponse.json(
      { detail: "treatment_photo_id and face_model_id are required" },
      { status: 400 }
    );
  }

  const { data: photo } = await supabase
    .from("treatment_photos")
    .select("photo_url")
    .eq("id", treatment_photo_id)
    .single();

  if (!photo) {
    return NextResponse.json({ detail: "Treatment photo not found" }, { status: 404 });
  }

  const { data: model } = await supabase
    .from("ai_face_models")
    .select("image_url")
    .eq("id", face_model_id)
    .single();

  if (!model) {
    return NextResponse.json({ detail: "Face model not found" }, { status: 404 });
  }

  try {
    // Call Replicate API sequentially with retry to avoid rate limits
    const jobs = [];
    for (let i = 0; i < count; i++) {
      if (i > 0) await sleep(2000);
      const job = await faceSwapWithRetry(model.image_url, photo.photo_url);
      jobs.push(job);
    }

    return NextResponse.json({ jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Face swap generation failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
