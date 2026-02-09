import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string; customerId: string }> }
) {
  const { shopId, customerId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("customers")
    .select()
    .eq("id", customerId)
    .eq("shop_id", shopId)
    .single();

  if (error) return NextResponse.json({ detail: "Customer not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string; customerId: string }> }
) {
  const { shopId, customerId } = await params;
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("customers")
    .update({
      name: body.name,
      phone: body.phone ?? null,
      gender: body.gender ?? null,
      birth_date: body.birth_date ?? null,
      notes: body.notes ?? null,
      naver_booking_id: body.naver_booking_id ?? null,
    })
    .eq("id", customerId)
    .eq("shop_id", shopId)
    .select()
    .single();

  if (error) return NextResponse.json({ detail: "Customer not found" }, { status: 404 });
  return NextResponse.json(data);
}
