"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ServiceSelector } from "@/components/ServiceSelector";
import { useShopApi } from "@/hooks/useShopApi";
import { useServiceMenu } from "@/hooks/useServiceMenu";
import { type Customer, type ShopService } from "@/lib/api";

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function currentTimeRounded(): string {
  const now = new Date();
  const minutes = Math.ceil(now.getMinutes() / 30) * 30;
  now.setMinutes(minutes, 0, 0);
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

const TIME_OPTIONS: string[] = [];
for (let h = 9; h <= 21; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }
}

export default function ReservationPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-subtle">불러오는 중...</div>}>
      <ReservationForm />
    </Suspense>
  );
}

function ReservationForm() {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const { api } = useShopApi();
  const { categories } = useServiceMenu();

  // Query param prefill
  const prefillCustomerId = searchParamsHook.get("customerId");
  const prefillName = searchParamsHook.get("name");
  const prefillPhone = searchParamsHook.get("phone");

  // Form state
  const [phone, setPhone] = useState(prefillPhone || "");
  const [customerName, setCustomerName] = useState(prefillName || "");
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showResults, setShowResults] = useState(false);

  const [date, setDate] = useState(() => formatDate(new Date()));
  const [time, setTime] = useState(() => currentTimeRounded());
  const [serviceType, setServiceType] = useState<string | null>(null);
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchAbortRef = useRef<AbortController | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load prefilled customer from query params
  useEffect(() => {
    if (!prefillCustomerId || !prefillName) return;
    setMatchedCustomer({
      id: prefillCustomerId,
      shop_id: "",
      name: prefillName,
      phone: prefillPhone,
      gender: null,
      birth_date: null,
      notes: null,
      visit_count: 0,
      last_visit: null,
      created_at: "",
    });
  }, [prefillCustomerId, prefillName, prefillPhone]);

  // Unified search function
  const searchCustomers = useCallback(async (field: "phone" | "name", value: string) => {
    // Cancel any in-flight search request
    searchAbortRef.current?.abort();

    if (field === "phone") {
      const digits = value.replace(/\D/g, "");
      if (digits.length < 4) {
        setSearchResults([]);
        setMatchedCustomer(null);
        setIsNewCustomer(false);
        setShowResults(false);
        setSearchLoading(false);
        return;
      }

      const abortController = new AbortController();
      searchAbortRef.current = abortController;
      setSearchLoading(true);

      try {
        const results = await api.getCustomers(undefined, digits, { limit: 10, signal: abortController.signal });
        setSearchResults(results);
        setShowResults(true);

        if (results.length === 1 && results[0].phone?.replace(/\D/g, "") === digits) {
          setMatchedCustomer(results[0]);
          setCustomerName(results[0].name);
          setIsNewCustomer(false);
          setShowResults(false);
        } else if (results.length === 0) {
          setMatchedCustomer(null);
          setIsNewCustomer(true);
          setShowResults(false);
        } else {
          setMatchedCustomer(null);
          setIsNewCustomer(false);
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes("abort")) return;
        setSearchResults([]);
        setMatchedCustomer(null);
        setIsNewCustomer(true);
        setShowResults(false);
      } finally {
        setSearchLoading(false);
      }
    } else {
      // Name search: 2+ characters
      if (value.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        setSearchLoading(false);
        return;
      }

      const abortController = new AbortController();
      searchAbortRef.current = abortController;
      setSearchLoading(true);

      try {
        const results = await api.getCustomers(value.trim(), undefined, { limit: 10, signal: abortController.signal });
        setSearchResults(results);
        setShowResults(results.length > 0);
        if (results.length === 0) {
          setIsNewCustomer(true);
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes("abort")) return;
        setSearchResults([]);
        setShowResults(false);
      } finally {
        setSearchLoading(false);
      }
    }
  }, [api]);

  // Phone debounce
  useEffect(() => {
    if (matchedCustomer) return;
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    phoneDebounceRef.current = setTimeout(() => {
      searchCustomers("phone", phone);
    }, 300);
    return () => {
      if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    };
  }, [phone, matchedCustomer, searchCustomers]);

  // Name debounce
  useEffect(() => {
    if (matchedCustomer) return;
    // Only search by name if phone hasn't produced results
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length >= 4) return; // Phone search is active, skip name search

    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    nameDebounceRef.current = setTimeout(() => {
      searchCustomers("name", customerName);
    }, 300);
    return () => {
      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    };
  }, [customerName, phone, matchedCustomer, searchCustomers]);

  // Click-outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    if (showResults) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showResults]);

  const selectCustomer = (customer: Customer) => {
    setMatchedCustomer(customer);
    setCustomerName(customer.name);
    setPhone(customer.phone ?? "");
    setIsNewCustomer(false);
    setShowResults(false);
  };

  const clearCustomer = () => {
    setMatchedCustomer(null);
    setCustomerName("");
    setPhone("");
    setIsNewCustomer(false);
    setSearchResults([]);
    setShowResults(false);
  };

  const handleSubmit = async () => {
    if (!phone.trim()) {
      alert("전화번호를 입력하세요.");
      return;
    }
    if (!matchedCustomer && !customerName.trim()) {
      alert("고객 이름을 입력하세요.");
      return;
    }

    setSubmitting(true);
    try {
      let customerId = matchedCustomer?.id;

      // Create new customer if needed
      if (!customerId) {
        const newCustomer = await api.createCustomer({
          name: customerName.trim(),
          phone: phone.trim(),
        });
        customerId = newCustomer.id;
      }

      // Create reservation
      await api.createReservation({
        customer_id: customerId,
        scheduled_date: date,
        scheduled_time: time,
        estimated_duration_minutes: duration,
        service_type: serviceType ?? undefined,
        notes: notes.trim() || undefined,
      });

      router.push("/");
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "예약 등록에 실패했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="예약 등록" />

      <div className="p-4 space-y-5">
        {/* Customer search section */}
        <div ref={dropdownRef}>
          {/* Phone & Name side by side */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                전화번호 <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  if (matchedCustomer) clearCustomer();
                  setPhone(e.target.value);
                }}
                placeholder="010-0000-0000"
                readOnly={!!matchedCustomer}
                className={`w-full px-3 py-2.5 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-accent/20 ${matchedCustomer ? "bg-muted text-muted-foreground" : "bg-surface"}`}
                autoFocus
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                고객 이름 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  if (matchedCustomer) clearCustomer();
                  setCustomerName(e.target.value);
                }}
                placeholder="홍길동"
                readOnly={!!matchedCustomer}
                className={`w-full px-3 py-2.5 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-accent/20 ${matchedCustomer ? "bg-muted text-muted-foreground" : "bg-surface"}`}
              />
            </div>
          </div>

          {/* Search loading indicator */}
          {searchLoading && (
            <div className="mt-1 px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              검색 중...
            </div>
          )}

          {/* Search results dropdown (shared below both fields) */}
          {!searchLoading && showResults && searchResults.length > 0 && (
            <div className="mt-1 border border-border rounded-xl bg-card shadow-sm overflow-hidden">
              {searchResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  className="w-full text-left px-4 py-3 hover:bg-surface active:bg-muted border-b border-border last:border-b-0"
                >
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {c.phone}
                  </span>
                  <span className="text-xs text-subtle ml-2">
                    방문 {c.visit_count}회
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Matched customer badge */}
          {matchedCustomer && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-success-bg rounded-lg border border-green-200">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm text-success-foreground font-medium">
                {matchedCustomer.name}님 (방문 {matchedCustomer.visit_count}회)
              </span>
              <button
                onClick={clearCustomer}
                className="ml-auto text-xs text-success-foreground"
              >
                변경
              </button>
            </div>
          )}

          {/* New customer indicator */}
          {isNewCustomer && !matchedCustomer && (phone.replace(/\D/g, "").length >= 4 || customerName.trim().length >= 2) && (
            <div className="mt-2 px-3 py-2 bg-info-bg rounded-lg border border-blue-200">
              <span className="text-sm text-blue-700">
                신규 고객 — 전화번호와 이름을 입력해주세요
              </span>
            </div>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            날짜
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-xl text-base bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            시간
          </label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-accent/20 bg-surface"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            예상 소요시간
          </label>
          <div className="flex gap-2">
            {[30, 60, 90, 120].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  duration === d
                    ? "bg-accent text-white border-accent"
                    : "bg-card text-muted-foreground border-border"
                }`}
              >
                {d}분
              </button>
            ))}
          </div>
        </div>

        {/* Service type */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            시술 종류 <span className="text-xs text-subtle">(선택)</span>
          </label>
          <ServiceSelector
            categories={categories}
            onSelect={(categoryName: string, service?: ShopService) => {
              setServiceType(categoryName);
              if (service?.estimated_duration_minutes) {
                setDuration(service.estimated_duration_minutes);
              }
            }}
            selectedCategory={serviceType ?? undefined}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            메모 <span className="text-xs text-subtle">(선택)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="요청사항, 특이사항 등"
            rows={2}
            className="w-full px-3 py-2.5 border border-border rounded-xl text-base bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 bg-accent text-white rounded-2xl font-bold text-base active:scale-95 transition-transform disabled:opacity-50"
        >
          {submitting ? "등록 중..." : "예약 등록"}
        </button>
      </div>
    </div>
  );
}
