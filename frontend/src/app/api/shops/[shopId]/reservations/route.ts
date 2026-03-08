import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";
import { validateBody, reservationCreateSchema } from "@/lib/validations";

export const GET = withShopAuth(async (req, params, _member) => {
  const supabase = createServiceClient();
  const shopId = params.shopId;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const status = searchParams.get("status");
  const skip = parseInt(searchParams.get("skip") ?? "0", 10) || 0;
  const limit = parseInt(searchParams.get("limit") ?? "0", 10) || 0;

  let query = supabase
    .from("reservations")
    .select(
      "*, customer:customers(name, phone), member:shop_members(display_name), treatment:treatments(id, customer_notes, voice_memo_text, ai_summary)"
    )
    .eq("shop_id", shopId);

  if (date) {
    // 특정 날짜 조회: 기존 동작 유지 (시간 오름차순, 페이지네이션 없음)
    query = query
      .eq("scheduled_date", date)
      .order("scheduled_time", { ascending: true });
  } else {
    // 전체 조회: 날짜 내림차순 → 시간 오름차순 + 페이지네이션
    query = query
      .order("scheduled_date", { ascending: false })
      .order("scheduled_time", { ascending: true });

    if (limit > 0) {
      query = query.range(skip, skip + limit - 1);
    }
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error)
    return NextResponse.json({ detail: error.message }, { status: 400 });

  // Enrich with customer's last treatment summary
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reservations = data as any[];
  const customerIds = [...new Set(reservations.map((r) => r.customer_id))];

  if (customerIds.length > 0) {
    // Get latest treatment per customer in this shop
    const { data: lastTreatments } = await supabase
      .from("treatments")
      .select("customer_id, service_type, created_at, ai_summary, treatment_photos(id)")
      .eq("shop_id", shopId)
      .in("customer_id", customerIds)
      .order("created_at", { ascending: false });

    // Build map: customer_id -> latest treatment
    const lastTreatmentMap = new Map<string, { service_type: string; date: string; ai_summary: string | null; photo_count: number }>();
    for (const t of lastTreatments ?? []) {
      if (!lastTreatmentMap.has(t.customer_id)) {
        lastTreatmentMap.set(t.customer_id, {
          service_type: t.service_type,
          date: t.created_at.slice(0, 10),
          ai_summary: t.ai_summary,
          photo_count: Array.isArray(t.treatment_photos) ? t.treatment_photos.length : 0,
        });
      }
    }

    // Attach to reservations
    for (const r of reservations) {
      r.last_treatment = lastTreatmentMap.get(r.customer_id) ?? null;
    }
  }

  return NextResponse.json(reservations);
});

export const POST = withShopAuth(async (req, params, _member) => {
  const supabase = createServiceClient();
  const shopId = params.shopId;
  const parsed = await validateBody(req, reservationCreateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      shop_id: shopId,
      customer_id: body.customer_id,
      member_id: body.member_id ?? null,
      scheduled_date: body.scheduled_date,
      scheduled_time: body.scheduled_time,
      estimated_duration_minutes: body.estimated_duration_minutes,
      service_type: body.service_type ?? null,
      service_detail: body.service_detail ?? null,
      notes: body.notes ?? null,
      source: body.source,
    })
    .select(
      "*, customer:customers(name, phone), member:shop_members(display_name), treatment:treatments(id)"
    )
    .single();

  if (error)
    return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
});
