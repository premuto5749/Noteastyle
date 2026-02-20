import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeColorMeta } from "@/components/ThemeColorMeta";

export const metadata: Metadata = {
  title: "Note-a-Style",
  description: "뷰티샵 시술 기록 & 포트폴리오 플랫폼",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Note-a-Style",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <ThemeColorMeta />
      </head>
      <body className="antialiased bg-background text-foreground pb-20">
        <ThemeProvider>
          <ErrorBoundary>
            <main className="min-h-screen">{children}</main>
          </ErrorBoundary>
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
