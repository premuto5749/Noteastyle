import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth, ShopRole } from "@/lib/auth/shop";

type Params = { shopId: string; memberId: string };

// GET - Get a single member by ID (any member can view)
export const GET = withShopAuth<Params>(async (_req, params, member) => {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("shop_members")
    .select("id, user_id, shop_id, role, display_name, specialty, phone, is_active, joined_at, created_at")
    .eq("id", params.memberId)
    .eq("shop_id", member.shop_id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(data);
});

// PUT - Update member role/info (owner/admin only)
export const PUT = withShopAuth<Params>(
  async (req, params, member) => {
    const supabase = createServiceClient();
    const body = await req.json();
    const { memberId } = params;

    // Fetch the target member
    const { data: target } = await supabase
      .from("shop_members")
      .select("id, user_id, shop_id, role, is_active")
      .eq("id", memberId)
      .eq("shop_id", member.shop_id)
      .single();

    if (!target) {
      return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
    }

    // Cannot change own role
    if (target.user_id === member.user_id && body.role && body.role !== target.role) {
      return NextResponse.json(
        { error: "자신의 역할은 변경할 수 없습니다." },
        { status: 400 }
      );
    }

    // Role assignment permission checks
    if (body.role && body.role !== target.role) {
      const newRole = body.role as ShopRole;

      // admin can only assign designer/assistant roles
      if (member.role === "admin" && (newRole === "owner" || newRole === "admin")) {
        return NextResponse.json(
          { error: "관리자는 owner/admin 역할을 부여할 수 없습니다." },
          { status: 403 }
        );
      }

      // Last owner cannot be changed from owner role
      if (target.role === "owner") {
        const { count } = await supabase
          .from("shop_members")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", member.shop_id)
          .eq("role", "owner")
          .eq("is_active", true);

        if ((count ?? 0) <= 1) {
          return NextResponse.json(
            { error: "마지막 소유자의 역할은 변경할 수 없습니다." },
            { status: 400 }
          );
        }
      }
    }

    // Build update payload
    const updateData: Record<string, unknown> = {};
    if (body.role) updateData.role = body.role;
    if (body.display_name !== undefined) updateData.display_name = body.display_name;
    if (body.specialty !== undefined) updateData.specialty = body.specialty;
    if (body.phone !== undefined) updateData.phone = body.phone;

    const { data: updated, error } = await supabase
      .from("shop_members")
      .update(updateData)
      .eq("id", memberId)
      .eq("shop_id", member.shop_id)
      .select("id, user_id, shop_id, role, display_name, specialty, phone, is_active, joined_at, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Audit log
    await supabase.from("shop_audit_logs").insert({
      shop_id: member.shop_id,
      actor_id: member.user_id,
      action: "member.updated",
      target_type: "shop_member",
      target_id: memberId,
      details: {
        changes: updateData,
        previous_role: target.role,
      },
    });

    return NextResponse.json(updated);
  },
  { roles: ["owner", "admin"] }
);

// DELETE - Deactivate member (owner/admin only, soft delete)
export const DELETE = withShopAuth<Params>(
  async (_req, params, member) => {
    const supabase = createServiceClient();
    const { memberId } = params;

    // Fetch the target member
    const { data: target } = await supabase
      .from("shop_members")
      .select("id, user_id, shop_id, role, display_name, is_active")
      .eq("id", memberId)
      .eq("shop_id", member.shop_id)
      .eq("is_active", true)
      .single();

    if (!target) {
      return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
    }

    // Cannot deactivate self
    if (target.user_id === member.user_id) {
      return NextResponse.json(
        { error: "자기 자신을 비활성화할 수 없습니다." },
        { status: 400 }
      );
    }

    // Last owner cannot be deactivated
    if (target.role === "owner") {
      const { count } = await supabase
        .from("shop_members")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", member.shop_id)
        .eq("role", "owner")
        .eq("is_active", true);

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "마지막 소유자는 비활성화할 수 없습니다." },
          { status: 400 }
        );
      }
    }

    // Soft delete: set is_active = false
    const { error } = await supabase
      .from("shop_members")
      .update({ is_active: false })
      .eq("id", memberId)
      .eq("shop_id", member.shop_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Audit log
    await supabase.from("shop_audit_logs").insert({
      shop_id: member.shop_id,
      actor_id: member.user_id,
      action: "member.deactivated",
      target_type: "shop_member",
      target_id: memberId,
      details: {
        deactivated_role: target.role,
        deactivated_display_name: target.display_name,
      },
    });

    return NextResponse.json({ status: "deactivated" });
  },
  { roles: ["owner", "admin"] }
);
