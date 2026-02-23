"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useShopApi } from "@/hooks/useShopApi";
import { type ServiceCategory } from "@/lib/api";
import { getServiceLabel } from "@/lib/service-utils";

export function useServiceMenu() {
  const { api, isReady } = useShopApi();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getServiceCategories();
      setCategories(data);
    } catch {
      // silently fail — will use fallback labels
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!isReady) return;
    refresh();
  }, [refresh, isReady]);

  const categoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories]
  );

  const getCategoryLabel = useCallback(
    (serviceType: string) => getServiceLabel(serviceType, categoryNames),
    [categoryNames]
  );

  return { categories, loading, refresh, getCategoryLabel };
}
