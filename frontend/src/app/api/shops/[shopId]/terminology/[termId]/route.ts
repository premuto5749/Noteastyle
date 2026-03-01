import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const PUT = withShopAuth<{
  shopId: string;
  termId: string;
}>(async (req, params) => {
  const supabase = createServiceClient();
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.term !== undefined) updateData.term = body.term;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.aliases !== undefined) updateData.aliases = body.aliases;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ detail: "No valid fields to update" }, { status: 400 });
  }

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("shop_terminology")
    .update(updateData)
    .eq("id", params.termId)
    .eq("shop_id", params.shopId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ detail: "Term not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}, { roles: ["owner", "admin"] });

export const DELETE = withShopAuth<{
  shopId: string;
  termId: string;
}>(async (_req, params) => {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("shop_terminology")
    .delete()
    .eq("id", params.termId)
    .eq("shop_id", params.shopId);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "deleted" });
}, { roles: ["owner", "admin"] });
