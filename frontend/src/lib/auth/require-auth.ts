import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

interface AuthSuccess {
  user: User;
}

interface AuthError {
  error: Response;
}

/**
 * Verify the current user is authenticated via Supabase Auth session.
 * Use for non-shop-scoped API routes (face-swap, voice, etc.)
 * For shop-scoped routes, use withShopAuth instead.
 */
export async function requireAuth(): Promise<AuthSuccess | AuthError> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      ),
    };
  }

  return { user };
}
