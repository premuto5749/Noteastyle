"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShop } from "@/contexts/ShopContext";

const NAV_ITEMS = [
  { href: "/customers", label: "고객", icon: CustomerIcon },
  { href: "/explore", label: "탐색", icon: ExploreIcon },
  { href: "/", label: "홈", icon: HomeLogoIcon, isCenter: true },
  { href: "/tasks", label: "작업", icon: TaskIcon },
  { href: "/portfolio", label: "포트폴리오", icon: PortfolioIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  const { currentShop } = useShop();

  if (pathname === "/login") return null;
  if (pathname === "/reset-password") return null;
  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/onboarding")) return null;
  if (pathname.startsWith("/invite")) return null;
  if (/^\/treatments\/[^/]+$/.test(pathname)) return null;
  if (!currentShop) return null;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card border-t border-border z-50">
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                isActive
                  ? "text-foreground"
                  : item.isCenter
                    ? "text-muted-foreground"
                    : "text-subtle"
              }`}
            >
              <item.icon active={isActive} />
              <span className={item.isCenter ? "font-semibold" : ""}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeLogoIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ExploreIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function CustomerIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function TaskIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="9 14l2 2 4-4" />
    </svg>
  );
}

function PortfolioIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
