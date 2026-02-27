import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";
import { validateBody, customerCreateSchema } from "@/lib/validations";
import { escapeIlike } from "@/lib/utils/sanitize";

export const POST = withShopAuth(async (req, params, _member) => {
  const supabase = createServiceClient();
  const parsed = await validateBody(req, customerCreateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const { data, error } = await supabase
    .from("customers")
    .insert({
      shop_id: params.shopId,
      name: body.name,
      phone: body.phone ?? null,
      gender: body.gender ?? null,
      birth_date: body.birth_date ?? null,
      notes: body.notes ?? null,
      naver_booking_id: body.naver_booking_id ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
});

export const GET = withShopAuth(async (req, params, _member) => {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const phone = searchParams.get("phone");
  const skip = parseInt(searchParams.get("skip") || "0");
  const isSearch = !!(search || phone);
  const limit = parseInt(searchParams.get("limit") || (isSearch ? "10" : "50"));

  let query = supabase
    .from("customers")
    .select("id, name, phone, visit_count, last_visit")
    .eq("shop_id", params.shopId);

  if (search) {
    query = query.ilike("name", `%${escapeIlike(search)}%`);
  }
  if (phone) {
    query = query.ilike("phone", `%${escapeIlike(phone)}%`);
  }

  query = query
    .order("last_visit", { ascending: false, nullsFirst: false })
    .range(skip, skip + limit - 1);

  const { data, error } = await query;

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data);
});
