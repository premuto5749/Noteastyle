import { NextResponse } from "next/server";
import { withShopAuth } from "@/lib/auth/shop";
import { createServiceClient } from "@/lib/supabase/server";

export const DELETE = withShopAuth<{ shopId: string; bookmarkId: string }>(
  async (_req, params, _member) => {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("portfolio_bookmarks")
      .delete()
      .eq("id", params.bookmarkId)
      .eq("shop_id", params.shopId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ status: "deleted" });
  },
  { roles: ["owner", "admin"] }
);
