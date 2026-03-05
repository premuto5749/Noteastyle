import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: expired } = await supabase
    .from("talent_proposals")
    .select("id, from_shop_id, to_member_id, from_user_id")
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());

  if (!expired?.length) {
    return NextResponse.json({ expired: 0 });
  }

  const ids = expired.map((p) => p.id);

  await supabase
    .from("talent_proposals")
    .update({ status: "expired" })
    .in("id", ids);

  // Notify both parties
  const notifications: Array<{
    user_id: string;
    type: string;
    title: string;
    body: string;
    data: Record<string, string>;
  }> = [];

  for (const proposal of expired) {
    // Notify the designer
    const { data: member } = await supabase
      .from("shop_members")
      .select("user_id")
      .eq("id", proposal.to_member_id)
      .maybeSingle();

    if (member?.user_id) {
      notifications.push({
        user_id: member.user_id,
        type: "proposal_expired",
        title: "제안이 만료되었습니다",
        body: "응답하지 않아 제안이 만료되었습니다.",
        data: { proposal_id: proposal.id },
      });
    }

    // Notify the shop owner/admins
    const { data: shopMembers } = await supabase
      .from("shop_members")
      .select("user_id")
      .eq("shop_id", proposal.from_shop_id)
      .in("role", ["owner", "admin"])
      .eq("is_active", true);

    for (const sm of shopMembers ?? []) {
      notifications.push({
        user_id: sm.user_id,
        type: "proposal_expired",
        title: "제안이 만료되었습니다",
        body: "7일이 지나 제안이 자동 만료되었습니다.",
        data: { proposal_id: proposal.id },
      });
    }
  }

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }

  return NextResponse.json({ expired: ids.length });
}
