import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SidebarDrawer } from "@/components/SidebarDrawer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeColorMeta } from "@/components/ThemeColorMeta";
import { AuthProvider } from "@/contexts/AuthContext";
import { ShopProvider } from "@/contexts/ShopContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { getSiteSettings } from "@/lib/site-settings.server";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: settings.siteName,
    description: settings.siteDescription,
    manifest: "/manifest.webmanifest",
    ...(settings.faviconUrl && {
      icons: { icon: settings.faviconUrl },
    }),
    ...(settings.ogImageUrl && {
      openGraph: {
        title: settings.siteName,
        description: settings.siteDescription,
        images: [{ url: settings.ogImageUrl, width: 1200, height: 630 }],
      },
    }),
    ...(settings.keywords.length > 0 && {
      keywords: settings.keywords,
    }),
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: settings.siteName,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <html lang={settings.language} suppressHydrationWarning>
      <head>
        <ThemeColorMeta />
      </head>
      <body className="antialiased bg-background text-foreground pb-20">
        <SiteSettingsProvider initialSettings={settings}>
          <ThemeProvider>
            <AuthProvider>
              <ShopProvider>
                <SidebarProvider>
                  <AppHeader />
                  <ErrorBoundary>
                    <main className="min-h-screen">{children}</main>
                  </ErrorBoundary>
                  <BottomNav />
                  <SidebarDrawer />
                </SidebarProvider>
              </ShopProvider>
            </AuthProvider>
          </ThemeProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
