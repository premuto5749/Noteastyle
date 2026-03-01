import { NextRequest, NextResponse } from "next/server";
import { transcribeAndExtract } from "@/lib/services/openai-service";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, AI_API_RATE_LIMIT } from "@/lib/rate-limit";
import { getShopTerminology, collectTerminology } from "@/lib/services/terminology-service";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const rl = checkRateLimit(`voice:${auth.user.id}`, AI_API_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const shopId = formData.get("shop_id") as string | null;

  if (!file) {
    return NextResponse.json({ detail: "No audio file provided" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length === 0) {
      return NextResponse.json({ detail: "오디오 파일이 비어 있습니다." }, { status: 400 });
    }

    // 매장 용어 조회 (있으면 Whisper/GPT-4o 프롬프트에 주입)
    let terminology: string[] | undefined;
    if (shopId) {
      terminology = await getShopTerminology(shopId);
    }

    const extraction = await transcribeAndExtract(
      buffer,
      file.name || "voice-memo.webm",
      terminology
    );

    // 용어 자동 수집 (비동기, 에러 무시)
    if (shopId && extraction.key_comments) {
      collectTerminology(shopId, extraction).catch(() => {});
    }

    return NextResponse.json({
      customer_name: extraction.customer_name ?? null,
      service_type: extraction.service_type ?? null,
      products_used: extraction.products_used?.map((p) => ({
        brand: p.brand ?? "",
        code: p.code ?? null,
        area: p.area ?? null,
      })) ?? null,
      area: extraction.area ?? null,
      duration_minutes: extraction.duration_minutes ?? null,
      satisfaction: extraction.satisfaction ?? null,
      next_visit_recommendation: extraction.next_visit_recommendation ?? null,
      summary: extraction.summary ?? null,
      key_comments: extraction.key_comments ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
