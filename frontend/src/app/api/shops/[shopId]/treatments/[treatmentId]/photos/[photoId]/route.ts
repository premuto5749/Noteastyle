import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

interface PhotoAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  type?: "pin" | "chip";
  category?: "area" | "product" | "time" | "caution" | "result";
  source?: "manual" | "voice_ai";
}

const VALID_ANNOTATION_TYPES = ["pin", "chip"];
const VALID_CATEGORIES = ["area", "product", "time", "caution", "result"];
const VALID_SOURCES = ["manual", "voice_ai"];

const VALID_PHOTO_TYPES = ["before", "during", "after"];

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

  // Verify photo belongs to treatment and is not deleted
  const { data: existingPhoto } = await supabase
    .from("treatment_photos")
    .select("id, deleted_at")
    .eq("id", params.photoId)
    .eq("treatment_id", params.treatmentId)
    .single();

  if (!existingPhoto || existingPhoto.deleted_at) {
    return NextResponse.json(
      { detail: "Photo not found" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  // Validate and set photo_type
  if (body.photo_type !== undefined) {
    if (!VALID_PHOTO_TYPES.includes(body.photo_type)) {
      return NextResponse.json(
        { detail: "photo_type must be one of: before, during, after" },
        { status: 400 }
      );
    }
    updateData.photo_type = body.photo_type;
  }

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
      if (ann.type !== undefined && !VALID_ANNOTATION_TYPES.includes(ann.type)) {
        return NextResponse.json(
          { detail: "Annotation type must be 'pin' or 'chip'" },
          { status: 400 }
        );
      }
      if (ann.category !== undefined && !VALID_CATEGORIES.includes(ann.category)) {
        return NextResponse.json(
          { detail: "Invalid annotation category" },
          { status: 400 }
        );
      }
      if (ann.source !== undefined && !VALID_SOURCES.includes(ann.source)) {
        return NextResponse.json(
          { detail: "Annotation source must be 'manual' or 'voice_ai'" },
          { status: 400 }
        );
      }
    }

    updateData.annotations = annotations;
  }

  // Validate and set drawing_data
  if (body.drawing_data !== undefined) {
    if (body.drawing_data !== null) {
      if (!body.drawing_data.shapes || !Array.isArray(body.drawing_data.shapes)) {
        return NextResponse.json(
          { detail: "drawing_data.shapes must be an array" },
          { status: 400 }
        );
      }
      if (body.drawing_data.shapes.length > 50) {
        return NextResponse.json(
          { detail: "Maximum 50 drawing shapes allowed" },
          { status: 400 }
        );
      }
    }
    updateData.drawing_data = body.drawing_data;
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

export const DELETE = withShopAuth<{
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

  // Verify photo exists and is not already deleted
  const { data: existingPhoto } = await supabase
    .from("treatment_photos")
    .select("id, deleted_at")
    .eq("id", params.photoId)
    .eq("treatment_id", params.treatmentId)
    .single();

  if (!existingPhoto || existingPhoto.deleted_at) {
    return NextResponse.json(
      { detail: "Photo not found" },
      { status: 404 }
    );
  }

  // Soft delete: set deleted_at
  const { error } = await supabase
    .from("treatment_photos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.photoId);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "deleted" });
});
