import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// POST - Accept invitation (auth required)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 1. Authenticate user via cookie-based client
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // 2. Fetch and validate invitation
  const { data: invitation, error: fetchError } = await serviceClient
    .from("shop_invitations")
    .select("*, shop:shops(id, name)")
    .eq("token", token)
    .single();

  if (fetchError || !invitation) {
    return NextResponse.json({ error: "초대를 찾을 수 없습니다." }, { status: 404 });
  }

  if (!invitation.is_active) {
    return NextResponse.json({ error: "비활성화된 초대입니다." }, { status: 410 });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "만료된 초대입니다." }, { status: 410 });
  }

  if (invitation.use_count >= invitation.max_uses) {
    return NextResponse.json({ error: "사용 횟수를 초과한 초대입니다." }, { status: 410 });
  }

  // 3. Atomically increment use_count with optimistic locking
  const { data: updated, error: updateError } = await serviceClient
    .from("shop_invitations")
    .update({ use_count: invitation.use_count + 1 })
    .eq("id", invitation.id)
    .eq("use_count", invitation.use_count) // optimistic locking
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "초대가 이미 사용되었습니다." }, { status: 409 });
  }

  // 4. Check if user is already a member of the shop
  const { data: existingMember } = await serviceClient
    .from("shop_members")
    .select("id, is_active")
    .eq("user_id", user.id)
    .eq("shop_id", invitation.shop_id)
    .single();

  if (existingMember?.is_active) {
    return NextResponse.json({ error: "이미 해당 매장의 멤버입니다." }, { status: 409 });
  }

  // 5. Resolve display name: user_profiles first, then email
  let displayName = user.email || "Unknown";
  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .single();

  if (profile?.full_name) {
    displayName = profile.full_name;
  }

  // 6. Create or reactivate shop_members entry
  let newMember;
  if (existingMember && !existingMember.is_active) {
    // Reactivate deactivated member
    const { data, error } = await serviceClient
      .from("shop_members")
      .update({
        is_active: true,
        role: invitation.role,
        display_name: displayName,
      })
      .eq("id", existingMember.id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    newMember = data;
  } else {
    const { data, error } = await serviceClient
      .from("shop_members")
      .insert({
        user_id: user.id,
        shop_id: invitation.shop_id,
        role: invitation.role,
        display_name: displayName,
      })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    newMember = data;
  }

  // 7. Audit log
  const shop = invitation.shop as unknown as { id: string; name: string } | null;
  await serviceClient.from("shop_audit_logs").insert({
    shop_id: invitation.shop_id,
    actor_id: user.id,
    action: "member.joined",
    target_type: "shop_member",
    target_id: newMember.id,
    details: {
      role: invitation.role,
      invitation_id: invitation.id,
      shop_name: shop?.name,
    },
  });

  return NextResponse.json({
    member: newMember,
    shop_name: shop?.name,
  }, { status: 201 });
}
