import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

// Restore photo (set deleted_at = null)
export const PATCH = withShopAuth<{ shopId: string; photoId: string }>(
  async (req, params) => {
    const supabase = createServiceClient();

    // Find the deleted photo
    const { data: photo } = await supabase
      .from("treatment_photos")
      .select("id, treatment_id, deleted_at")
      .eq("id", params.photoId)
      .not("deleted_at", "is", null)
      .single();

    if (!photo) {
      return NextResponse.json(
        { detail: "Photo not found in trash" },
        { status: 404 }
      );
    }

    // Verify treatment belongs to this shop
    const { data: treatment } = await supabase
      .from("treatments")
      .select("id")
      .eq("id", photo.treatment_id)
      .eq("shop_id", params.shopId)
      .single();

    if (!treatment) {
      return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("treatment_photos")
      .update({ deleted_at: null })
      .eq("id", params.photoId);

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "restored" });
  }
);

// Permanently delete photo
export const DELETE = withShopAuth<{ shopId: string; photoId: string }>(
  async (req, params) => {
    const supabase = createServiceClient();

    // Find the deleted photo
    const { data: photo } = await supabase
      .from("treatment_photos")
      .select("id, treatment_id, photo_url, face_swapped_url, thumbnail_url, deleted_at")
      .eq("id", params.photoId)
      .not("deleted_at", "is", null)
      .single();

    if (!photo) {
      return NextResponse.json(
        { detail: "Photo not found in trash" },
        { status: 404 }
      );
    }

    // Verify treatment belongs to this shop
    const { data: treatment } = await supabase
      .from("treatments")
      .select("id")
      .eq("id", photo.treatment_id)
      .eq("shop_id", params.shopId)
      .single();

    if (!treatment) {
      return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
    }

    // Delete from Storage
    const filesToDelete: string[] = [];
    for (const url of [photo.photo_url, photo.face_swapped_url, photo.thumbnail_url]) {
      if (url && typeof url === "string") {
        const match = url.match(/treatment-photos\/(.+)$/);
        if (match) filesToDelete.push(match[1]);
      }
    }

    if (filesToDelete.length > 0) {
      await supabase.storage.from("treatment-photos").remove(filesToDelete);
    }

    // Delete related portfolio entries
    await supabase
      .from("portfolios")
      .delete()
      .eq("photo_id", params.photoId);

    // Delete related face swap results
    await supabase
      .from("face_swap_results")
      .delete()
      .eq("treatment_photo_id", params.photoId);

    // Hard delete the photo record
    const { error } = await supabase
      .from("treatment_photos")
      .delete()
      .eq("id", params.photoId);

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "purged" });
  }
);
