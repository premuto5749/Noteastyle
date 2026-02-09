import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const supabase = createServerClient();
  const body = await request.json();

  const productsData = body.products_used
    ? body.products_used.map((p: { brand: string; code?: string; area?: string }) => ({
        brand: p.brand,
        code: p.code ?? null,
        area: p.area ?? null,
      }))
    : null;

  // Insert treatment
  const { data: treatment, error } = await supabase
    .from("treatments")
    .insert({
      shop_id: shopId,
      customer_id: body.customer_id,
      designer_id: body.designer_id ?? null,
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
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customer_id");
  const serviceType = searchParams.get("service_type");
  const skip = parseInt(searchParams.get("skip") || "0");
  const limit = parseInt(searchParams.get("limit") || "50");

  let query = supabase
    .from("treatments")
    .select("*, photos:treatment_photos(*)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .range(skip, skip + limit - 1);

  if (customerId) query = query.eq("customer_id", customerId);
  if (serviceType) query = query.eq("service_type", serviceType);

  const { data, error } = await query;

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data);
}
