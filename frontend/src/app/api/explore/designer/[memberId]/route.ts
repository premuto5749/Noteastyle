import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;

  // Auth: require login
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const service = createServiceClient();

  // Get member + profile + shop
  const { data: member } = await service
    .from("shop_members")
    .select("id, display_name, specialty, phone, shop_id")
    .eq("id", memberId)
    .eq("is_active", true)
    .single();

  if (!member) {
    return NextResponse.json({ detail: "멤버를 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: profile } = await service
    .from("member_profiles")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle();

  if (!profile?.is_public) {
    return NextResponse.json({ detail: "비공개 프로필입니다." }, { status: 404 });
  }

  const { data: shop } = await service
    .from("shops")
    .select("id, name, shop_type")
    .eq("id", member.shop_id)
    .single();

  // Get published portfolios by this member
  const { data: portfolios } = await service
    .from("portfolios")
    .select("id, title, description, tags, is_published, created_at, photo:treatment_photos(*), shop:shops(id, name, shop_type)")
    .eq("member_id", memberId)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    member_id: member.id,
    display_name: member.display_name,
    specialty: member.specialty,
    phone: profile.show_contact ? member.phone : null,
    profile_photo_url: profile.profile_photo_url,
    bio: profile.bio,
    career_history: profile.career_history ?? [],
    certifications: profile.certifications ?? [],
    education: profile.education ?? [],
    address: profile.address ?? null,
    sns_links: profile.sns_links ?? {},
    show_contact: profile.show_contact,
    shop: shop ?? { id: member.shop_id, name: "", shop_type: "" },
    portfolios: portfolios ?? [],
  });
}
