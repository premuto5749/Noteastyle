"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getTreatments, type Treatment } from "@/lib/api";

const SERVICE_LABELS: Record<string, string> = {
  cut: "커트",
  color: "염색",
  perm: "펌",
  treatment: "트리트먼트",
  bleach: "블리치",
  scalp: "두피관리",
};

type SortOrder = "newest" | "oldest";

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getTreatments();
        setTreatments(data);
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleFilter = (serviceType: string) => {
    setActiveFilters((prev) =>
      prev.includes(serviceType)
        ? prev.filter((f) => f !== serviceType)
        : [...prev, serviceType]
    );
  };

  const filtered = useMemo(() => {
    let result = treatments;

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) => {
        const serviceLabel = SERVICE_LABELS[t.service_type] || t.service_type;
        const customerName = t.customer?.name || "";
        return (
          serviceLabel.toLowerCase().includes(q) ||
          t.service_type.toLowerCase().includes(q) ||
          (t.service_detail && t.service_detail.toLowerCase().includes(q)) ||
          customerName.toLowerCase().includes(q)
        );
      });
    }

    // Service type filter
    if (activeFilters.length > 0) {
      result = result.filter((t) => activeFilters.includes(t.service_type));
    }

    // Sort
    result = [...result].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [treatments, search, activeFilters, sortOrder]);

  const getRepresentativePhoto = (t: Treatment) => {
    const validPhotos = t.photos.filter((p) => p.photo_type !== "source");
    if (validPhotos.length === 0) return null;

    const priorities = ["after", "during", "before"];
    for (const type of priorities) {
      const photo = validPhotos.find((p) => p.photo_type === type);
      if (photo) return photo;
    }
    return validPhotos[0];
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900">시술 기록</h1>
          <Link
            href="/treatments/new"
            className="px-3 py-1.5 bg-black text-white rounded-lg text-sm font-medium"
          >
            + 새 기록
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="시술, 고객명 검색"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
          />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Sort + Filter Row */}
        <div className="flex items-center justify-between">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="text-sm text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
          </select>

          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 border rounded-lg ${
                activeFilters.length > 0
                  ? "border-gray-900 text-gray-900"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              필터
              {activeFilters.length > 0 && (
                <span className="w-5 h-5 bg-gray-900 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilters.length}
                </span>
              )}
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-10 min-w-[140px]">
                {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                      activeFilters.includes(key)
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-500"
                    }`}
                  >
                    {activeFilters.includes(key) && "✓ "}{label}
                  </button>
                ))}
                {activeFilters.length > 0 && (
                  <>
                    <div className="h-px bg-gray-100 my-1" />
                    <button
                      onClick={() => setActiveFilters([])}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400"
                    >
                      필터 초기화
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Treatment Grid */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">시술 기록이 없습니다</p>
            <Link
              href="/record"
              className="inline-block mt-3 px-4 py-2 bg-black text-white rounded-lg text-sm"
            >
              기록 시작하기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((t) => {
              const photo = getRepresentativePhoto(t);
              const hasAiFaceSwap = t.photos.some((p) => p.face_swapped_url);

              return (
                <Link
                  key={t.id}
                  href={`/treatments/${t.id}`}
                  className="block rounded-xl overflow-hidden border border-gray-200 active:scale-[0.98] transition-transform"
                >
                  {/* Photo */}
                  <div className="aspect-square bg-gray-100 relative">
                    {photo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={photo.face_swapped_url || photo.photo_url}
                        alt={SERVICE_LABELS[t.service_type] || t.service_type}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}

                    {/* AI Badge */}
                    {hasAiFaceSwap && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">
                        AI
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <div className="text-xs text-gray-400">
                      {new Date(t.created_at).toLocaleDateString("ko-KR")}
                    </div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5 truncate">
                      {t.customer?.name
                        ? `${t.customer.name} 고객님`
                        : SERVICE_LABELS[t.service_type] || t.service_type}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Click-away overlay for filter menu */}
      {showFilterMenu && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setShowFilterMenu(false)}
        />
      )}
    </div>
  );
}
