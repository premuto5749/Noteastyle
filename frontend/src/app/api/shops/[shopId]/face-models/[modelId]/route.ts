import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string; modelId: string }> }
) {
  const { shopId, modelId } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("ai_face_models")
    .update({ is_active: false })
    .eq("id", modelId)
    .eq("shop_id", shopId);

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json({ status: "ok" });
}
