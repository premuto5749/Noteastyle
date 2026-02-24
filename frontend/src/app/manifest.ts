import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/site-settings.server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();

  return {
    name: settings.siteName,
    short_name: settings.siteName.replace(/[^a-zA-Z0-9가-힣]/g, "").slice(0, 12) || "NoteaStyle",
    description: settings.siteDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: settings.themeColor || "#ffffff",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
