import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const GET = withShopAuth<{ shopId: string; reservationId: string }>(
  async (_req, params, _member) => {
    const supabase = createServiceClient();
    const { shopId, reservationId } = params;

    const { data, error } = await supabase
      .from("reservations")
      .select(
        "*, customer:customers(name, phone), member:shop_members(display_name), treatment:treatments(id)"
      )
      .eq("id", reservationId)
      .eq("shop_id", shopId)
      .single();

    if (error)
      return NextResponse.json({ detail: error.message }, { status: 404 });
    return NextResponse.json(data);
  }
);

export const PUT = withShopAuth<{ shopId: string; reservationId: string }>(
  async (req, params, _member) => {
    const supabase = createServiceClient();
    const { shopId, reservationId } = params;
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    const allowedFields = [
      "customer_id",
      "member_id",
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
        "*, customer:customers(name, phone), member:shop_members(display_name), treatment:treatments(id)"
      )
      .single();

    if (error)
      return NextResponse.json({ detail: error.message }, { status: 400 });
    return NextResponse.json(data);
  }
);

export const DELETE = withShopAuth<{ shopId: string; reservationId: string }>(
  async (_req, params, _member) => {
    const supabase = createServiceClient();
    const { shopId, reservationId } = params;

    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", reservationId)
      .eq("shop_id", shopId);

    if (error)
      return NextResponse.json({ detail: error.message }, { status: 400 });
    return NextResponse.json({ status: "deleted" });
  }
);
