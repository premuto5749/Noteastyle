import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { escapeIlike } from "@/lib/utils/sanitize";

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
  const sort = searchParams.get("sort") || "latest"; // "latest" | "popular"
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
    const sanitized = escapeIlike(search).replace(/"/g, "");
    query = query.or(`title.ilike.%${sanitized}%,tags.cs.["${sanitized}"]`);
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

  // Batch fetch like counts and user like status
  const portfolioIds = result.map((item: Record<string, unknown>) => item.id as string);

  const [likeCounts, userLikes] = await Promise.all([
    portfolioIds.length > 0
      ? service
          .from("portfolio_likes")
          .select("portfolio_id")
          .in("portfolio_id", portfolioIds)
      : Promise.resolve({ data: [] }),
    portfolioIds.length > 0
      ? service
          .from("portfolio_likes")
          .select("portfolio_id")
          .in("portfolio_id", portfolioIds)
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const likeCountMap: Record<string, number> = {};
  for (const row of (likeCounts.data || [])) {
    const pid = (row as { portfolio_id: string }).portfolio_id;
    likeCountMap[pid] = (likeCountMap[pid] || 0) + 1;
  }
  const userLikedSet = new Set(
    (userLikes.data || []).map((row) => (row as { portfolio_id: string }).portfolio_id)
  );

  const withLikes = result.map((item: Record<string, unknown>) => ({
    ...item,
    like_count: likeCountMap[item.id as string] ?? 0,
    liked: userLikedSet.has(item.id as string),
  }));

  // Sort by popularity if requested
  if (sort === "popular") {
    withLikes.sort((a, b) => (b.like_count as number) - (a.like_count as number));
  }

  return NextResponse.json(withLikes);
}
