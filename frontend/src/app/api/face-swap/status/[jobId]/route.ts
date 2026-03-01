import { NextRequest, NextResponse } from "next/server";
import { getFaceSwapStatus } from "@/lib/services/fal-service";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { jobId } = await params;

  try {
    const result = await getFaceSwapStatus(jobId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get status";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
