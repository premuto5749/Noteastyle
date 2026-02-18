"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ServiceButton } from "@/components/ServiceButton";
import {
  getCustomers,
  createCustomer,
  createReservation,
  type Customer,
} from "@/lib/api";

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

const SERVICE_TYPES = [
  { label: "커트", icon: "✂️" },
  { label: "염색", icon: "🎨" },
  { label: "펌", icon: "🌀" },
  { label: "클리닉", icon: "💆" },
  { label: "네일", icon: "💅" },
  { label: "기타", icon: "✨" },
];

const TIME_OPTIONS: string[] = [];
for (let h = 9; h <= 21; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }
}

export default function ReservationPage() {
  const router = useRouter();

  // Form state
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
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
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Phone search with debounce
  const searchByPhone = useCallback(async (phoneVal: string) => {
    const digits = phoneVal.replace(/\D/g, "");
    if (digits.length < 4) {
      setSearchResults([]);
      setMatchedCustomer(null);
      setIsNewCustomer(false);
      setShowResults(false);
      return;
    }

    try {
      const results = await getCustomers(undefined, digits);
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
    } catch {
      setSearchResults([]);
      setMatchedCustomer(null);
      setIsNewCustomer(true);
      setShowResults(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchByPhone(phone);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [phone, searchByPhone]);

  const selectCustomer = (customer: Customer) => {
    setMatchedCustomer(customer);
    setCustomerName(customer.name);
    setPhone(customer.phone ?? "");
    setIsNewCustomer(false);
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
        const newCustomer = await createCustomer({
          name: customerName.trim(),
          phone: phone.trim(),
        });
        customerId = newCustomer.id;
      }

      // Create reservation
      await createReservation({
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
        {/* Phone number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            전화번호 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            autoFocus
          />

          {/* Search results dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="mt-1 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
              {searchResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0"
                >
                  <span className="font-medium text-gray-900">{c.name}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {c.phone}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    방문 {c.visit_count}회
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Matched customer badge */}
          {matchedCustomer && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
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
              <span className="text-sm text-green-700 font-medium">
                {matchedCustomer.name}님 (방문 {matchedCustomer.visit_count}회)
              </span>
              <button
                onClick={() => {
                  setMatchedCustomer(null);
                  setCustomerName("");
                  setIsNewCustomer(true);
                }}
                className="ml-auto text-xs text-green-600"
              >
                변경
              </button>
            </div>
          )}

          {/* New customer indicator */}
          {isNewCustomer && !matchedCustomer && phone.replace(/\D/g, "").length >= 4 && (
            <div className="mt-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm text-blue-700">
                신규 고객 — 이름을 입력해주세요
              </span>
            </div>
          )}
        </div>

        {/* Customer name (for new customers) */}
        {!matchedCustomer && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              고객 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="홍길동"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            날짜
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            시간
          </label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
              >
                {d}분
              </button>
            ))}
          </div>
        </div>

        {/* Service type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            시술 종류 <span className="text-xs text-gray-400">(선택)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SERVICE_TYPES.map((s) => (
              <ServiceButton
                key={s.label}
                label={s.label}
                icon={s.icon}
                selected={serviceType === s.label}
                onClick={() =>
                  setServiceType((prev) =>
                    prev === s.label ? null : s.label
                  )
                }
              />
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            메모 <span className="text-xs text-gray-400">(선택)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="요청사항, 특이사항 등"
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-base active:scale-95 transition-transform disabled:opacity-50"
        >
          {submitting ? "등록 중..." : "예약 등록"}
        </button>
      </div>
    </div>
  );
}
