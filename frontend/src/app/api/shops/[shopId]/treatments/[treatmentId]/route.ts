import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string; treatmentId: string }> }
) {
  const { shopId, treatmentId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("treatments")
    .select("*, photos:treatment_photos(*), customer:customers(name, visit_count)")
    .eq("id", treatmentId)
    .eq("shop_id", shopId)
    .single();

  if (error) return NextResponse.json({ detail: "Treatment not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string; treatmentId: string }> }
) {
  const { shopId, treatmentId } = await params;
  const supabase = createServerClient();
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.service_type !== undefined) updateData.service_type = body.service_type;
  if (body.service_detail !== undefined) updateData.service_detail = body.service_detail;
  if (body.products_used !== undefined) updateData.products_used = body.products_used;
  if (body.area !== undefined) updateData.area = body.area;
  if (body.duration_minutes !== undefined) updateData.duration_minutes = body.duration_minutes;
  if (body.price !== undefined) updateData.price = body.price;
  if (body.satisfaction !== undefined) updateData.satisfaction = body.satisfaction;
  if (body.customer_notes !== undefined) updateData.customer_notes = body.customer_notes;
  if (body.next_visit_recommendation !== undefined) updateData.next_visit_recommendation = body.next_visit_recommendation;

  const { data, error } = await supabase
    .from("treatments")
    .update(updateData)
    .eq("id", treatmentId)
    .eq("shop_id", shopId)
    .select("*, photos:treatment_photos(*)")
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string; treatmentId: string }> }
) {
  const { shopId, treatmentId } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("treatments")
    .delete()
    .eq("id", treatmentId)
    .eq("shop_id", shopId);

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json({ status: "deleted" });
}
