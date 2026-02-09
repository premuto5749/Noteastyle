import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for use in API routes.
 * Uses the service role key to bypass RLS (since we don't use Supabase Auth).
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseKey);
}
