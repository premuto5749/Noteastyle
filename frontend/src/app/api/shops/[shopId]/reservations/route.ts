import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const GET = withShopAuth(async (req, params, _member) => {
  const supabase = createServiceClient();
  const shopId = params.shopId;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const status = searchParams.get("status");

  let query = supabase
    .from("reservations")
    .select(
      "*, customer:customers(name, phone), member:shop_members(display_name), treatment:treatments(id)"
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
});

export const POST = withShopAuth(async (req, params, _member) => {
  const supabase = createServiceClient();
  const shopId = params.shopId;
  const body = await req.json();

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      shop_id: shopId,
      customer_id: body.customer_id,
      member_id: body.member_id ?? null,
      scheduled_date: body.scheduled_date,
      scheduled_time: body.scheduled_time,
      estimated_duration_minutes: body.estimated_duration_minutes ?? 60,
      service_type: body.service_type ?? null,
      service_detail: body.service_detail ?? null,
      notes: body.notes ?? null,
      source: body.source ?? "manual",
    })
    .select(
      "*, customer:customers(name, phone), member:shop_members(display_name), treatment:treatments(id)"
    )
    .single();

  if (error)
    return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
});
