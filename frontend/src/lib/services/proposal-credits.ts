import { createServiceClient } from "@/lib/supabase/server";

/**
 * Get or create proposal credits for a shop.
 * Handles monthly reset logic.
 */
export async function getOrCreateCredits(shopId: string) {
  const supabase = createServiceClient();

  const { data: initialSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "proposal_initial_credits")
    .single();
  const { data: monthlySetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "proposal_monthly_credits")
    .single();

  const initialCredits = parseInt(String(initialSetting?.value ?? "5"));
  const monthlyCredits = parseInt(String(monthlySetting?.value ?? "5"));

  let { data: credits } = await supabase
    .from("shop_proposal_credits")
    .select("*")
    .eq("shop_id", shopId)
    .maybeSingle();

  if (!credits) {
    const { data: newCredits } = await supabase
      .from("shop_proposal_credits")
      .insert({
        shop_id: shopId,
        total_credits: initialCredits,
        monthly_free: monthlyCredits,
        last_monthly_reset: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();
    return newCredits!;
  }

  // Monthly reset check
  const now = new Date();
  const lastReset = new Date(credits.last_monthly_reset);
  if (
    now.getFullYear() !== lastReset.getFullYear() ||
    now.getMonth() !== lastReset.getMonth()
  ) {
    const { data: updated } = await supabase
      .from("shop_proposal_credits")
      .update({
        total_credits: credits.total_credits + monthlyCredits,
        last_monthly_reset: now.toISOString().slice(0, 10),
      })
      .eq("id", credits.id)
      .select()
      .single();
    return updated!;
  }

  return credits;
}

/**
 * Deduct one credit. Returns false if insufficient.
 */
export async function deductCredit(shopId: string): Promise<boolean> {
  const credits = await getOrCreateCredits(shopId);
  if (credits.total_credits < 1) return false;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("shop_proposal_credits")
    .update({ total_credits: credits.total_credits - 1 })
    .eq("id", credits.id);

  return !error;
}
