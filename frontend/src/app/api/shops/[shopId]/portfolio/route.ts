import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const POST = withShopAuth(async (req, params, member) => {
  const supabase = createServiceClient();
  const body = await req.json();
  const shopId = params.shopId;

  // Check for duplicate portfolio entry
  const { data: existing } = await supabase
    .from("portfolios")
    .select("id")
    .eq("photo_id", body.photo_id)
    .eq("shop_id", shopId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ detail: "이미 포트폴리오에 추가된 사진입니다." }, { status: 409 });
  }

  // Mark photo as portfolio
  await supabase
    .from("treatment_photos")
    .update({ is_portfolio: true })
    .eq("id", body.photo_id);

  const { data, error } = await supabase
    .from("portfolios")
    .insert({
      shop_id: shopId,
      photo_id: body.photo_id,
      member_id: member.id,
      title: body.title ?? null,
      description: body.description ?? null,
      tags: body.tags ?? null,
    })
    .select("*, photo:treatment_photos(*)")
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
});

export const GET = withShopAuth(async (req, params, _member) => {
  const supabase = createServiceClient();
  const shopId = params.shopId;
  const { searchParams } = new URL(req.url);
  const publishedOnly = searchParams.get("published_only") === "true";
  const skip = parseInt(searchParams.get("skip") || "0");
  const limit = parseInt(searchParams.get("limit") || "50");

  let query = supabase
    .from("portfolios")
    .select("*, photo:treatment_photos(*)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .range(skip, skip + limit - 1);

  if (publishedOnly) query = query.eq("is_published", true);

  const { data, error } = await query;

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data);
});
