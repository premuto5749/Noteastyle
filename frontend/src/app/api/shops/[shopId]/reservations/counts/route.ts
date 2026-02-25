import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withShopAuth } from "@/lib/auth/shop";

export const GET = withShopAuth(async (req, params, _member) => {
  const supabase = createServiceClient();
  const shopId = params.shopId;
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { detail: "month parameter required (YYYY-MM)" },
      { status: 400 }
    );
  }

  // Calculate first and last day of the month
  const [year, mon] = month.split("-").map(Number);
  const firstDay = `${month}-01`;
  const lastDay = `${year}-${String(mon).padStart(2, "0")}-${new Date(year, mon, 0).getDate()}`;

  const { data, error } = await supabase
    .from("reservations")
    .select("scheduled_date")
    .eq("shop_id", shopId)
    .gte("scheduled_date", firstDay)
    .lte("scheduled_date", lastDay);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 400 });
  }

  // Aggregate counts by date
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const d = row.scheduled_date;
    counts[d] = (counts[d] ?? 0) + 1;
  }

  return NextResponse.json(counts);
});
