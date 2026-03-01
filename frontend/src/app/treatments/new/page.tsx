"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ServiceSelector } from "@/components/ServiceSelector";
import { VoiceMemo } from "@/components/VoiceMemo";
import { transcribeVoiceMemo, type ProductUsed, type ShopService } from "@/lib/api";
import { useShopApi } from "@/hooks/useShopApi";
import { useServiceMenu } from "@/hooks/useServiceMenu";

export default function NewTreatmentPage() {
  const router = useRouter();
  const { api } = useShopApi();
  const { categories } = useServiceMenu();
  const [customerName, setCustomerName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedServiceName, setSelectedServiceName] = useState<string | null>(null);
  const [productBrand, setProductBrand] = useState("");
  const [productCode, setProductCode] = useState("");
  const [products, setProducts] = useState<ProductUsed[]>([]);
  const [area, setArea] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [naverBookingId, setNaverBookingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);

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
    // Auto-fill duration and price from service definition
    if (service?.estimated_duration_minutes && !duration) {
      setDuration(String(service.estimated_duration_minutes));
    }
    if (service?.price != null && !price) {
      setPrice(String(service.price));
    }
  };

  const handleVoiceMemo = async (blob: Blob) => {
    setVoiceProcessing(true);
    try {
      const result = await transcribeVoiceMemo(blob);
      if (result.customer_name) setCustomerName(result.customer_name);
      if (result.service_type) setSelectedCategory(result.service_type);
      if (result.products_used) setProducts(result.products_used);
      if (result.area) setArea(result.area);
      if (result.duration_minutes) setDuration(String(result.duration_minutes));
      if (result.summary) setNotes(result.summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : "음성 인식에 실패했습니다.";
      alert(message + " 다시 시도해주세요.");
    } finally {
      setVoiceProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!customerName.trim() || !selectedCategory) return;
    setSaving(true);
    try {
      const customer = await api.createCustomer({
        name: customerName.trim(),
        naver_booking_id: naverBookingId.trim() || undefined,
      });
      const result = await api.createTreatment({
        customer_id: customer.id,
        service_type: selectedCategory,
        service_detail: selectedServiceName || undefined,
        products_used: products.length > 0 ? products : undefined,
        area: area || undefined,
        duration_minutes: duration ? parseInt(duration) : undefined,
        price: price ? parseInt(price) : undefined,
        customer_notes: notes || undefined,
      });
      router.push(`/treatments/${result.id}`);
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="상세 기록" subtitle="시술 정보를 꼼꼼하게 기록합니다" />

      <div className="p-4 space-y-4">
        {/* Voice shortcut */}
        <div className="bg-muted rounded-2xl p-4 border border-border">
          <p className="text-sm text-foreground font-medium mb-3 text-center">
            음성으로 자동 입력
          </p>
          <VoiceMemo onResult={handleVoiceMemo} disabled={voiceProcessing} />
          {voiceProcessing && (
            <p className="text-sm text-foreground mt-2 animate-pulse text-center">
              AI가 분석 중...
            </p>
          )}
        </div>

        {/* Customer */}
        <div className="bg-surface rounded-2xl p-4 border border-border space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">고객 이름 *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="이름"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-muted/50 text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">네이버 예약번호 (선택)</label>
            <input
              type="text"
              value={naverBookingId}
              onChange={(e) => setNaverBookingId(e.target.value)}
              placeholder="예약번호 입력"
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-muted/50 text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

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
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-muted/50 text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <input
              type="text"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="코드 (예: 7.1)"
              className="w-24 px-3 py-2 border border-border rounded-lg text-sm bg-muted/50 text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
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
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted/50 text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">소요 시간 (분)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted/50 text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
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
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted/50 text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">메모</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="시술 관련 메모..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted/50 text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving || !customerName.trim() || !selectedCategory}
          className="w-full py-4 bg-accent text-white rounded-2xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          {saving ? "저장 중..." : "기록 저장"}
        </button>
      </div>
    </div>
  );
}
