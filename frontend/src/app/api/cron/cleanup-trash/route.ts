import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find photos deleted more than 7 days ago
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: expiredPhotos, error: fetchError } = await supabase
    .from("treatment_photos")
    .select("id, photo_url, face_swapped_url, thumbnail_url")
    .not("deleted_at", "is", null)
    .lt("deleted_at", sevenDaysAgo);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!expiredPhotos || expiredPhotos.length === 0) {
    return NextResponse.json({ cleaned: 0 });
  }

  let cleaned = 0;

  for (const photo of expiredPhotos) {
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

    // Delete related records
    await supabase.from("portfolios").delete().eq("photo_id", photo.id);
    await supabase.from("face_swap_results").delete().eq("treatment_photo_id", photo.id);

    // Hard delete
    const { error } = await supabase
      .from("treatment_photos")
      .delete()
      .eq("id", photo.id);

    if (!error) cleaned++;
  }

  return NextResponse.json({ cleaned });
}
