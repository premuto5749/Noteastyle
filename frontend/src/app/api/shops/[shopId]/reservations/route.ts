import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const status = searchParams.get("status");

  let query = supabase
    .from("reservations")
    .select(
      "*, customer:customers(name, phone), designer:designers(name), treatment:treatments(id)"
    )
    .eq("shop_id", shopId)
    .order("scheduled_time", { ascending: true });

  if (date) {
    query = query.eq("scheduled_date", date);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error)
    return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      shop_id: shopId,
      customer_id: body.customer_id,
      designer_id: body.designer_id ?? null,
      scheduled_date: body.scheduled_date,
      scheduled_time: body.scheduled_time,
      estimated_duration_minutes: body.estimated_duration_minutes ?? 60,
      service_type: body.service_type ?? null,
      service_detail: body.service_detail ?? null,
      notes: body.notes ?? null,
      source: body.source ?? "manual",
    })
    .select(
      "*, customer:customers(name, phone), designer:designers(name), treatment:treatments(id)"
    )
    .single();

  if (error)
    return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
