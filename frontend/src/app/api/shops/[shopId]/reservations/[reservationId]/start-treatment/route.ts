import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const POST = withShopAuth<{ shopId: string; reservationId: string }>(
  async (req, params, _member) => {
    const supabase = createServiceClient();
    const { shopId, reservationId } = params;

    // 1. Get the reservation
    const { data: reservation, error: resError } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", reservationId)
      .eq("shop_id", shopId)
      .single();

    if (resError || !reservation)
      return NextResponse.json(
        { detail: "Reservation not found" },
        { status: 404 }
      );

    // If treatment already exists, return it
    if (reservation.treatment_id) {
      const { data: existingTreatment } = await supabase
        .from("treatments")
        .select("*, photos:treatment_photos(*)")
        .eq("id", reservation.treatment_id)
        .single();

      return NextResponse.json({
        treatment: existingTreatment,
        reservation,
      });
    }

    // 2. Parse optional overrides from body
    let overrides: Record<string, unknown> = {};
    try {
      overrides = await req.json();
    } catch {
      // No body is fine
    }

    // 3. Create treatment
    const { data: treatment, error: treatError } = await supabase
      .from("treatments")
      .insert({
        shop_id: shopId,
        customer_id: reservation.customer_id,
        member_id: overrides.member_id ?? reservation.member_id ?? null,
        service_type: overrides.service_type ?? reservation.service_type ?? "기타",
        service_detail:
          overrides.service_detail ?? reservation.service_detail ?? null,
        duration_minutes: reservation.estimated_duration_minutes ?? null,
      })
      .select("*, photos:treatment_photos(*)")
      .single();

    if (treatError)
      return NextResponse.json(
        { detail: treatError.message },
        { status: 400 }
      );

    // 4. Link treatment to reservation and update status
    const { data: updatedReservation, error: updateError } = await supabase
      .from("reservations")
      .update({
        treatment_id: treatment.id,
        status: "in_progress",
      })
      .eq("id", reservationId)
      .select(
        "*, customer:customers(name, phone), member:shop_members(display_name), treatment:treatments(id)"
      )
      .single();

    if (updateError)
      return NextResponse.json(
        { detail: updateError.message },
        { status: 400 }
      );

    // 5. Increment visit count
    await supabase.rpc("increment_visit_count", {
      cid: reservation.customer_id,
    });

    return NextResponse.json(
      {
        treatment,
        reservation: updatedReservation,
      },
      { status: 201 }
    );
  }
);
