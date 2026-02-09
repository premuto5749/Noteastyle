import { NextRequest, NextResponse } from "next/server";
import { transcribeAndExtract } from "@/lib/services/openai-service";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ detail: "No audio file provided" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const extraction = await transcribeAndExtract(buffer, file.name || "voice-memo.webm");

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
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
