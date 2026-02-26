"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useShop } from "@/contexts/ShopContext";
import { useSidebar } from "@/contexts/SidebarContext";

const THEME_OPTIONS = [
  { value: "system", label: "시스템" },
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
] as const;

export function SidebarDrawer() {
  const { isOpen, close } = useSidebar();
  const { user, isAdmin } = useAuth();
  const { currentShop, shops, switchShop } = useShop();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const showAdminMenu = isAdmin;

  // Close on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleLogout = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    close();
    window.location.href = "/login";
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={close}
      />

      {/* Drawer panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-card border-l border-border shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* User info header */}
          <div className="px-4 pt-5 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.email ?? ""}
                </p>
                {currentShop && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {currentShop.display_name} · {currentShop.shop_name}
                  </p>
                )}
              </div>
              <button
                onClick={close}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="메뉴 닫기"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Shop switcher */}
            {shops.length > 1 && (
              <select
                value={currentShop?.shop_id ?? ""}
                onChange={(e) => switchShop(e.target.value)}
                className="mt-3 w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {shops.map((s) => (
                  <option key={s.shop_id} value={s.shop_id}>
                    {s.shop_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Menu sections */}
          <nav className="flex-1 py-2">
            {/* 작업 메뉴 */}
            <MenuSection title="작업 메뉴">
              <MenuItem href="/record" label="빠른 기록" />
              <MenuItem href="/treatments" label="시술 목록" />
              <MenuItem href="/treatments/new" label="새 시술 기록" />
              <MenuItem href="/tasks/all" label="작업 전체 보기" />
              <MenuItem href="/reservation" label="예약 등록" />
            </MenuSection>

            {/* 매장 관리 */}
            <MenuSection title="매장 관리">
              <MenuItem href="/settings/shop" label="매장 설정" />
              <MenuItem href="/settings/services" label="시술 메뉴 관리" />
            </MenuSection>

            {/* 설정 */}
            <MenuSection title="설정">
              {/* Theme toggle inline */}
              <div className="px-4 py-2">
                <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        theme === opt.value
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {showAdminMenu && <MenuItem href="/admin" label="관리자 설정" />}
            </MenuSection>
          </nav>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3">
            <button
              onClick={handleLogout}
              className="w-full text-left text-sm text-destructive hover:text-destructive/80 transition-colors py-1"
            >
              로그아웃
            </button>
            <p className="text-[10px] text-hint mt-2">v0.1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-2">
      <p className="px-4 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      {children}
    </div>
  );
}

function MenuItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
        isActive
          ? "text-accent font-medium bg-accent/5"
          : "text-foreground hover:bg-muted"
      }`}
    >
      <span>{label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-hint">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}
