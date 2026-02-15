import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ resultId: string }> }
) {
  const { resultId } = await params;
  const supabase = createServerClient();

  // Get the result record
  const { data: result, error: resultError } = await supabase
    .from("face_swap_results")
    .select("*")
    .eq("id", resultId)
    .single();

  if (resultError || !result) {
    return NextResponse.json({ detail: "Result not found" }, { status: 404 });
  }

  // Mark result as selected
  await supabase
    .from("face_swap_results")
    .update({ is_selected: true })
    .eq("id", resultId);

  // Update treatment_photos.face_swapped_url
  await supabase
    .from("treatment_photos")
    .update({ face_swapped_url: result.result_url })
    .eq("id", result.treatment_photo_id);

  // Get shop_id via treatment_photos → treatments
  const { data: photoData } = await supabase
    .from("treatment_photos")
    .select("treatment_id")
    .eq("id", result.treatment_photo_id)
    .single();

  let shopId: string | null = null;
  if (photoData) {
    const { data: treatmentData } = await supabase
      .from("treatments")
      .select("shop_id")
      .eq("id", photoData.treatment_id)
      .single();
    shopId = treatmentData?.shop_id ?? null;
  }

  if (!shopId) {
    return NextResponse.json({ detail: "Could not determine shop" }, { status: 500 });
  }

  // Auto-create portfolio entry
  const { data: portfolio, error: portfolioError } = await supabase
    .from("portfolios")
    .insert({
      shop_id: shopId,
      photo_id: result.treatment_photo_id,
      title: "AI Faceswap",
      is_published: false,
    })
    .select()
    .single();

  if (portfolioError) {
    return NextResponse.json({ detail: portfolioError.message }, { status: 500 });
  }

  return NextResponse.json({
    portfolio_id: portfolio.id,
    result_id: resultId,
  });
}
