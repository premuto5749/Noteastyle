import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/site-settings.server";

/**
 * Public API: 사이트 설정 조회 (인증 불필요)
 * SiteSettingsContext에서 호출하여 클라이언트에 설정 전달
 */
export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json(settings, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
    });
  } catch {
    // 에러 시에도 기본값 반환
    const { DEFAULT_SETTINGS } = await import("@/lib/site-settings");
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}
