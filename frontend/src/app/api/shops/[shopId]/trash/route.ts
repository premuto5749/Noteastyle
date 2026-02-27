import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const GET = withShopAuth(async (req, params) => {
  const supabase = createServiceClient();

  // Get all treatment IDs for this shop
  const { data: treatments, error: tErr } = await supabase
    .from("treatments")
    .select("id, service_type, customer:customers(name)")
    .eq("shop_id", params.shopId);

  if (tErr) {
    return NextResponse.json({ detail: tErr.message }, { status: 500 });
  }

  if (!treatments || treatments.length === 0) {
    return NextResponse.json([]);
  }

  const treatmentIds = treatments.map((t) => t.id);

  // Get deleted photos for those treatments
  const { data: photos, error: pErr } = await supabase
    .from("treatment_photos")
    .select("id, photo_url, photo_type, media_type, thumbnail_url, deleted_at, treatment_id")
    .in("treatment_id", treatmentIds)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (pErr) {
    return NextResponse.json({ detail: pErr.message }, { status: 500 });
  }

  // Build lookup map for treatment data
  const treatmentMap = new Map<string, { service_type: string; customer_name: string | null }>();
  for (const t of treatments) {
    const customerData = t.customer as unknown;
    const customer = Array.isArray(customerData) ? customerData[0] as { name: string } | undefined : customerData as { name: string } | null;
    treatmentMap.set(t.id, {
      service_type: t.service_type,
      customer_name: customer?.name ?? null,
    });
  }

  // Flatten
  const result = (photos || []).map((row) => {
    const info = treatmentMap.get(row.treatment_id);
    return {
      id: row.id,
      photo_url: row.photo_url,
      photo_type: row.photo_type,
      media_type: row.media_type,
      thumbnail_url: row.thumbnail_url,
      deleted_at: row.deleted_at,
      treatment_id: row.treatment_id,
      service_type: info?.service_type ?? null,
      customer_name: info?.customer_name ?? null,
    };
  });

  return NextResponse.json(result);
});
