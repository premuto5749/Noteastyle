import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "endpoint and keys are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: auth.user.id, endpoint, keys },
      { onConflict: "user_id,endpoint" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: "subscribed" }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { endpoint } = body;

  const supabase = createServiceClient();
  const query = supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", auth.user.id);

  if (endpoint) {
    await query.eq("endpoint", endpoint);
  } else {
    await query;
  }

  return NextResponse.json({ status: "unsubscribed" });
}
