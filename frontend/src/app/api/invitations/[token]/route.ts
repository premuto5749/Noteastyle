import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET - View invitation info (public, no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("shop_invitations")
    .select("id, role, expires_at, max_uses, use_count, is_active, shop:shops(id, name, shop_type)")
    .eq("token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "초대를 찾을 수 없습니다." }, { status: 404 });
  }

  if (!data.is_active || new Date(data.expires_at) < new Date() || data.use_count >= data.max_uses) {
    return NextResponse.json({ error: "만료되었거나 사용할 수 없는 초대입니다." }, { status: 410 });
  }

  const shop = data.shop as unknown as { id: string; name: string; shop_type: string } | null;
  return NextResponse.json({
    shop_name: shop?.name,
    shop_type: shop?.shop_type,
    role: data.role,
  });
}
