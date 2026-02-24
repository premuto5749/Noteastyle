"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SiteSettings } from "@/lib/site-settings";
import { DEFAULT_SETTINGS } from "@/lib/site-settings";

interface SiteSettingsContextType {
  settings: SiteSettings;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  refresh: async () => {},
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/site-settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {
      // 기본값 유지
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // accent 색상 변경 시 CSS 변수 동적 적용
  useEffect(() => {
    if (settings.accentColor && settings.accentColor !== DEFAULT_SETTINGS.accentColor) {
      document.documentElement.style.setProperty("--accent", settings.accentColor);
    } else {
      // 기본값으로 되돌릴 때 인라인 스타일 제거 → 스타일시트 규칙이 적용됨
      document.documentElement.style.removeProperty("--accent");
    }
  }, [settings.accentColor]);

  return (
    <SiteSettingsContext.Provider
      value={{ settings, isLoading, refresh: fetchSettings }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
