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
    .select("id, title, description, tags, is_published, created_at, photo:treatment_photos(*), shop:shops(id, name, shop_type)")
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

  return NextResponse.json(filtered);
}
