import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { faceSwap } from "@/lib/services/replicate-service";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, AI_API_RATE_LIMIT } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const rl = checkRateLimit(`face-swap:${auth.user.id}`, AI_API_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const sourcePhotoId = searchParams.get("source_photo_id");
  const targetPhotoId = searchParams.get("target_photo_id");

  if (!sourcePhotoId || !targetPhotoId) {
    return NextResponse.json(
      { detail: "source_photo_id and target_photo_id are required" },
      { status: 400 }
    );
  }

  const { data: source } = await supabase
    .from("treatment_photos")
    .select("photo_url")
    .eq("id", sourcePhotoId)
    .single();

  if (!source) return NextResponse.json({ detail: "Source photo not found" }, { status: 404 });

  const { data: target } = await supabase
    .from("treatment_photos")
    .select("photo_url")
    .eq("id", targetPhotoId)
    .single();

  if (!target) return NextResponse.json({ detail: "Target photo not found" }, { status: 404 });

  try {
    const result = await faceSwap(source.photo_url, target.photo_url);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Face swap failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
