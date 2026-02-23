import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

// GET - List active invitations (owner/admin only)
export const GET = withShopAuth(async (_req, _params, member) => {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shop_invitations")
    .select("*")
    .eq("shop_id", member.shop_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}, { roles: ["owner", "admin"] });

// POST - Create invitation (owner/admin only)
export const POST = withShopAuth(async (req, _params, member) => {
  const body = await req.json();
  const { role = "designer", max_uses = 1, expires_in_days = 7 } = body;

  // Validate role - owner role cannot be invited
  if (!["admin", "designer", "assistant"].includes(role)) {
    return NextResponse.json({ error: "유효하지 않은 역할입니다." }, { status: 400 });
  }

  // admin cannot create admin invitations
  if (member.role === "admin" && role === "admin") {
    return NextResponse.json({ error: "관리자는 관리자 초대를 생성할 수 없습니다." }, { status: 403 });
  }

  const token = randomBytes(32).toString("hex");
  const expires_at = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString();

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shop_invitations")
    .insert({
      shop_id: member.shop_id,
      token,
      role,
      created_by: member.user_id,
      expires_at,
      max_uses,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Audit log
  await supabase.from("shop_audit_logs").insert({
    shop_id: member.shop_id,
    actor_id: member.user_id,
    action: "invitation.created",
    target_type: "shop_invitation",
    target_id: data.id,
    details: { role, max_uses, expires_in_days },
  });

  return NextResponse.json(data, { status: 201 });
}, { roles: ["owner", "admin"] });
