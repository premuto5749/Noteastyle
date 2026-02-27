/**
 * Escape special characters in LIKE/ILIKE patterns.
 * Prevents wildcard injection via % and _ characters.
 */
export function escapeIlike(value: string): string {
  return value.replace(/%/g, "\\%").replace(/_/g, "\\_");
}
