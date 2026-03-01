import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const GET = withShopAuth<{
  shopId: string;
}>(async (req, params) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { detail: "'from' and 'to' query parameters are required (ISO date)" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Fetch treatments with products in date range
  const { data: treatments } = await supabase
    .from("treatments")
    .select("id, products_used, created_at")
    .eq("shop_id", params.shopId)
    .gte("created_at", from)
    .lte("created_at", to)
    .not("products_used", "is", null);

  // Aggregate product usage
  const productMap = new Map<string, { brand: string; code: string | null; usage_count: number; last_used: string }>();

  for (const t of treatments || []) {
    if (!Array.isArray(t.products_used)) continue;
    for (const p of t.products_used as { brand?: string; code?: string }[]) {
      const brand = p.brand || "unknown";
      const code = p.code || null;
      const key = `${brand}::${code}`;
      const existing = productMap.get(key);
      if (existing) {
        existing.usage_count += 1;
        if (t.created_at > existing.last_used) {
          existing.last_used = t.created_at;
        }
      } else {
        productMap.set(key, {
          brand,
          code,
          usage_count: 1,
          last_used: t.created_at,
        });
      }
    }
  }

  const products = Array.from(productMap.values())
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 50);

  return NextResponse.json({
    period: { from, to },
    products,
    total_treatments: treatments?.length ?? 0,
  });
});
