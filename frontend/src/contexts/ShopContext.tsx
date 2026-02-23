"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";

export interface ShopMembership {
  member_id: string;
  shop_id: string;
  shop_name: string;
  shop_type: string;
  role: "owner" | "admin" | "designer" | "assistant";
  display_name: string;
  specialty: string | null;
}

interface ShopContextType {
  currentShop: ShopMembership | null;
  shops: ShopMembership[];
  isLoading: boolean;
  switchShop: (shopId: string) => void;
  refreshShops: () => Promise<void>;
}

const ShopContext = createContext<ShopContextType>({
  currentShop: null,
  shops: [],
  isLoading: true,
  switchShop: () => {},
  refreshShops: async () => {},
});

const STORAGE_KEY = "noteastyle_current_shop_id";

// Pages that don't require shop context
const SHOP_EXEMPT_PATHS = ["/login", "/onboarding", "/invite", "/reset-password", "/admin"];

function isShopExemptPath(pathname: string): boolean {
  return SHOP_EXEMPT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [shops, setShops] = useState<ShopMembership[]>([]);
  const [currentShop, setCurrentShop] = useState<ShopMembership | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshShops = useCallback(async () => {
    if (!user) {
      setShops([]);
      setCurrentShop(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/me/shops");
      if (!res.ok) {
        setShops([]);
        setCurrentShop(null);
        return;
      }
      const data: ShopMembership[] = await res.json();
      setShops(data);

      if (data.length === 0) {
        setCurrentShop(null);
        return;
      }

      // Try to restore previously selected shop
      const savedShopId =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      const saved = savedShopId
        ? data.find((s) => s.shop_id === savedShopId)
        : null;

      setCurrentShop(saved || data[0]);
    } catch {
      setShops([]);
      setCurrentShop(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const switchShop = useCallback(
    (shopId: string) => {
      const target = shops.find((s) => s.shop_id === shopId);
      if (target) {
        setCurrentShop(target);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, shopId);
        }
      }
    },
    [shops]
  );

  // Load shops when user changes
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setShops([]);
      setCurrentShop(null);
      setIsLoading(false);
      return;
    }

    refreshShops();
  }, [user, authLoading, refreshShops]);

  // Redirect to onboarding if authenticated but no shops (unless on exempt path)
  useEffect(() => {
    if (authLoading || isLoading) return;
    if (!user) return;
    if (isShopExemptPath(pathname)) return;

    if (shops.length === 0) {
      router.push("/onboarding");
    }
  }, [user, authLoading, isLoading, shops, pathname, router]);

  // Save current shop to localStorage
  useEffect(() => {
    if (currentShop && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, currentShop.shop_id);
    }
  }, [currentShop]);

  return (
    <ShopContext.Provider
      value={{ currentShop, shops, isLoading, switchShop, refreshShops }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  return useContext(ShopContext);
}
