import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const { proposalId } = await params;
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const action = body.action as "accept" | "decline";
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action must be 'accept' or 'decline'" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify the proposal belongs to this user's member
  const { data: member } = await supabase
    .from("shop_members")
    .select("id, user_id, display_name")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: proposal } = await supabase
    .from("talent_proposals")
    .select("*, from_shop:shops!talent_proposals_from_shop_id_fkey(id, name)")
    .eq("id", proposalId)
    .eq("to_member_id", member.id)
    .maybeSingle();

  if (!proposal) {
    return NextResponse.json({ error: "제안을 찾을 수 없습니다." }, { status: 404 });
  }

  if (proposal.status !== "pending") {
    return NextResponse.json({ error: "이미 처리된 제안입니다." }, { status: 400 });
  }

  if (new Date(proposal.expires_at) < new Date()) {
    await supabase
      .from("talent_proposals")
      .update({ status: "expired" })
      .eq("id", proposalId);
    return NextResponse.json({ error: "만료된 제안입니다." }, { status: 400 });
  }

  const newStatus = action === "accept" ? "accepted" : "declined";

  const { data: updated, error } = await supabase
    .from("talent_proposals")
    .update({ status: newStatus, responded_at: new Date().toISOString() })
    .eq("id", proposalId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Notify the from_shop's owner/admin users
  const { data: shopMembers } = await supabase
    .from("shop_members")
    .select("user_id")
    .eq("shop_id", proposal.from_shop_id)
    .in("role", ["owner", "admin"])
    .eq("is_active", true);

  if (shopMembers && shopMembers.length > 0) {
    const notifTitle =
      action === "accept" ? "제안이 수락되었습니다" : "제안이 거절되었습니다";
    const notifBody =
      action === "accept"
        ? `${member.display_name} 디자이너가 제안을 수락했습니다.`
        : `${member.display_name} 디자이너가 제안을 거절했습니다.`;

    await supabase.from("notifications").insert(
      shopMembers.map((m: { user_id: string }) => ({
        user_id: m.user_id,
        type: action === "accept" ? "proposal_accepted" : "proposal_declined",
        title: notifTitle,
        body: notifBody,
        data: { proposal_id: proposalId },
      }))
    );
  }

  return NextResponse.json(updated);
}
