import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const GET = withShopAuth(async (_req, params, _member) => {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("shops")
    .select()
    .eq("id", params.shopId)
    .single();

  if (error) return NextResponse.json({ detail: "Shop not found" }, { status: 404 });
  return NextResponse.json(data);
});
