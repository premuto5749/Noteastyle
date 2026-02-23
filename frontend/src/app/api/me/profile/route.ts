import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const serviceClient = createServiceClient();

  const updates: Record<string, unknown> = {};
  if (body.full_name !== undefined) updates.full_name = body.full_name;
  if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.bio !== undefined) updates.bio = body.bio;

  const { data, error } = await serviceClient
    .from("user_profiles")
    .update(updates)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
