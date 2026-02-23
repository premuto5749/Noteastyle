import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

// PUT: Update category (owner/admin only)
export const PUT = withShopAuth<{ shopId: string; categoryId: string }>(
  async (req, params, _member) => {
    const supabase = createServiceClient();
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

    const { data, error } = await supabase
      .from("shop_service_categories")
      .update(updates)
      .eq("id", params.categoryId)
      .eq("shop_id", params.shopId)
      .select()
      .single();

    if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
    return NextResponse.json(data);
  },
  { roles: ["owner", "admin"] }
);

// DELETE: Soft-delete category (owner/admin only)
export const DELETE = withShopAuth<{ shopId: string; categoryId: string }>(
  async (_req, params, _member) => {
    const supabase = createServiceClient();

    // Soft-delete: set is_active = false for category and its services
    const { error: catError } = await supabase
      .from("shop_service_categories")
      .update({ is_active: false })
      .eq("id", params.categoryId)
      .eq("shop_id", params.shopId);

    if (catError) return NextResponse.json({ detail: catError.message }, { status: 400 });

    await supabase
      .from("shop_services")
      .update({ is_active: false })
      .eq("category_id", params.categoryId);

    return NextResponse.json({ status: "ok" });
  },
  { roles: ["owner", "admin"] }
);
