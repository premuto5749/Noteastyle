"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SettingsPage() {
  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-header-bg backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1 -ml-1 text-muted-foreground"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-foreground">설정</h1>
        </div>
      </div>

      {/* Theme section */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          테마
        </h2>
        <div className="bg-card rounded-2xl border border-border p-4">
          <ThemeToggle />
        </div>
      </div>

      {/* App info */}
      <div className="px-4 mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          앱 정보
        </h2>
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-foreground">버전</span>
            <span className="text-sm text-muted-foreground">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
