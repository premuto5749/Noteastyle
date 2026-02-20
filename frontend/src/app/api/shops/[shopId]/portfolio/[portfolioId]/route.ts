import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string; portfolioId: string }> }
) {
  const { shopId, portfolioId } = await params;
  const supabase = createServerClient();

  // Get portfolio item to find associated photo
  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("photo_id")
    .eq("id", portfolioId)
    .eq("shop_id", shopId)
    .single();

  if (!portfolio) {
    return NextResponse.json({ detail: "Portfolio item not found" }, { status: 404 });
  }

  // Reset is_portfolio flag on the treatment photo
  await supabase
    .from("treatment_photos")
    .update({ is_portfolio: false })
    .eq("id", portfolio.photo_id);

  // Delete portfolio item
  const { error } = await supabase
    .from("portfolios")
    .delete()
    .eq("id", portfolioId)
    .eq("shop_id", shopId);

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json({ status: "deleted" });
}
