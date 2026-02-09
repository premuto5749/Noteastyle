import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string; treatmentId: string }> }
) {
  const { shopId, treatmentId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("treatments")
    .select("*, photos:treatment_photos(*)")
    .eq("id", treatmentId)
    .eq("shop_id", shopId)
    .single();

  if (error) return NextResponse.json({ detail: "Treatment not found" }, { status: 404 });
  return NextResponse.json(data);
}
