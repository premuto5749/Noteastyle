import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error!;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["proposal_initial_credits", "proposal_monthly_credits"]);

  const result: Record<string, number> = {};
  for (const row of data ?? []) {
    result[row.key] = parseInt(String(row.value));
  }

  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error!;

  const body = await req.json();
  const supabase = createServiceClient();

  const updates: Array<{ key: string; value: string }> = [];
  if (typeof body.proposal_initial_credits === "number") {
    updates.push({ key: "proposal_initial_credits", value: String(body.proposal_initial_credits) });
  }
  if (typeof body.proposal_monthly_credits === "number") {
    updates.push({ key: "proposal_monthly_credits", value: String(body.proposal_monthly_credits) });
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  await Promise.all(
    updates.map((u) =>
      supabase
        .from("app_settings")
        .upsert({ key: u.key, value: u.value }, { onConflict: "key" })
    )
  );

  return NextResponse.json({ status: "updated" });
}
