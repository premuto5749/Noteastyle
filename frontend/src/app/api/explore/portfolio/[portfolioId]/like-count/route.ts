import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ portfolioId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { portfolioId } = await params;
  const supabase = createServiceClient();

  // Get total like count
  const { count, error: countError } = await supabase
    .from("portfolio_likes")
    .select("*", { count: "exact", head: true })
    .eq("portfolio_id", portfolioId);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  // Check if current user has liked
  const { data: userLike, error: likeError } = await supabase
    .from("portfolio_likes")
    .select("id")
    .eq("portfolio_id", portfolioId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (likeError) {
    return NextResponse.json({ error: likeError.message }, { status: 500 });
  }

  return NextResponse.json({
    count: count ?? 0,
    liked: !!userLike,
  });
}
