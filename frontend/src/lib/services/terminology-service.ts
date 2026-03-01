import { createServiceClient } from "@/lib/supabase/server";
import type { TreatmentExtractionResult } from "./openai-service";

/**
 * 음성 분석 결과에서 매장 전문 용어를 자동 수집 (UPSERT)
 * - 제품명에서 수집
 * - key_comments에서 수집
 * - 이미 있는 용어는 frequency + 1
 */
export async function collectTerminology(
  shopId: string,
  extraction: TreatmentExtractionResult
): Promise<void> {
  const supabase = createServiceClient();
  const terms: { term: string; category: string }[] = [];

  // 제품명에서 수집
  extraction.products_used?.forEach((p) => {
    if (p.brand) terms.push({ term: p.brand, category: "product" });
  });

  // key_comments에서 수집
  extraction.key_comments?.forEach((c) => {
    if (c.text.length >= 2 && c.text.length <= 20) {
      terms.push({ term: c.text, category: c.category });
    }
  });

  // UPSERT via RPC
  for (const { term, category } of terms) {
    await supabase.rpc("upsert_terminology", {
      p_shop_id: shopId,
      p_term: term,
      p_category: category,
    });
  }
}

/**
 * 매장의 상위 빈도 용어 목록 조회
 */
export async function getShopTerminology(
  shopId: string,
  limit = 50
): Promise<string[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("shop_terminology")
    .select("term")
    .eq("shop_id", shopId)
    .order("frequency", { ascending: false })
    .limit(limit);
  return data?.map((d) => d.term) ?? [];
}
