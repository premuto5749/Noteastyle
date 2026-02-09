import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("shops")
    .select()
    .eq("id", shopId)
    .single();

  if (error) return NextResponse.json({ detail: "Shop not found" }, { status: 404 });
  return NextResponse.json(data);
}
