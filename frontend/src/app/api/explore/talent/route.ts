import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { escapeIlike } from "@/lib/utils/sanitize";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const shopType = searchParams.get("shop_type");
  const search = searchParams.get("search");
  const shopId = searchParams.get("shop_id"); // requesting shop — for auto-block filtering
  const skip = parseInt(searchParams.get("skip") || "0");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  const supabase = createServiceClient();

  // Build query: member_profiles joined with shop_members and shops
  let query = supabase
    .from("member_profiles")
    .select(
      `member_id,
       display_name,
       specialty,
       profile_photo_url,
       career_years,
       is_public,
       open_to_proposals,
       blocked_shop_ids,
       member:shop_members!inner(
         id,
         shop_id,
         is_active,
         shop:shops(id, name, shop_type)
       ),
       portfolio_count:portfolios(count)`
    )
    .eq("open_to_proposals", true)
    .eq("is_public", true)
    .eq("member.is_active", true)
    .range(skip, skip + limit - 1);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Post-filter: exclude blocked shops and own shop members
  type RawItem = {
    member_id: string;
    display_name: string;
    specialty: string | null;
    profile_photo_url: string | null;
    career_years: number | null;
    open_to_proposals: boolean;
    blocked_shop_ids: string[];
    member: { id: string; shop_id: string; is_active: boolean; shop: { id: string; name: string; shop_type: string } | null } | null;
    portfolio_count: { count: number }[];
  };

  const filtered = (data as RawItem[]).filter((item) => {
    const member = item.member;
    if (!member || !member.shop) return false;
    if (!item.open_to_proposals) return false;
    // Exclude own shop members
    if (shopId && member.shop_id === shopId) return false;
    // Exclude if this shop is in blocked list
    if (shopId && item.blocked_shop_ids?.includes(shopId)) return false;
    return true;
  });

  // Apply search filter
  const searched = search
    ? filtered.filter((item) => {
        const q = escapeIlike(search).toLowerCase();
        return (
          item.display_name?.toLowerCase().includes(q) ||
          item.specialty?.toLowerCase().includes(q)
        );
      })
    : filtered;

  // Apply shop_type filter
  const result = shopType
    ? searched.filter((item) => item.member?.shop?.shop_type === shopType)
    : searched;

  return NextResponse.json(
    result.map((item) => ({
      member_id: item.member_id,
      display_name: item.display_name,
      specialty: item.specialty,
      profile_photo_url: item.profile_photo_url,
      career_years: item.career_years,
      portfolio_count: item.portfolio_count?.[0]?.count ?? 0,
      shop: item.member?.shop
        ? {
            id: item.member.shop.id,
            name: item.member.shop.name,
            shop_type: item.member.shop.shop_type,
          }
        : null,
    }))
  );
}
