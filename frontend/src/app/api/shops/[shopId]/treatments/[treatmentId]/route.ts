import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const GET = withShopAuth<{ shopId: string; treatmentId: string }>(
  async (req, params, member) => {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("treatments")
      .select("*, photos:treatment_photos(*), customer:customers(name, visit_count)")
      .eq("id", params.treatmentId)
      .eq("shop_id", params.shopId)
      .single();

    if (error) return NextResponse.json({ detail: "Treatment not found" }, { status: 404 });

    // Filter out soft-deleted photos
    if (data.photos) {
      data.photos = data.photos.filter((p: { deleted_at?: string | null }) => !p.deleted_at);
    }

    return NextResponse.json(data);
  }
);

export const PUT = withShopAuth<{ shopId: string; treatmentId: string }>(
  async (req, params, member) => {
    const supabase = createServiceClient();
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.service_type !== undefined) updateData.service_type = body.service_type;
    if (body.service_detail !== undefined) updateData.service_detail = body.service_detail;
    if (body.products_used !== undefined) updateData.products_used = body.products_used;
    if (body.area !== undefined) updateData.area = body.area;
    if (body.duration_minutes !== undefined) updateData.duration_minutes = body.duration_minutes;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.satisfaction !== undefined) updateData.satisfaction = body.satisfaction;
    if (body.customer_notes !== undefined) updateData.customer_notes = body.customer_notes;
    if (body.ai_summary !== undefined) updateData.ai_summary = body.ai_summary;
    if (body.next_visit_recommendation !== undefined) updateData.next_visit_recommendation = body.next_visit_recommendation;
    if (body.key_comments !== undefined) updateData.key_comments = body.key_comments;

    const { data, error } = await supabase
      .from("treatments")
      .update(updateData)
      .eq("id", params.treatmentId)
      .eq("shop_id", params.shopId)
      .select("*, photos:treatment_photos(*)")
      .single();

    if (error) return NextResponse.json({ detail: error.message }, { status: 400 });

    // Filter out soft-deleted photos
    if (data.photos) {
      data.photos = data.photos.filter((p: { deleted_at?: string | null }) => !p.deleted_at);
    }

    return NextResponse.json(data);
  }
);

export const DELETE = withShopAuth<{ shopId: string; treatmentId: string }>(
  async (req, params, member) => {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("treatments")
      .delete()
      .eq("id", params.treatmentId)
      .eq("shop_id", params.shopId);

    if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
    return NextResponse.json({ status: "deleted" });
  }
);
