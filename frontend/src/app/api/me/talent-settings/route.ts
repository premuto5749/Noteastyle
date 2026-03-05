import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();

  const { data: member } = await supabase
    .from("shop_members")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ open_to_proposals: false, blocked_shop_ids: [] });
  }

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("open_to_proposals, blocked_shop_ids")
    .eq("member_id", member.id)
    .maybeSingle();

  return NextResponse.json({
    open_to_proposals: profile?.open_to_proposals ?? false,
    blocked_shop_ids: profile?.blocked_shop_ids ?? [],
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const supabase = createServiceClient();

  const { data: member } = await supabase
    .from("shop_members")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.open_to_proposals === "boolean") {
    update.open_to_proposals = body.open_to_proposals;
  }
  if (Array.isArray(body.blocked_shop_ids)) {
    update.blocked_shop_ids = body.blocked_shop_ids;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  const { error } = await supabase
    .from("member_profiles")
    .update(update)
    .eq("member_id", member.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: "updated" });
}
