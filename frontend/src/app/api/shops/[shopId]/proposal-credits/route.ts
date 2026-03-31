import { NextResponse } from "next/server";
import { withShopAuth } from "@/lib/auth/shop";
import { getOrCreateCredits } from "@/lib/services/proposal-credits";

export const GET = withShopAuth(
  async (_req, params) => {
    const credits = await getOrCreateCredits(params.shopId);
    return NextResponse.json({
      total_credits: credits.total_credits,
      monthly_free: credits.monthly_free,
      last_monthly_reset: credits.last_monthly_reset,
    });
  },
  { roles: ["owner", "admin"] }
);
