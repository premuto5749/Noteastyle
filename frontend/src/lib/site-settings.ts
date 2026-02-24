/**
 * 사이트 설정 타입 및 기본값
 * 클라이언트/서버 양쪽에서 import 가능 (서버 전용 코드 없음)
 */

export interface SiteSettings {
  // 기본 정보
  siteName: string;
  siteDescription: string;
  language: string;
  // 이미지
  faviconUrl: string;
  logoUrl: string;
  headerLogoUrl: string;
  loginBgImageUrl: string;
  ogImageUrl: string;
  shareLogoUrl: string;
  // SEO
  keywords: string[];
  // 테마
  accentColor: string;
  themeColor: string;
  primaryColor: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "Note-a-Style",
  siteDescription: "뷰티샵 시술 기록 & 포트폴리오 플랫폼",
  language: "ko",
  faviconUrl: "",
  logoUrl: "",
  headerLogoUrl: "",
  loginBgImageUrl: "",
  ogImageUrl: "",
  shareLogoUrl: "",
  keywords: [],
  accentColor: "#2563eb",
  themeColor: "#ffffff",
  primaryColor: "#000000",
};
