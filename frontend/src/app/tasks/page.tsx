"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getTreatments, type Treatment, type TreatmentPhoto } from "@/lib/api";

const SERVICE_LABELS: Record<string, string> = {
  cut: "커트",
  color: "염색",
  perm: "펌",
  treatment: "트리트먼트",
  bleach: "블리치",
  scalp: "두피관리",
};

function getRepresentativePhoto(photos: TreatmentPhoto[]): TreatmentPhoto | null {
  const nonSource = photos.filter((p) => p.photo_type !== "source");
  const after = nonSource.find((p) => p.photo_type === "after");
  if (after) return after;
  const during = nonSource.find((p) => p.photo_type === "during");
  if (during) return during;
  const before = nonSource.find((p) => p.photo_type === "before");
  if (before) return before;
  return nonSource[0] ?? null;
}

function formatDateKR(date: Date): string {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function TasksPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);

  const dateString = toDateString(currentDate);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTreatments(undefined, dateString);
      setTreatments(data);
    } catch {
      setTreatments([]);
    } finally {
      setLoading(false);
    }
  }, [dateString]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function shiftDate(days: number) {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  }

  function handleDatePick(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val) {
      const [y, m, d] = val.split("-").map(Number);
      setCurrentDate(new Date(y, m - 1, d));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Date Navigation */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <button
            onClick={() => shiftDate(-1)}
            className="p-2 text-gray-400 active:text-gray-900"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <label className="relative cursor-pointer">
            <span className="text-sm font-semibold text-gray-900">
              {formatDateKR(currentDate)}
            </span>
            <input
              type="date"
              value={dateString}
              onChange={handleDatePick}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>

          <button
            onClick={() => shiftDate(1)}
            className="p-2 text-gray-400 active:text-gray-900"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[480px] mx-auto px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-400 text-sm">불러오는 중...</p>
          </div>
        ) : treatments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-3">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p className="text-gray-400 text-sm">오늘 완료된 시술이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {treatments.map((t) => {
              const photo = getRepresentativePhoto(t.photos || []);
              const customerName = t.customer?.name;
              const serviceLabel = SERVICE_LABELS[t.service_type] || t.service_type;

              return (
                <button
                  key={t.id}
                  onClick={() => router.push(`/treatments/${t.id}`)}
                  className="w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 text-left active:scale-[0.98] transition-transform"
                >
                  {/* Photo */}
                  {photo && (
                    <div className="relative aspect-[4/3] bg-gray-100">
                      <Image
                        src={photo.photo_url}
                        alt={serviceLabel}
                        fill
                        className="object-cover"
                        sizes="(max-width: 480px) 100vw, 480px"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-3">
                    <div className="text-xs text-gray-400">
                      {new Date(t.created_at).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    {customerName && (
                      <div className="text-sm font-medium text-gray-900 mt-0.5">
                        {customerName} 고객님
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-0.5">
                      {serviceLabel}
                      {t.service_detail && ` · ${t.service_detail}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
