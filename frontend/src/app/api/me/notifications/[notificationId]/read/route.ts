import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { notificationId } = await params;

  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "read" });
}
