import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string; portfolioId: string }> }
) {
  const { shopId, portfolioId } = await params;
  const supabase = createServerClient();

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
}
