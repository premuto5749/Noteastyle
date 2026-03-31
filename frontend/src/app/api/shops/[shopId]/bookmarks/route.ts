import { NextRequest, NextResponse } from "next/server";
import { withShopAuth } from "@/lib/auth/shop";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withShopAuth(
  async (_req, params, _member) => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("portfolio_bookmarks")
      .select(
        "id, portfolio_id, created_at, portfolio:portfolios(id, title, tags, photo:treatment_photos(*), shop:shops(id, name), member:shop_members(id, display_name, profile:member_profiles(profile_photo_url, is_public)))"
      )
      .eq("shop_id", params.shopId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? []);
  },
  { roles: ["owner", "admin"] }
);

export const POST = withShopAuth(
  async (req: NextRequest, params, member) => {
    const body = await req.json();
    const portfolioId = body.portfolio_id;
    if (!portfolioId) {
      return NextResponse.json({ error: "portfolio_id is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("portfolio_bookmarks")
      .select("id")
      .eq("portfolio_id", portfolioId)
      .eq("shop_id", params.shopId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "already bookmarked" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("portfolio_bookmarks")
      .insert({
        portfolio_id: portfolioId,
        shop_id: params.shopId,
        user_id: member.user_id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  },
  { roles: ["owner", "admin"] }
);
