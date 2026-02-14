"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ServiceButton } from "@/components/ServiceButton";
import { ProductButton } from "@/components/ProductButton";
import { VoiceMemo } from "@/components/VoiceMemo";
import {
  createTreatment,
  createCustomer,
  transcribeVoiceMemo,
  type ProductUsed,
} from "@/lib/api";

const SERVICES = [
  { type: "cut", label: "\uCEE4\uD2B8", icon: "\u2702\uFE0F" },
  { type: "color", label: "\uC5FC\uC0C9", icon: "\uD83C\uDFA8" },
  { type: "perm", label: "\uD3B8", icon: "\uD83D\uDCAB" },
  { type: "treatment", label: "\uD2B8\uB9AC\uD2B8\uBA3C\uD2B8", icon: "\u2728" },
  { type: "bleach", label: "\uBE14\uB9AC\uCE58", icon: "\u26A1" },
  { type: "scalp", label: "\uB450\uD53C\uAD00\uB9AC", icon: "\uD83C\uDF3F" },
];

const POPULAR_PRODUCTS = [
  { brand: "\uB85C\uB808\uC54C", code: "7.1", color: "#8B6914" },
  { brand: "\uB85C\uB808\uC54C", code: "6.0", color: "#5C3317" },
  { brand: "\uC6F0\uB77C", code: "8.0", color: "#A0522D" },
  { brand: "\uC6F0\uB77C", code: "9.3", color: "#DAA520" },
  { brand: "\uACE8\uB4DC\uC6F0", code: "5NN", color: "#3B2F2F" },
  { brand: "\uC288\uC6CC\uCE20\uCF54\uD504", code: "4-0", color: "#2F1B14" },
];

export default function QuickRecordPage() {
  const [step, setStep] = useState<"customer" | "service" | "product" | "done">("customer");
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<ProductUsed[]>([]);
  const [saving, setSaving] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [naverBookingId, setNaverBookingId] = useState("");

  const handleCustomerSubmit = useCallback(async () => {
    if (!customerName.trim()) return;
    try {
      const customer = await createCustomer({
        name: customerName.trim(),
        naver_booking_id: naverBookingId.trim() || undefined,
      });
      setCustomerId(customer.id);
      setStep("service");
    } catch {
      alert("고객 등록에 실패했습니다. 네트워크 연결을 확인해주세요.");
    }
  }, [customerName, naverBookingId]);

  const handleServiceSelect = (type: string) => {
    setSelectedService(type);
    if (type === "color" || type === "bleach" || type === "perm") {
      setStep("product");
    } else {
      handleSave(type, []);
    }
  };

  const toggleProduct = (product: { brand: string; code: string }) => {
    setSelectedProducts((prev) => {
      const exists = prev.find((p) => p.brand === product.brand && p.code === product.code);
      if (exists) return prev.filter((p) => !(p.brand === product.brand && p.code === product.code));
      return [...prev, { brand: product.brand, code: product.code }];
    });
  };

  const handleSave = async (serviceType?: string, products?: ProductUsed[]) => {
    setSaving(true);
    try {
      const result = await createTreatment({
        customer_id: customerId!,
        service_type: serviceType || selectedService!,
        products_used: products || selectedProducts,
      });
      setSavedId(result.id);
      setStep("done");
    } catch {
      alert("시술 기록 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleVoiceMemo = async (blob: Blob) => {
    setVoiceProcessing(true);
    try {
      const result = await transcribeVoiceMemo(blob);
      if (result.service_type) setSelectedService(result.service_type);
      if (result.products_used) setSelectedProducts(result.products_used);
      if (result.customer_name) setCustomerName(result.customer_name);
      if (result.service_type && customerId) {
        await handleSave(result.service_type, result.products_used || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "음성 인식에 실패했습니다.";
      alert(message + " 다시 시도해주세요.");
      console.error("[VoiceMemo] 에러:", err);
    } finally {
      setVoiceProcessing(false);
    }
  };

  const reset = () => {
    setStep("customer");
    setCustomerName("");
    setCustomerId(null);
    setSelectedService(null);
    setSelectedProducts([]);
    setSavedId(null);
    setNaverBookingId("");
  };

  return (
    <div>
      <PageHeader title="\uBE60\uB978 \uAE30\uB85D" subtitle="\uD0ED \uD55C \uBC88\uC73C\uB85C \uC2DC\uC220 \uAE30\uB85D" />

      <div className="p-4">
        {step === "customer" && (
          <div className="space-y-6">
            <div className="bg-[#111111] rounded-2xl p-6 border border-[#262626]">
              <label className="text-sm font-medium text-[#a1a1a1] block mb-2">
                고객 이름
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomerSubmit()}
                  placeholder="이름을 입력하세요"
                  className="flex-1 px-4 py-3 border border-[#333333] rounded-xl text-base bg-[#111111] text-[#ededed] placeholder:text-[#555555] focus:outline-none focus:border-white focus:ring-2 focus:ring-[#333333]"
                  autoFocus
                />
                <button
                  onClick={handleCustomerSubmit}
                  disabled={!customerName.trim()}
                  className="px-6 py-3 bg-white text-black rounded-xl font-medium disabled:opacity-40 active:scale-95 transition-transform"
                >
                  다음
                </button>
              </div>
              <div className="mt-3">
                <label className="text-xs text-[#666666] block mb-1">
                  네이버 예약번호 (선택)
                </label>
                <input
                  type="text"
                  value={naverBookingId}
                  onChange={(e) => setNaverBookingId(e.target.value)}
                  placeholder="예약번호 입력"
                  className="w-full px-4 py-2 border border-[#333333] rounded-xl text-sm bg-[#111111] text-[#ededed] placeholder:text-[#555555] focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-[#555555] mb-3">또는 음성으로 한번에 기록</p>
              <VoiceMemo onResult={handleVoiceMemo} disabled={voiceProcessing} />
              {voiceProcessing && (
                <p className="text-sm text-[var(--primary)] mt-2 animate-pulse">
                  AI가 음성을 분석하고 있어요...
                </p>
              )}
            </div>
          </div>
        )}

        {step === "service" && (
          <div className="space-y-4">
            <div className="bg-[#111111] rounded-2xl p-4 border border-[#262626]">
              <div className="text-sm text-[#666666] mb-1">고객</div>
              <div className="font-bold text-lg">{customerName}</div>
            </div>
            <div className="bg-[#111111] rounded-2xl p-4 border border-[#262626]">
              <div className="text-sm font-medium text-[#a1a1a1] mb-3">
                시술 종류를 선택하세요
              </div>
              <div className="grid grid-cols-3 gap-3">
                {SERVICES.map((s) => (
                  <ServiceButton
                    key={s.type}
                    label={s.label}
                    icon={s.icon}
                    selected={selectedService === s.type}
                    onClick={() => handleServiceSelect(s.type)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "product" && (
          <div className="space-y-4">
            <div className="bg-[#111111] rounded-2xl p-4 border border-[#262626]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-[#666666]">{customerName}</div>
                  <div className="font-bold">
                    {SERVICES.find((s) => s.type === selectedService)?.label}
                  </div>
                </div>
                <button onClick={() => setStep("service")} className="text-sm text-[#a1a1a1]">
                  변경
                </button>
              </div>
            </div>
            <div className="bg-[#111111] rounded-2xl p-4 border border-[#262626]">
              <div className="text-sm font-medium text-[#a1a1a1] mb-3">
                사용한 제품 (여러 개 선택 가능)
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_PRODUCTS.map((p) => (
                  <ProductButton
                    key={`${p.brand}-${p.code}`}
                    brand={p.brand}
                    code={p.code}
                    color={p.color}
                    selected={selectedProducts.some(
                      (sp) => sp.brand === p.brand && sp.code === p.code
                    )}
                    onClick={() => toggleProduct(p)}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="w-full py-4 bg-white text-black rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {saving ? "저장 중..." : "기록 완료"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-[#0a2a0a] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#ededed] mb-1">기록 완료!</h2>
            <p className="text-[#666666] text-sm mb-6">
              {customerName}님의 시술이 기록되었습니다
            </p>
            <div className="flex flex-col gap-3 items-center">
              {savedId && (
                <Link
                  href={`/treatments/${savedId}/capture`}
                  className="w-full max-w-xs py-3 bg-white text-black rounded-xl font-bold text-center active:scale-95 transition-transform"
                >
                  사진/영상 촬영
                </Link>
              )}
              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="px-6 py-3 border border-[#333333] rounded-xl font-medium text-[#a1a1a1] active:scale-95 transition-transform"
                >
                  다음 고객 기록
                </button>
                <Link
                  href="/treatments"
                  className="px-6 py-3 border border-[#333333] rounded-xl font-medium text-[#a1a1a1] active:scale-95 transition-transform"
                >
                  시술 목록
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
