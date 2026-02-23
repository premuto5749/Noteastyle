import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

interface PhotoAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
}

export const PATCH = withShopAuth<{
  shopId: string;
  treatmentId: string;
  photoId: string;
}>(async (req, params) => {
  const supabase = createServiceClient();

  // Verify treatment belongs to shop
  const { data: treatment } = await supabase
    .from("treatments")
    .select("id")
    .eq("id", params.treatmentId)
    .eq("shop_id", params.shopId)
    .single();

  if (!treatment) {
    return NextResponse.json(
      { detail: "Treatment not found" },
      { status: 404 }
    );
  }

  // Verify photo belongs to treatment
  const { data: existingPhoto } = await supabase
    .from("treatment_photos")
    .select("id")
    .eq("id", params.photoId)
    .eq("treatment_id", params.treatmentId)
    .single();

  if (!existingPhoto) {
    return NextResponse.json(
      { detail: "Photo not found" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  // Validate and set annotations
  if (body.annotations !== undefined) {
    const annotations = body.annotations as PhotoAnnotation[];

    if (!Array.isArray(annotations)) {
      return NextResponse.json(
        { detail: "annotations must be an array" },
        { status: 400 }
      );
    }

    if (annotations.length > 10) {
      return NextResponse.json(
        { detail: "Maximum 10 annotations allowed" },
        { status: 400 }
      );
    }

    for (const ann of annotations) {
      if (
        typeof ann.id !== "string" ||
        typeof ann.x !== "number" ||
        typeof ann.y !== "number" ||
        typeof ann.text !== "string"
      ) {
        return NextResponse.json(
          { detail: "Invalid annotation format" },
          { status: 400 }
        );
      }
      if (ann.x < 0 || ann.x > 100 || ann.y < 0 || ann.y > 100) {
        return NextResponse.json(
          { detail: "Annotation x/y must be between 0 and 100" },
          { status: 400 }
        );
      }
      if (ann.text.length > 50) {
        return NextResponse.json(
          { detail: "Annotation text must be 50 characters or less" },
          { status: 400 }
        );
      }
    }

    updateData.annotations = annotations;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { detail: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { data: photo, error } = await supabase
    .from("treatment_photos")
    .update(updateData)
    .eq("id", params.photoId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(photo);
});
