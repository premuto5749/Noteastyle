import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

// GET: List all categories with their services (auto-seed if empty)
export const GET = withShopAuth(async (_req, params, _member) => {
  const supabase = createServiceClient();
  const shopId = params.shopId;

  // Check if categories exist; if not, seed defaults
  const { count } = await supabase
    .from("shop_service_categories")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);

  if (count === 0) {
    // Fetch shop type for seeding
    const { data: shop } = await supabase
      .from("shops")
      .select("shop_type")
      .eq("id", shopId)
      .single();

    if (shop) {
      await supabase.rpc("seed_default_services", {
        p_shop_id: shopId,
        p_shop_type: shop.shop_type,
      });
    }
  }

  // Fetch categories with services
  const { data: categories, error } = await supabase
    .from("shop_service_categories")
    .select("*, services:shop_services(id, category_id, shop_id, name, estimated_duration_minutes, price, sort_order, is_active, created_at, updated_at)")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });

  // Sort services within each category and filter active only
  const result = (categories || []).map((cat) => ({
    ...cat,
    services: (cat.services || [])
      .filter((s: { is_active: boolean }) => s.is_active)
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order),
  }));

  return NextResponse.json(result);
});

// POST: Create a new category (owner/admin only)
export const POST = withShopAuth(
  async (req, params, _member) => {
    const supabase = createServiceClient();
    const body = await req.json();

    // Get max sort_order
    const { data: maxRow } = await supabase
      .from("shop_service_categories")
      .select("sort_order")
      .eq("shop_id", params.shopId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxRow?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("shop_service_categories")
      .insert({
        shop_id: params.shopId,
        name: body.name,
        icon: body.icon ?? null,
        sort_order: body.sort_order ?? nextOrder,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  },
  { roles: ["owner", "admin"] }
);
