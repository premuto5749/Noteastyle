"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createShop } from "@/lib/api";
import { useShop } from "@/contexts/ShopContext";

type Step = "choose" | "create-shop" | "invite";

const SHOP_TYPES = [
  { value: "hair", label: "헤어샵", icon: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2c-1.5 2-2 4-2 6 0 2.5 2 4 4 4s4-1.5 4-4c0-2-0.5-4-2-6" />
      <path d="M4 22c0-4 2-7 5-8" />
      <path d="M20 22c0-4-2-7-5-8" />
      <line x1="12" y1="12" x2="12" y2="22" />
    </svg>
  )},
  { value: "nail", label: "네일샵", icon: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l-1 10H7L6 3z" />
      <path d="M7 13c0 4 2 8 5 8s5-4 5-8" />
    </svg>
  )},
  { value: "skin", label: "피부관리", icon: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3c-2 4-2 8 0 12" />
      <path d="M8 6c2 3 6 3 8 0" />
      <path d="M8 18c2-3 6-3 8 0" />
    </svg>
  )},
  { value: "scalp", label: "두피관리", icon: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8 2 4 5 4 10c0 3 2 5 4 6v6h8v-6c2-1 4-3 4-6 0-5-4-8-8-8z" />
      <line x1="9" y1="22" x2="15" y2="22" />
    </svg>
  )},
];

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshShops } = useShop();

  const [step, setStep] = useState<Step>("choose");
  const [shopName, setShopName] = useState("");
  const [shopType, setShopType] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!shopName.trim()) {
      setError("매장 이름을 입력해주세요.");
      return;
    }
    if (!shopType) {
      setError("업종을 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createShop({
        name: shopName.trim(),
        shop_type: shopType,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        display_name: displayName.trim() || undefined,
      });
      await refreshShops();
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "매장 생성에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = inviteToken.trim();
    if (!token) return;

    // Support both full URL and token-only input
    const tokenMatch = token.match(/\/invite\/([a-zA-Z0-9_-]+)/);
    const finalToken = tokenMatch ? tokenMatch[1] : token;
    router.push(`/invite/${finalToken}`);
  };

  return (
    <div className="min-h-screen bg-card flex flex-col px-6 py-12">
      {/* Logo */}
      <div className="text-center mt-8 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          note-a-style
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          시술 기록의 신
        </p>
      </div>

      {/* ===== Step: Choose path ===== */}
      {step === "choose" && (
        <div className="flex-1 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground">
              시작하기
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              매장을 새로 등록하거나, 초대받은 매장에 참여하세요.
            </p>
          </div>

          <div className="space-y-3">
            {/* Create new shop */}
            <button
              onClick={() => setStep("create-shop")}
              className="w-full p-4 bg-surface border border-border rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
            >
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center flex-shrink-0">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-foreground">새 매장 만들기</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  매장을 등록하고 관리를 시작하세요
                </p>
              </div>
              <svg
                className="ml-auto text-subtle flex-shrink-0"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Join via invite */}
            <button
              onClick={() => setStep("invite")}
              className="w-full p-4 bg-surface border border-border rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
            >
              <div className="w-12 h-12 bg-accent text-accent-foreground rounded-xl flex items-center justify-center flex-shrink-0">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-foreground">초대 링크가 있어요</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  매장 초대를 받으셨나요?
                </p>
              </div>
              <svg
                className="ml-auto text-subtle flex-shrink-0"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ===== Step: Create shop form ===== */}
      {step === "create-shop" && (
        <div className="flex-1 flex flex-col">
          {/* Back button + title */}
          <div className="mb-6">
            <button
              onClick={() => { setStep("choose"); setError(""); }}
              className="flex items-center gap-1 text-sm text-muted-foreground mb-4"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              뒤로
            </button>
            <h2 className="text-xl font-bold text-foreground">새 매장 등록</h2>
            <p className="text-sm text-muted-foreground mt-1">
              매장 정보를 입력해주세요.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateShop} className="space-y-5 flex-1 flex flex-col">
            {/* Shop name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                매장 이름 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="예: 헤어라운지 강남점"
                required
                className="w-full px-4 py-3.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
              />
            </div>

            {/* Shop type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                업종 <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SHOP_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setShopType(type.value)}
                    className={`p-3 rounded-xl border text-sm font-medium flex flex-col items-center gap-2 transition-all active:scale-95 ${
                      shopType === type.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-foreground hover:border-subtle"
                    }`}
                  >
                    <span className={shopType === type.value ? "text-primary-foreground" : "text-muted-foreground"}>
                      {type.icon}
                    </span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                주소 <span className="text-muted-foreground text-xs">(선택)</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="예: 서울 강남구 역삼동 123-45"
                className="w-full px-4 py-3.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                전화번호 <span className="text-muted-foreground text-xs">(선택)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="예: 02-1234-5678"
                className="w-full px-4 py-3.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
              />
            </div>

            {/* Display name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                표시 이름 <span className="text-muted-foreground text-xs">(선택)</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="매장에서 사용할 이름 (미입력시 계정 이름 사용)"
                className="w-full px-4 py-3.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 mt-auto">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-full font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
              >
                {isSubmitting ? "등록 중..." : "매장 등록하기"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== Step: Invite link ===== */}
      {step === "invite" && (
        <div className="flex-1 flex flex-col">
          {/* Back button + title */}
          <div className="mb-6">
            <button
              onClick={() => { setStep("choose"); setError(""); }}
              className="flex items-center gap-1 text-sm text-muted-foreground mb-4"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              뒤로
            </button>
            <h2 className="text-xl font-bold text-foreground">초대 링크 입력</h2>
            <p className="text-sm text-muted-foreground mt-1">
              매장 관리자에게 받은 초대 링크나 코드를 입력해주세요.
            </p>
          </div>

          <form onSubmit={handleInviteSubmit} className="space-y-5 flex-1 flex flex-col">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                초대 링크 또는 코드
              </label>
              <input
                type="text"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                placeholder="링크 또는 초대 코드를 붙여넣기"
                required
                className="w-full px-4 py-3.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
              />
              <p className="text-xs text-muted-foreground mt-2">
                예: https://noteastyle.com/invite/abc123 또는 abc123
              </p>
            </div>

            <div className="pt-2 mt-auto">
              <button
                type="submit"
                disabled={!inviteToken.trim()}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-full font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
              >
                참여하기
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
