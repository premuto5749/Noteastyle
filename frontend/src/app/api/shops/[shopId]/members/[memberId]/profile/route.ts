import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const GET = withShopAuth<{ shopId: string; memberId: string }>(
  async (_req, params, _member) => {
    const supabase = createServiceClient();

    const { data: profile } = await supabase
      .from("member_profiles")
      .select("*")
      .eq("member_id", params.memberId)
      .maybeSingle();

    const { data: member } = await supabase
      .from("shop_members")
      .select("display_name, specialty, phone")
      .eq("id", params.memberId)
      .single();

    if (!member) {
      return NextResponse.json({ detail: "멤버를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({
      profile_photo_url: profile?.profile_photo_url ?? null,
      bio: profile?.bio ?? null,
      career_history: profile?.career_history ?? [],
      certifications: profile?.certifications ?? [],
      sns_links: profile?.sns_links ?? {},
      show_contact: profile?.show_contact ?? false,
      is_public: profile?.is_public ?? false,
      display_name: member.display_name,
      specialty: member.specialty,
      phone: member.phone,
    });
  }
);

export const PUT = withShopAuth<{ shopId: string; memberId: string }>(
  async (req, params, member) => {
    if (params.memberId !== member.id) {
      return NextResponse.json(
        { detail: "본인의 프로필만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    const supabase = createServiceClient();
    const body = await req.json();

    // Update specialty on shop_members if provided
    if (body.specialty !== undefined) {
      await supabase
        .from("shop_members")
        .update({ specialty: body.specialty })
        .eq("id", member.id);
    }

    // Upsert member_profiles
    const profileData: Record<string, unknown> = {
      member_id: member.id,
    };
    if (body.bio !== undefined) profileData.bio = body.bio;
    if (body.career_history !== undefined) profileData.career_history = body.career_history;
    if (body.certifications !== undefined) profileData.certifications = body.certifications;
    if (body.sns_links !== undefined) profileData.sns_links = body.sns_links;
    if (body.show_contact !== undefined) profileData.show_contact = body.show_contact;
    if (body.is_public !== undefined) profileData.is_public = body.is_public;

    const { error } = await supabase
      .from("member_profiles")
      .upsert(profileData, { onConflict: "member_id" });

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 400 });
    }

    // Return updated profile
    const { data: updatedProfile } = await supabase
      .from("member_profiles")
      .select("*")
      .eq("member_id", member.id)
      .single();

    const { data: updatedMember } = await supabase
      .from("shop_members")
      .select("display_name, specialty, phone")
      .eq("id", member.id)
      .single();

    return NextResponse.json({
      profile_photo_url: updatedProfile?.profile_photo_url ?? null,
      bio: updatedProfile?.bio ?? null,
      career_history: updatedProfile?.career_history ?? [],
      certifications: updatedProfile?.certifications ?? [],
      sns_links: updatedProfile?.sns_links ?? {},
      show_contact: updatedProfile?.show_contact ?? false,
      is_public: updatedProfile?.is_public ?? false,
      display_name: updatedMember?.display_name ?? member.display_name,
      specialty: updatedMember?.specialty ?? null,
      phone: updatedMember?.phone ?? null,
    });
  }
);
