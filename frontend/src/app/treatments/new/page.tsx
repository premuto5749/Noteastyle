"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ServiceButton } from "@/components/ServiceButton";
import { VoiceMemo } from "@/components/VoiceMemo";
import {
  createTreatment,
  createCustomer,
  transcribeVoiceMemo,
  type ProductUsed,
} from "@/lib/api";

const SERVICES = [
  { type: "cut", label: "커트", icon: "\u2702\uFE0F" },
  { type: "color", label: "염색", icon: "\uD83C\uDFA8" },
  { type: "perm", label: "펌", icon: "\uD83D\uDCAB" },
  { type: "treatment", label: "트리트먼트", icon: "\u2728" },
  { type: "bleach", label: "블리치", icon: "\u26A1" },
  { type: "scalp", label: "두피관리", icon: "\uD83C\uDF3F" },
];

export default function NewTreatmentPage() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [selectedService, setSelectedService] = useState<string | null>(null);
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

  const handleVoiceMemo = async (blob: Blob) => {
    setVoiceProcessing(true);
    try {
      const result = await transcribeVoiceMemo(blob);
      if (result.customer_name) setCustomerName(result.customer_name);
      if (result.service_type) setSelectedService(result.service_type);
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
    if (!customerName.trim() || !selectedService) return;
    setSaving(true);
    try {
      const customer = await createCustomer({
        name: customerName.trim(),
        naver_booking_id: naverBookingId.trim() || undefined,
      });
      const result = await createTreatment({
        customer_id: customer.id,
        service_type: selectedService,
        products_used: products.length > 0 ? products : undefined,
        area: area || undefined,
        duration_minutes: duration ? parseInt(duration) : undefined,
        price: price ? parseInt(price) : undefined,
        customer_notes: notes || undefined,
      });
      router.push(`/treatments/${result.id}/capture`);
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
        <div className="bg-gray-100 rounded-2xl p-4 border border-gray-200">
          <p className="text-sm text-gray-900 font-medium mb-3 text-center">
            음성으로 자동 입력
          </p>
          <VoiceMemo onResult={handleVoiceMemo} disabled={voiceProcessing} />
          {voiceProcessing && (
            <p className="text-sm text-gray-900 mt-2 animate-pulse text-center">
              AI가 분석 중...
            </p>
          )}
        </div>

        {/* Customer */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-500 block mb-2">고객 이름 *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="이름"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">네이버 예약번호 (선택)</label>
            <input
              type="text"
              value={naverBookingId}
              onChange={(e) => setNaverBookingId(e.target.value)}
              placeholder="예약번호 입력"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
            />
          </div>
        </div>

        {/* Service */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <label className="text-sm font-medium text-gray-500 block mb-3">시술 종류 *</label>
          <div className="grid grid-cols-3 gap-2">
            {SERVICES.map((s) => (
              <ServiceButton
                key={s.type}
                label={s.label}
                icon={s.icon}
                selected={selectedService === s.type}
                onClick={() => setSelectedService(s.type)}
              />
            ))}
          </div>
        </div>

        {/* Products */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <label className="text-sm font-medium text-gray-500 block mb-2">사용 제품</label>
          {products.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {products.map((p, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                >
                  {p.brand} {p.code} {p.area && `(${p.area})`}
                  <button onClick={() => removeProduct(i)} className="ml-1 text-gray-400 hover:text-gray-700">
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
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
            />
            <input
              type="text"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="코드 (예: 7.1)"
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
            />
            <button
              onClick={addProduct}
              className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-500"
            >
              +
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
          <label className="text-sm font-medium text-gray-500 block">상세 정보</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">시술 부위</label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="예: 뿌리, 전체"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">소요 시간 (분)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">가격 (원)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="50000"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">메모</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="시술 관련 메모..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving || !customerName.trim() || !selectedService}
          className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          {saving ? "저장 중..." : "기록 저장"}
        </button>
      </div>
    </div>
  );
}
