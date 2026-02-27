import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cookie-based Supabase client for SSR auth (middleware, server components).
 * Uses anon key + cookies for session management.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Service-role Supabase client for API routes.
 * Bypasses RLS - use only in API routes for direct DB access.
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다."
    );
  }

  if (!supabaseKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다. " +
      "frontend/.env.local 파일에 SUPABASE_SERVICE_ROLE_KEY를 추가하세요."
    );
  }

  return createSupabaseClient(supabaseUrl, supabaseKey);
}

/**
 * Backward-compatible alias for createServiceClient.
 * Used by existing API routes.
 */
export const createServerClient = createServiceClient;
