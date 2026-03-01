import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { faceSwap } from "@/lib/services/fal-service";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, AI_API_RATE_LIMIT } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const rl = checkRateLimit(`face-swap-gen:${auth.user.id}`, AI_API_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

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
    // fal.ai는 빠르고 안정적이므로 병렬 실행 가능
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
