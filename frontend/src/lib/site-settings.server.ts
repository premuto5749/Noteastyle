import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/site-settings";
import type { SiteSettings } from "@/lib/site-settings";

/**
 * DB에서 사이트 설정을 조회하여 DEFAULT_SETTINGS와 머지.
 * layout.tsx, manifest.ts, API routes 등 서버 측에서만 사용.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("key", "site_settings")
      .single();

    if (error || !data) {
      return { ...DEFAULT_SETTINGS };
    }

    const stored = data.value as Partial<SiteSettings>;
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
