"use client";

import { useMemo } from "react";
import { useShop } from "@/contexts/ShopContext";
import { createShopApi } from "@/lib/api";

// Placeholder shop ID used during SSR/SSG when no shop is selected yet.
// API calls made with this ID will fail, but pages guard against null shop state.
const PLACEHOLDER_SHOP_ID = "00000000-0000-0000-0000-000000000000";

export function useShopApi() {
  const { currentShop } = useShop();

  return useMemo(
    () => createShopApi(currentShop?.shop_id ?? PLACEHOLDER_SHOP_ID),
    [currentShop]
  );
}
