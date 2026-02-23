import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const GET = withShopAuth(async (_req, params, _member) => {
  const supabase = createServiceClient();

  const { count, error } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", params.shopId);

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json({ count: count ?? 0 });
});
