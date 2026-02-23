import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("shop_members")
    .select(
      "id, shop_id, role, display_name, specialty, is_active, joined_at, shop:shops(id, name, shop_type)"
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("joined_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Flatten shop data for easier frontend consumption
  const shops = (data || []).map((m) => {
    const shop = m.shop as unknown as { id: string; name: string; shop_type: string } | null;
    return {
      member_id: m.id,
      shop_id: m.shop_id,
      shop_name: shop?.name,
      shop_type: shop?.shop_type,
      role: m.role,
      display_name: m.display_name,
      specialty: m.specialty,
    };
  });

  return NextResponse.json(shops);
}
