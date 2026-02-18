"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <meta
      name="theme-color"
      content={resolvedTheme === "dark" ? "#0a0a0a" : "#ffffff"}
    />
  );
}
