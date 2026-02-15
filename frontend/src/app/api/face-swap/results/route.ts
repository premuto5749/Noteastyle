import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const { treatment_photo_id, face_model_id, result_url } = await request.json();

  if (!treatment_photo_id || !face_model_id || !result_url) {
    return NextResponse.json(
      { detail: "treatment_photo_id, face_model_id, and result_url are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("face_swap_results")
    .insert({ treatment_photo_id, face_model_id, result_url })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const treatmentPhotoId = searchParams.get("treatment_photo_id");

  if (!treatmentPhotoId) {
    return NextResponse.json(
      { detail: "treatment_photo_id is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("face_swap_results")
    .select("*")
    .eq("treatment_photo_id", treatmentPhotoId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data);
}
