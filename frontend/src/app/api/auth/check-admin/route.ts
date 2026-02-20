import { NextResponse } from "next/server";
import { checkCurrentUserIsAdmin } from "@/lib/auth/admin";

export async function GET() {
  const { isAdmin, userId } = await checkCurrentUserIsAdmin();
  return NextResponse.json({ isAdmin, userId });
}
