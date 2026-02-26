"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ServiceSelector } from "@/components/ServiceSelector";
import { type Treatment, type ProductUsed, type ShopService } from "@/lib/api";
import { useShopApi } from "@/hooks/useShopApi";
import { useServiceMenu } from "@/hooks/useServiceMenu";

export default function EditTreatmentPage() {
  const params = useParams();
  const router = useRouter();
  const { api, isReady } = useShopApi();
  const { categories } = useServiceMenu();
  const id = params.id as string;

  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedServiceName, setSelectedServiceName] = useState<string | null>(null);
  const [productBrand, setProductBrand] = useState("");
  const [productCode, setProductCode] = useState("");
  const [products, setProducts] = useState<ProductUsed[]>([]);
  const [area, setArea] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [satisfaction, setSatisfaction] = useState("");
  const [nextVisit, setNextVisit] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const t = await api.getTreatment(id);
      setTreatment(t);

      // Populate form fields
      setSelectedCategory(t.service_type);
      setSelectedServiceName(t.service_detail || null);
      setProducts(t.products_used || []);
      setArea(t.area || "");
      setDuration(t.duration_minutes ? String(t.duration_minutes) : "");
      setPrice(t.price != null ? String(t.price) : "");
      setNotes(t.customer_notes || "");
      setSatisfaction(t.satisfaction || "");
      setNextVisit(t.next_visit_recommendation || "");
    } catch {
      alert("시술 정보를 불러올 수 없습니다.");
      router.push("/treatments");
    } finally {
      setLoading(false);
    }
  }, [id, router, api]);

  useEffect(() => {
    if (!isReady) return;
    loadData();
  }, [loadData, isReady]);

  const addProduct = () => {
    if (!productBrand.trim()) return;
    setProducts((prev) => [
      ...prev,
      { brand: productBrand.trim(), code: productCode.trim() || undefined, area: area.trim() || undefined },
    ]);
    setProductBrand("");
    setProductCode("");
  };

  const removeProduct = (idx: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleServiceSelect = (categoryName: string, service?: ShopService) => {
    setSelectedCategory(categoryName);
    setSelectedServiceName(service?.name ?? null);
  };

  const handleSubmit = async () => {
    if (!selectedCategory) return;
    setSaving(true);
    try {
      await api.updateTreatment(id, {
        service_type: selectedCategory,
        service_detail: selectedServiceName || undefined,
        products_used: products.length > 0 ? products : undefined,
        area: area || undefined,
        duration_minutes: duration ? parseInt(duration) : undefined,
        price: price ? parseInt(price) : undefined,
        customer_notes: notes || undefined,
        satisfaction: satisfaction || undefined,
        next_visit_recommendation: nextVisit || undefined,
      });
      router.push(`/treatments/${id}`);
    } catch {
      alert("수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <p className="text-subtle">불러오는 중...</p>
      </div>
    );
  }

  if (!treatment) return null;

  const customerName = treatment.customer?.name;

  return (
    <div>
      <PageHeader title="시술 기록 수정" />

      <div className="p-4 space-y-4">
        {/* Customer (read-only) */}
        {customerName && (
          <div className="bg-surface rounded-2xl p-4 border border-border">
            <label className="text-sm font-medium text-muted-foreground block mb-1">고객</label>
            <p className="text-sm text-foreground">{customerName}</p>
          </div>
        )}

        {/* Service */}
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <label className="text-sm font-medium text-muted-foreground block mb-3">시술 종류 *</label>
          <ServiceSelector
            categories={categories}
            onSelect={handleServiceSelect}
            selectedCategory={selectedCategory ?? undefined}
            selectedService={selectedServiceName ?? undefined}
          />
        </div>

        {/* Products */}
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <label className="text-sm font-medium text-muted-foreground block mb-2">사용 제품</label>
          {products.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {products.map((p, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 text-xs bg-muted text-foreground px-2 py-1 rounded-full"
                >
                  {p.brand} {p.code} {p.area && `(${p.area})`}
                  <button onClick={() => removeProduct(i)} className="ml-1 text-subtle hover:text-foreground">
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={productBrand}
              onChange={(e) => setProductBrand(e.target.value)}
              placeholder="브랜드 (예: 로레알)"
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
            />
            <input
              type="text"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="코드 (예: 7.1)"
              className="w-24 px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
            />
            <button
              onClick={addProduct}
              className="px-3 py-2 bg-muted rounded-lg text-sm font-medium text-muted-foreground"
            >
              +
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="bg-surface rounded-2xl p-4 border border-border space-y-3">
          <label className="text-sm font-medium text-muted-foreground block">상세 정보</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">시술 부위</label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="예: 뿌리, 전체"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">소요 시간 (분)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">가격 (원)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="50000"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">만족도</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSatisfaction(satisfaction === String(n) ? "" : String(n))}
                  className={`text-xl transition-colors ${
                    Number(satisfaction) >= n ? "text-yellow-400" : "text-border"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">메모</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="시술 관련 메모..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">다음 방문 추천</label>
            <input
              type="text"
              value={nextVisit}
              onChange={(e) => setNextVisit(e.target.value)}
              placeholder="예: 4주 후 리터치 권장"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving || !selectedCategory}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          {saving ? "저장 중..." : "수정 완료"}
        </button>
      </div>
    </div>
  );
}
