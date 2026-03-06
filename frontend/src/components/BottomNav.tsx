"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShop } from "@/contexts/ShopContext";
import { QuickActionSheet } from "@/components/QuickActionSheet";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: HomeIcon },
  { href: "/tasks", label: "예약", icon: CalendarIcon },
  { href: "__quick_action__", label: "", icon: PlusIcon, isFab: true },
  { href: "/customers", label: "고객", icon: CustomerIcon },
  { href: "/portfolio", label: "갤러리", icon: GalleryIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  const { currentShop } = useShop();
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  if (pathname === "/login") return null;
  if (pathname === "/reset-password") return null;
  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/onboarding")) return null;
  if (pathname.startsWith("/invite")) return null;
  if (/^\/treatments\/[^/]+$/.test(pathname)) return null;
  if (!currentShop) return null;

  return (
    <>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50">
        <div className="glass border-t border-border/50 shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
          <div className="flex justify-around items-end h-16 px-2">
            {NAV_ITEMS.map((item) => {
              if (item.isFab) {
                return (
                  <button
                    key="fab"
                    onClick={() => setQuickActionOpen(true)}
                    className="relative flex flex-col items-center px-3 -mt-3"
                    aria-label="빠른 등록"
                  >
                    <div className="w-12 h-12 rounded-full bg-accent shadow-lg flex items-center justify-center active:scale-95 transition-transform">
                      <PlusIcon />
                    </div>
                  </button>
                );
              }

              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center gap-0.5 px-3 pt-2 pb-1.5 transition-colors ${
                    isActive ? "text-accent" : "text-subtle"
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-0 w-5 h-0.5 rounded-full bg-accent" />
                  )}
                  <item.icon active={isActive} />
                  <span
                    className={`text-[10px] ${
                      isActive ? "font-semibold" : "font-normal"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <QuickActionSheet
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
      />
    </>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={active ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {active ? (
        <path d="M3 9.5L12 2l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z" />
      ) : (
        <>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </>
      )}
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CustomerIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function GalleryIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
