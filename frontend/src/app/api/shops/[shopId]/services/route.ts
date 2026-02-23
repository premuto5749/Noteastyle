import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

// POST: Create a new service (owner/admin only)
export const POST = withShopAuth(
  async (req, params, _member) => {
    const supabase = createServiceClient();
    const body = await req.json();

    if (!body.category_id || !body.name) {
      return NextResponse.json(
        { detail: "category_id and name are required" },
        { status: 400 }
      );
    }

    // Get max sort_order within category
    const { data: maxRow } = await supabase
      .from("shop_services")
      .select("sort_order")
      .eq("category_id", body.category_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxRow?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("shop_services")
      .insert({
        category_id: body.category_id,
        shop_id: params.shopId,
        name: body.name,
        estimated_duration_minutes: body.estimated_duration_minutes ?? null,
        price: body.price ?? null,
        sort_order: body.sort_order ?? nextOrder,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  },
  { roles: ["owner", "admin"] }
);
