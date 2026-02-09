import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("customers")
    .insert({
      shop_id: shopId,
      name: body.name,
      phone: body.phone ?? null,
      gender: body.gender ?? null,
      birth_date: body.birth_date ?? null,
      notes: body.notes ?? null,
      naver_booking_id: body.naver_booking_id ?? null,
    })
    .select()
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
  const search = searchParams.get("search");
  const skip = parseInt(searchParams.get("skip") || "0");
  const limit = parseInt(searchParams.get("limit") || "50");

  let query = supabase
    .from("customers")
    .select("id, name, phone, visit_count, last_visit")
    .eq("shop_id", shopId)
    .order("last_visit", { ascending: false, nullsFirst: false })
    .range(skip, skip + limit - 1);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data);
}
