import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ shopId: string; reservationId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { shopId, reservationId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("reservations")
    .select(
      "*, customer:customers(name, phone), designer:designers(name), treatment:treatments(id)"
    )
    .eq("id", reservationId)
    .eq("shop_id", shopId)
    .single();

  if (error)
    return NextResponse.json({ detail: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { shopId, reservationId } = await params;
  const supabase = createServerClient();
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  const allowedFields = [
    "customer_id",
    "designer_id",
    "treatment_id",
    "scheduled_date",
    "scheduled_time",
    "estimated_duration_minutes",
    "service_type",
    "service_detail",
    "notes",
    "source",
    "status",
  ];

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  const { data, error } = await supabase
    .from("reservations")
    .update(updates)
    .eq("id", reservationId)
    .eq("shop_id", shopId)
    .select(
      "*, customer:customers(name, phone), designer:designers(name), treatment:treatments(id)"
    )
    .single();

  if (error)
    return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { shopId, reservationId } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", reservationId)
    .eq("shop_id", shopId);

  if (error)
    return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json({ status: "deleted" });
}
