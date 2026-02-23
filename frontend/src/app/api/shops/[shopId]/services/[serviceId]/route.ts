import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

// PUT: Update service (owner/admin only)
export const PUT = withShopAuth<{ shopId: string; serviceId: string }>(
  async (req, params, _member) => {
    const supabase = createServiceClient();
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.estimated_duration_minutes !== undefined) updates.estimated_duration_minutes = body.estimated_duration_minutes;
    if (body.price !== undefined) updates.price = body.price;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

    const { data, error } = await supabase
      .from("shop_services")
      .update(updates)
      .eq("id", params.serviceId)
      .eq("shop_id", params.shopId)
      .select()
      .single();

    if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
    return NextResponse.json(data);
  },
  { roles: ["owner", "admin"] }
);

// DELETE: Soft-delete service (owner/admin only)
export const DELETE = withShopAuth<{ shopId: string; serviceId: string }>(
  async (_req, params, _member) => {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("shop_services")
      .update({ is_active: false })
      .eq("id", params.serviceId)
      .eq("shop_id", params.shopId);

    if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
    return NextResponse.json({ status: "ok" });
  },
  { roles: ["owner", "admin"] }
);
