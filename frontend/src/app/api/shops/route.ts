import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Verify authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const body = await request.json();

  // Create the shop
  const { data: shop, error: shopError } = await serviceClient
    .from("shops")
    .insert({
      name: body.name,
      shop_type: body.shop_type,
      address: body.address ?? null,
      phone: body.phone ?? null,
    })
    .select()
    .single();

  if (shopError) {
    return NextResponse.json({ detail: shopError.message }, { status: 400 });
  }

  // Get user profile for display_name default
  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .single();

  const displayName = body.display_name || profile?.full_name || "관리자";

  // Auto-register creator as owner
  const { error: memberError } = await serviceClient
    .from("shop_members")
    .insert({
      user_id: user.id,
      shop_id: shop.id,
      role: "owner",
      display_name: displayName,
    });

  if (memberError) {
    // Cleanup: delete the shop if member creation failed
    await serviceClient.from("shops").delete().eq("id", shop.id);
    return NextResponse.json({ detail: memberError.message }, { status: 400 });
  }

  // Audit log
  await serviceClient.from("shop_audit_logs").insert({
    shop_id: shop.id,
    actor_id: user.id,
    action: "shop.created",
    details: { shop_name: shop.name, shop_type: shop.shop_type },
  });

  return NextResponse.json(shop, { status: 201 });
}
