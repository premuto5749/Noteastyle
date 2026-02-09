import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const supabase = createServerClient();
  const { face_swapped_url } = await request.json();

  const { data, error } = await supabase
    .from("treatment_photos")
    .update({ face_swapped_url })
    .eq("id", photoId)
    .select()
    .single();

  if (error) return NextResponse.json({ detail: "Photo not found" }, { status: 404 });
  return NextResponse.json({ status: "ok", photo_id: data.id, face_swapped_url });
}
