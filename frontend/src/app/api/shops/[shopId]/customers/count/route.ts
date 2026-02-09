import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const supabase = createServerClient();

  const { count, error } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId);

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json({ count: count ?? 0 });
}
