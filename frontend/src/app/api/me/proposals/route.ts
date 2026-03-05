import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();

  // Find the user's active member ID
  const { data: member } = await supabase
    .from("shop_members")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!member) {
    return NextResponse.json([]);
  }

  // Auto-expire pending proposals
  await supabase
    .from("talent_proposals")
    .update({ status: "expired" })
    .eq("to_member_id", member.id)
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());

  const { data, error } = await supabase
    .from("talent_proposals")
    .select(
      `*,
       from_shop:shops!talent_proposals_from_shop_id_fkey(id, name, shop_type, address)`
    )
    .eq("to_member_id", member.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}
