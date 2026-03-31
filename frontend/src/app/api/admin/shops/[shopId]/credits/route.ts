import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { getOrCreateCredits } from "@/lib/services/proposal-credits";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error!;

  const { shopId } = await params;
  const body = await req.json();
  const amount = parseInt(String(body.amount));

  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive integer" }, { status: 400 });
  }

  const credits = await getOrCreateCredits(shopId);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shop_proposal_credits")
    .update({ total_credits: credits.total_credits + amount })
    .eq("id", credits.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
