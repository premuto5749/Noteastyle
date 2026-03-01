import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const GET = withShopAuth<{
  shopId: string;
  customerId: string;
}>(async (_req, params) => {
  const supabase = createServiceClient();

  // Fetch customer
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, name, visit_count, created_at")
    .eq("id", params.customerId)
    .eq("shop_id", params.shopId)
    .single();

  if (customerError || !customer) {
    return NextResponse.json({ detail: "Customer not found" }, { status: 404 });
  }

  // Fetch treatments
  const { data: treatments } = await supabase
    .from("treatments")
    .select("id, service_type, service_detail, products_used, area, satisfaction, created_at, photos:treatment_photos(id)")
    .eq("customer_id", params.customerId)
    .eq("shop_id", params.shopId)
    .order("created_at", { ascending: false })
    .limit(50);

  const treatmentList = (treatments || []).map((t) => ({
    id: t.id,
    date: t.created_at,
    service_type: t.service_type,
    service_detail: t.service_detail,
    products_used: t.products_used,
    area: t.area,
    satisfaction: t.satisfaction,
    photo_count: Array.isArray(t.photos) ? t.photos.length : 0,
  }));

  const firstVisit = treatmentList.length > 0
    ? treatmentList[treatmentList.length - 1].date
    : customer.created_at;
  const lastVisit = treatmentList.length > 0
    ? treatmentList[0].date
    : customer.created_at;

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      visit_count: customer.visit_count ?? treatmentList.length,
      first_visit: firstVisit,
      last_visit: lastVisit,
    },
    treatments: treatmentList,
  });
});
