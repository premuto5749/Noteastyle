import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const GET = withShopAuth<{ shopId: string; customerId: string }>(
  async (_req, params, _member) => {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("customers")
      .select()
      .eq("id", params.customerId)
      .eq("shop_id", params.shopId)
      .single();

    if (error) return NextResponse.json({ detail: "Customer not found" }, { status: 404 });
    return NextResponse.json(data);
  }
);

export const PUT = withShopAuth<{ shopId: string; customerId: string }>(
  async (req, params, _member) => {
    const supabase = createServiceClient();
    const body = await req.json();

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
      .eq("id", params.customerId)
      .eq("shop_id", params.shopId)
      .select()
      .single();

    if (error) return NextResponse.json({ detail: "Customer not found" }, { status: 404 });
    return NextResponse.json(data);
  }
);

export const DELETE = withShopAuth<{ shopId: string; customerId: string }>(
  async (_req, params, _member) => {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", params.customerId)
      .eq("shop_id", params.shopId);

    if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
    return NextResponse.json({ status: "deleted" });
  }
);
