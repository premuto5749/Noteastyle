import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

// GET - List members
export const GET = withShopAuth(async (_req, _params, member) => {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shop_members")
    .select("id, user_id, shop_id, role, display_name, specialty, phone, is_active, joined_at, created_at")
    .eq("shop_id", member.shop_id)
    .eq("is_active", true)
    .order("joined_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
});
