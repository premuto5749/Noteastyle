/**
 * Legacy service type labels for backward compatibility.
 * Old treatment/reservation records store English codes ("cut", "color" etc).
 * New records store Korean category names ("커트", "염색" etc).
 */
export const LEGACY_SERVICE_LABELS: Record<string, string> = {
  cut: "커트",
  color: "염색",
  perm: "펌",
  treatment: "트리트먼트",
  bleach: "블리치",
  scalp: "두피관리",
};

/**
 * Get display label for a service_type value.
 * Checks DB category names first, then falls back to legacy map.
 */
export function getServiceLabel(
  serviceType: string,
  categoryNames?: string[]
): string {
  // If the value itself matches a known category name, use as-is
  if (categoryNames?.includes(serviceType)) return serviceType;
  // Legacy English code → Korean label
  if (LEGACY_SERVICE_LABELS[serviceType]) return LEGACY_SERVICE_LABELS[serviceType];
  // Unknown: return as-is
  return serviceType;
}
