import { createClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client.
 * Currently only used for Supabase Storage (photo uploads).
 */
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
