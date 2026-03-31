import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const serviceClient = createServiceClient();
  const { count, error } = await serviceClient
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("is_read", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
