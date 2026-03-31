"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useShop } from "@/contexts/ShopContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { NotificationBell } from "@/components/NotificationBell";

const MAIN_PAGES = ["/", "/tasks", "/customers", "/portfolio"];

export function AppHeader() {
  const pathname = usePathname();
  const { currentShop } = useShop();
  const { open } = useSidebar();
  const { settings } = useSiteSettings();

  const isMainPage = MAIN_PAGES.includes(pathname);
  if (!isMainPage || !currentShop) return null;

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/30 shadow-sm">
      <div className="flex items-center justify-between px-4 h-12">
        {/* Left: Logo or shop name */}
        <div className="flex items-center gap-2 min-w-0">
          {settings.headerLogoUrl ? (
            <Image
              src={settings.headerLogoUrl}
              alt={currentShop.shop_name}
              width={120}
              height={28}
              className="h-7 w-auto object-contain"
              priority
            />
          ) : (
            <span className="text-base font-bold text-foreground truncate">
              {currentShop.shop_name}
            </span>
          )}
        </div>

        {/* Right: Notification Bell + Hamburger menu */}
        <div className="flex items-center gap-1">
        <NotificationBell />
        <button
          onClick={open}
          className="p-2 -mr-2 text-foreground hover:text-accent transition-colors"
          aria-label="메뉴 열기"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        </div>
      </div>
    </header>
  );
}
