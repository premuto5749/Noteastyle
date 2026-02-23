import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const PUT = withShopAuth<{ shopId: string; portfolioId: string }>(
  async (_req, params, _member) => {
    const supabase = createServiceClient();
    const { shopId, portfolioId } = params;

    // Get current state
    const { data: current } = await supabase
      .from("portfolios")
      .select("is_published")
      .eq("id", portfolioId)
      .eq("shop_id", shopId)
      .single();

    if (!current) {
      return NextResponse.json({ detail: "Portfolio item not found" }, { status: 404 });
    }

    // Toggle publish
    const { data, error } = await supabase
      .from("portfolios")
      .update({ is_published: !current.is_published })
      .eq("id", portfolioId)
      .eq("shop_id", shopId)
      .select("*, photo:treatment_photos(*)")
      .single();

    if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
    return NextResponse.json(data);
  },
  { roles: ["owner", "admin"] }
);
