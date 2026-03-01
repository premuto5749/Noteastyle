import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const GET = withShopAuth<{
  shopId: string;
}>(async (_req, params) => {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("shop_terminology")
    .select("id, term, category, frequency, confidence, aliases, last_used_at, created_at")
    .eq("shop_id", params.shopId)
    .order("frequency", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ terms: data || [] });
});
