import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const POST = withShopAuth<{
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
    return NextResponse.json({ detail: "Treatment not found" }, { status: 404 });
  }

  // Verify photo belongs to treatment and is not deleted
  const { data: existingPhoto } = await supabase
    .from("treatment_photos")
    .select("id, deleted_at")
    .eq("id", params.photoId)
    .eq("treatment_id", params.treatmentId)
    .single();

  if (!existingPhoto || existingPhoto.deleted_at) {
    return NextResponse.json({ detail: "Photo not found" }, { status: 404 });
  }

  // Parse form data
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ detail: "file is required" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ detail: "File too large (max 10MB)" }, { status: 400 });
  }

  // Upload to Supabase Storage
  const ext = "jpg";
  const storagePath = `mosaic/${params.treatmentId}/${params.photoId}_${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("treatment-photos")
    .upload(storagePath, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ detail: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("treatment-photos")
    .getPublicUrl(storagePath);

  // Update photo record with mosaic URL
  const { data: photo, error: updateError } = await supabase
    .from("treatment_photos")
    .update({ mosaic_url: urlData.publicUrl })
    .eq("id", params.photoId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ detail: updateError.message }, { status: 500 });
  }

  return NextResponse.json(photo);
});
