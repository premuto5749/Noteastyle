import { NextRequest, NextResponse } from "next/server";
import { getFaceSwapStatus } from "@/lib/services/akool-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const result = await getFaceSwapStatus(jobId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get status";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
