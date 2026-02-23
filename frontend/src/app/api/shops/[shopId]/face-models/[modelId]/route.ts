import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const DELETE = withShopAuth<{ shopId: string; modelId: string }>(
  async (_req, params, _member) => {
    const supabase = createServiceClient();
    const { shopId, modelId } = params;

    const { error } = await supabase
      .from("ai_face_models")
      .update({ is_active: false })
      .eq("id", modelId)
      .eq("shop_id", shopId);

    if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
    return NextResponse.json({ status: "ok" });
  },
  { roles: ["owner", "admin"] }
);
