import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/site-settings.server";
import { DEFAULT_SETTINGS } from "@/lib/site-settings";
import type { SiteSettings } from "@/lib/site-settings";

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const COLOR_FIELDS: (keyof SiteSettings)[] = [
  "accentColor",
  "themeColor",
  "primaryColor",
];

/**
 * Admin API: 사이트 설정 조회
 */
export async function GET() {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return error;

  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}

/**
 * Admin API: 사이트 설정 저장 (upsert, 부분 업데이트 지원)
 */
export async function PUT(request: Request) {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return error;

  let body: Partial<SiteSettings>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "유효하지 않은 JSON입니다." },
      { status: 400 }
    );
  }

  // HEX 색상 형식 검증
  for (const field of COLOR_FIELDS) {
    const value = body[field];
    if (value !== undefined && typeof value === "string" && value !== "") {
      if (!HEX_COLOR_REGEX.test(value)) {
        return NextResponse.json(
          { error: `${field}는 HEX 형식(#RRGGBB)이어야 합니다.` },
          { status: 400 }
        );
      }
    }
  }

  // keywords 배열 검증
  if (body.keywords !== undefined) {
    if (!Array.isArray(body.keywords)) {
      return NextResponse.json(
        { error: "keywords는 배열이어야 합니다." },
        { status: 400 }
      );
    }
    body.keywords = body.keywords.filter(
      (k) => typeof k === "string" && k.trim() !== ""
    );
  }

  // 기존 설정과 머지
  const current = await getSiteSettings();
  const merged: SiteSettings = { ...current };

  for (const key of Object.keys(body) as (keyof SiteSettings)[]) {
    if (key in DEFAULT_SETTINGS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (merged as any)[key] = body[key];
    }
  }

  const supabase = createServiceClient();
  const { error: dbError } = await supabase.from("app_settings").upsert(
    {
      key: "site_settings",
      value: merged,
    },
    { onConflict: "key" }
  );

  if (dbError) {
    return NextResponse.json(
      { error: "설정 저장에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, settings: merged });
}
