import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Check if this is a password recovery flow
      const recoveryTimestamp = data.user?.recovery_sent_at;
      if (recoveryTimestamp) {
        const recoveryTime = new Date(recoveryTimestamp).getTime();
        const now = Date.now();
        // If recovery was sent within the last 10 minutes, redirect to reset page
        if (now - recoveryTime < 10 * 60 * 1000) {
          return NextResponse.redirect(`${origin}/reset-password`);
        }
      }

      return NextResponse.redirect(origin);
    }
  }

  // Return to login on error
  return NextResponse.redirect(`${origin}/login`);
}
