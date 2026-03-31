import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ portfolioId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { portfolioId } = await params;
  const supabase = createServiceClient();

  // Check if user already liked this portfolio
  const { data: existing, error: selectError } = await supabase
    .from("portfolio_likes")
    .select("id")
    .eq("portfolio_id", portfolioId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  if (existing) {
    // Unlike: remove the like
    const { error: deleteError } = await supabase
      .from("portfolio_likes")
      .delete()
      .eq("id", existing.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ liked: false });
  }

  // Like: insert new like
  const { error: insertError } = await supabase
    .from("portfolio_likes")
    .insert({ portfolio_id: portfolioId, user_id: auth.user.id });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ liked: true });
}
