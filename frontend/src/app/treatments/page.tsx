"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getTreatments, type Treatment } from "@/lib/api";

const SERVICE_LABELS: Record<string, string> = {
  cut: "\uCEE4\uD2B8",
  color: "\uC5FC\uC0C9",
  perm: "\uD3B8",
  treatment: "\uD2B8\uB9AC\uD2B8\uBA3C\uD2B8",
  bleach: "\uBE14\uB9AC\uCE58",
  scalp: "\uB450\uD53C\uAD00\uB9AC",
};

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

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

  const filtered = filter
    ? treatments.filter((t) => t.service_type === filter)
    : treatments;

  return (
    <div>
      <PageHeader
        title="\uC2DC\uC220 \uAE30\uB85D"
        subtitle={`\uCD1D ${treatments.length}\uAC74`}
        action={
          <Link
            href="/treatments/new"
            className="px-3 py-1.5 bg-white text-black rounded-lg text-sm font-medium"
          >
            + 새 기록
          </Link>
        }
      />

      <div className="p-4 space-y-4">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              !filter
                ? "bg-white text-black"
                : "bg-[#1a1a1a] text-[#a1a1a1]"
            }`}
          >
            전체
          </button>
          {Object.entries(SERVICE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                filter === key
                  ? "bg-white text-black"
                  : "bg-[#1a1a1a] text-[#a1a1a1]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Treatment List */}
        {loading ? (
          <div className="text-center py-8 text-[#555555]">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-[#111111] rounded-xl border border-[#262626]">
            <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <p className="text-[#555555] text-sm">시술 기록이 없습니다</p>
            <Link
              href="/record"
              className="inline-block mt-3 px-4 py-2 bg-white text-black rounded-lg text-sm"
            >
              기록 시작하기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <Link
                key={t.id}
                href={`/treatments/${t.id}`}
                className="block bg-[#111111] rounded-xl border border-[#262626] p-4 active:bg-[#1a1a1a]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#1a1a1a] text-[#ededed] rounded-md text-xs font-medium">
                        {SERVICE_LABELS[t.service_type] || t.service_type}
                      </span>
                      {t.service_detail && (
                        <span className="text-sm text-[#a1a1a1]">{t.service_detail}</span>
                      )}
                    </div>
                    {t.products_used && t.products_used.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {t.products_used.map((p, i) => (
                          <span
                            key={i}
                            className="text-xs bg-[#1a1a1a] text-[#a1a1a1] px-2 py-0.5 rounded-full"
                          >
                            {p.brand} {p.code}
                          </span>
                        ))}
                      </div>
                    )}
                    {t.customer_notes && (
                      <p className="text-xs text-[#666666] mt-2">{t.customer_notes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-xs text-[#555555]">
                      {new Date(t.created_at).toLocaleDateString("ko-KR")}
                    </div>
                    {t.duration_minutes && (
                      <div className="text-xs text-[#555555] mt-0.5">
                        {t.duration_minutes}분
                      </div>
                    )}
                    {t.photos.length > 0 && (
                      <div className="text-xs text-[#a1a1a1] mt-1">
                        {(() => {
                          const photos = t.photos.filter((p) => p.photo_type !== "source");
                          const photoCount = photos.filter((p) => (p.media_type || "photo") === "photo").length;
                          const videoCount = photos.filter((p) => p.media_type === "video").length;
                          const parts = [];
                          if (photoCount > 0) parts.push(`사진 ${photoCount}장`);
                          if (videoCount > 0) parts.push(`영상 ${videoCount}편`);
                          return parts.join(" ");
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
