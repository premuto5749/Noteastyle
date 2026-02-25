import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  // Auth: require login (but no shop membership check)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const shopType = searchParams.get("shop_type");
  const search = searchParams.get("search");
  const skip = parseInt(searchParams.get("skip") || "0");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  const service = createServiceClient();

  let query = service
    .from("portfolios")
    .select("id, title, description, tags, is_published, created_at, photo:treatment_photos(*), shop:shops(id, name, shop_type), member:shop_members(id, display_name, profile:member_profiles(profile_photo_url, is_public))")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .range(skip, skip + limit - 1);

  if (shopType) {
    query = query.eq("shop.shop_type", shopType);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,tags.cs.["${search}"]`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 400 });
  }

  // Filter out items where shop is null (shop_type filter is post-filter with inner joins)
  const filtered = shopType
    ? (data || []).filter((item: Record<string, unknown>) => item.shop !== null)
    : data || [];

  // Transform member + profile into flat designer badge
  const result = filtered.map((item: Record<string, unknown>) => {
    const member = item.member as { id: string; display_name: string; profile: { profile_photo_url: string | null; is_public: boolean } | null } | null;
    const designer = member?.profile?.is_public
      ? {
          id: member.id,
          display_name: member.display_name,
          profile_photo_url: member.profile.profile_photo_url,
          is_public: true,
        }
      : null;
    const { member: _member, ...rest } = item;
    return { ...rest, designer };
  });

  return NextResponse.json(result);
}
