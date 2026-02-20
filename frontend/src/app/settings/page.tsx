"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();

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

      {/* Admin section */}
      {isAdmin && (
        <div className="px-4 mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            관리자
          </h2>
          <div className="bg-card rounded-2xl border border-border divide-y divide-border">
            <Link
              href="/admin"
              className="px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-foreground"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-sm text-foreground">관리자 설정</span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Account section */}
      <div className="px-4 mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          계정
        </h2>
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          {user && (
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-foreground">이메일</span>
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
            </div>
          )}
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full px-4 py-3 text-left text-sm text-red-500 dark:text-red-400"
            >
              로그아웃
            </button>
          </form>
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
