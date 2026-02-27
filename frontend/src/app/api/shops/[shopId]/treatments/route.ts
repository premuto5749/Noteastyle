import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";
import { validateBody, treatmentCreateSchema } from "@/lib/validations";

export const POST = withShopAuth(async (req, params, member) => {
  const supabase = createServiceClient();
  const parsed = await validateBody(req, treatmentCreateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const productsData = body.products_used
    ? body.products_used.map((p) => ({
        brand: p.brand,
        code: p.code ?? null,
        area: p.area ?? null,
      }))
    : null;

  // Insert treatment
  const { data: treatment, error } = await supabase
    .from("treatments")
    .insert({
      shop_id: params.shopId,
      customer_id: body.customer_id,
      member_id: body.member_id ?? null,
      service_type: body.service_type,
      service_detail: body.service_detail ?? null,
      products_used: productsData,
      area: body.area ?? null,
      duration_minutes: body.duration_minutes ?? null,
      price: body.price ?? null,
      satisfaction: body.satisfaction ?? null,
      customer_notes: body.customer_notes ?? null,
      next_visit_recommendation: body.next_visit_recommendation ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });

  // Update customer visit count
  await supabase.rpc("increment_visit_count", { cid: body.customer_id });

  // Fetch with photos
  const { data: full } = await supabase
    .from("treatments")
    .select("*, photos:treatment_photos(*)")
    .eq("id", treatment.id)
    .single();

  return NextResponse.json(full, { status: 201 });
});

export const GET = withShopAuth(async (req, params, member) => {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customer_id");
  const serviceType = searchParams.get("service_type");
  const date = searchParams.get("date");
  const skip = parseInt(searchParams.get("skip") || "0");
  const limit = parseInt(searchParams.get("limit") || "50");
  const compact = searchParams.get("compact") === "true";

  // compact 모드: 목록용 경량 응답 (사진 필드 최소화)
  const photoSelect = compact
    ? "photos:treatment_photos(id, photo_url, face_swapped_url, photo_type, media_type)"
    : "photos:treatment_photos(*)";

  let query = supabase
    .from("treatments")
    .select(`*, ${photoSelect}, customer:customers(name)`)
    .eq("shop_id", params.shopId)
    .order("created_at", { ascending: false })
    .range(skip, skip + limit - 1);

  if (customerId) query = query.eq("customer_id", customerId);
  if (serviceType) query = query.eq("service_type", serviceType);
  if (date) {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;
    query = query.gte("created_at", startOfDay).lte("created_at", endOfDay);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });

  // Filter out soft-deleted photos from each treatment
  const filtered = (data || []).map((t: Record<string, unknown>) => ({
    ...t,
    photos: Array.isArray(t.photos)
      ? t.photos.filter((p: { deleted_at?: string | null }) => !p.deleted_at)
      : t.photos,
  }));

  return NextResponse.json(filtered);
});
