import { NextRequest, NextResponse } from "next/server";
import { withShopAuth } from "@/lib/auth/shop";
import { createServiceClient } from "@/lib/supabase/server";
import { validateBody } from "@/lib/validations";
import { createProposalSchema } from "@/lib/validations/proposal";
import { deductCredit } from "@/lib/services/proposal-credits";

export const POST = withShopAuth(
  async (req: NextRequest, params, member) => {
    const body = await validateBody(req, createProposalSchema);
    if (body instanceof NextResponse) return body;

    const supabase = createServiceClient();

    // Verify target member exists and has open_to_proposals = true
    const { data: targetProfile } = await supabase
      .from("member_profiles")
      .select("open_to_proposals, blocked_shop_ids, member:shop_members!inner(id, shop_id, user_id)")
      .eq("member_id", body.to_member_id)
      .maybeSingle();

    if (!targetProfile) {
      return NextResponse.json({ error: "대상 디자이너를 찾을 수 없습니다." }, { status: 404 });
    }
    if (!targetProfile.open_to_proposals) {
      return NextResponse.json({ error: "제안을 받지 않는 디자이너입니다." }, { status: 400 });
    }

    // Block: target blocked this shop
    const blockedIds = (targetProfile.blocked_shop_ids as string[]) ?? [];
    if (blockedIds.includes(params.shopId)) {
      return NextResponse.json({ error: "제안을 보낼 수 없는 디자이너입니다." }, { status: 403 });
    }

    // Block: same shop
    const targetMember = (targetProfile.member as { id: string; shop_id: string; user_id: string } | null);
    if (targetMember?.shop_id === params.shopId) {
      return NextResponse.json({ error: "소속 매장 멤버에게는 제안을 보낼 수 없습니다." }, { status: 400 });
    }

    // Deduct credit
    const ok = await deductCredit(params.shopId);
    if (!ok) {
      return NextResponse.json(
        { error: "제안 크레딧이 부족합니다. 문의해주세요." },
        { status: 402 }
      );
    }

    // Create proposal (expires in 7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: proposal, error } = await supabase
      .from("talent_proposals")
      .insert({
        from_shop_id: params.shopId,
        from_user_id: member.user_id,
        to_member_id: body.to_member_id,
        position: body.position,
        salary_range: body.salary_range,
        benefits: body.benefits ?? null,
        shop_intro: body.shop_intro ?? null,
        message: body.message ?? null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Create notification for target user
    if (targetMember?.user_id) {
      const { data: shopData } = await supabase
        .from("shops")
        .select("name")
        .eq("id", params.shopId)
        .single();

      await supabase.from("notifications").insert({
        user_id: targetMember.user_id,
        type: "proposal_received",
        title: "새 제안이 도착했습니다",
        body: `${shopData?.name ?? "매장"}에서 ${body.position} 포지션으로 제안을 보냈습니다.`,
        data: { proposal_id: proposal.id },
      });
    }

    return NextResponse.json(proposal, { status: 201 });
  },
  { roles: ["owner", "admin"] }
);

export const GET = withShopAuth(
  async (_req, params) => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("talent_proposals")
      .select(
        `*,
         from_shop:shops!talent_proposals_from_shop_id_fkey(id, name, shop_type),
         to_member:shop_members!talent_proposals_to_member_id_fkey(id, display_name, profile:member_profiles(profile_photo_url, specialty))`
      )
      .eq("from_shop_id", params.shopId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? []);
  },
  { roles: ["owner", "admin"] }
);
