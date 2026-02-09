import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const supabase = createServerClient();
  const body = await request.json();

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
      title: body.title ?? null,
      description: body.description ?? null,
      tags: body.tags ?? null,
    })
    .select("*, photo:treatment_photos(*)")
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
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
}
