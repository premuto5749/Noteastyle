"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLoading: true,
  refreshAuth: async () => {},
});

const PROTECTED_PATHS = [
  "/",
  "/record",
  "/treatments",
  "/customers",
  "/explore",
  "/portfolio",
  "/reservation",
  "/settings",
  "/tasks",
  "/admin",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const checkAdmin = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check-admin");
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      await checkAdmin();
    } else {
      setIsAdmin(false);
    }
  }, [supabase, checkAdmin]);

  useEffect(() => {
    // Initial auth check
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        await checkAdmin();
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (currentUser) {
          await checkAdmin();
        }
        router.refresh();
      }

      if (event === "SIGNED_OUT") {
        setUser(null);
        setIsAdmin(false);
        if (isProtectedPath(pathname)) {
          router.push("/login?expired=true");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
