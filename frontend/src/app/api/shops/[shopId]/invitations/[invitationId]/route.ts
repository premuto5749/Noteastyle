import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

// DELETE - Revoke/cancel an invitation (owner/admin only)
export const DELETE = withShopAuth<{ shopId: string; invitationId: string }>(
  async (_req, params, member) => {
    const { invitationId } = params;
    const supabase = createServiceClient();

    // Verify invitation belongs to this shop and is still active
    const { data: invitation } = await supabase
      .from("shop_invitations")
      .select("id, is_active")
      .eq("id", invitationId)
      .eq("shop_id", member.shop_id)
      .single();

    if (!invitation) {
      return NextResponse.json({ error: "초대를 찾을 수 없습니다." }, { status: 404 });
    }

    if (!invitation.is_active) {
      return NextResponse.json({ error: "이미 비활성화된 초대입니다." }, { status: 400 });
    }

    // Deactivate the invitation
    const { error } = await supabase
      .from("shop_invitations")
      .update({ is_active: false })
      .eq("id", invitationId)
      .eq("shop_id", member.shop_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Audit log
    await supabase.from("shop_audit_logs").insert({
      shop_id: member.shop_id,
      actor_id: member.user_id,
      action: "invitation.revoked",
      target_type: "shop_invitation",
      target_id: invitationId,
      details: {},
    });

    return NextResponse.json({ status: "revoked" });
  },
  { roles: ["owner", "admin"] }
);
