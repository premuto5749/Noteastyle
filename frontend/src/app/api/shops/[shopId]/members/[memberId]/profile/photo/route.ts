import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
import { withShopAuth } from "@/lib/auth/shop";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const POST = withShopAuth<{ shopId: string; memberId: string }>(
  async (req, params, member) => {
    if (params.memberId !== member.id) {
      return NextResponse.json(
        { detail: "본인의 프로필 사진만 업로드할 수 있습니다." },
        { status: 403 }
      );
    }

    const supabase = createServiceClient();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ detail: "파일이 제공되지 않았습니다." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ detail: "파일 크기가 5MB를 초과합니다." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ detail: "지원하지 않는 파일 형식입니다. (JPEG, PNG, WebP)" }, { status: 400 });
    }

    // Delete old profile photo if exists
    const { data: existingProfile } = await supabase
      .from("member_profiles")
      .select("profile_photo_url")
      .eq("member_id", member.id)
      .maybeSingle();

    if (existingProfile?.profile_photo_url) {
      const oldPath = existingProfile.profile_photo_url.split("/treatment-photos/")[1];
      if (oldPath) {
        await supabase.storage.from("treatment-photos").remove([oldPath]);
      }
    }

    // Upload new photo
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `member-profiles/${member.id}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("treatment-photos")
      .upload(filePath, buffer, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ detail: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("treatment-photos")
      .getPublicUrl(filePath);

    // Upsert member_profiles with new photo URL
    const { error } = await supabase
      .from("member_profiles")
      .upsert(
        { member_id: member.id, profile_photo_url: urlData.publicUrl },
        { onConflict: "member_id" }
      );

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 400 });
    }

    return NextResponse.json({ profile_photo_url: urlData.publicUrl }, { status: 201 });
  }
);
