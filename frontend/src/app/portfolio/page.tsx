"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getPortfolio, togglePortfolioPublish, type PortfolioItem } from "@/lib/api";
import { ShareButton } from "@/components/ShareButton";

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPublished, setShowPublished] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getPortfolio(showPublished);
        setItems(data);
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showPublished]);

  const handleTogglePublish = async (id: string) => {
    try {
      const updated = await togglePortfolioPublish(id);
      if (showPublished && !updated.is_published) {
        // Remove from list when unpublishing in "published only" view
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? updated : item))
        );
      }
    } catch {
      alert("상태 변경에 실패했습니다.");
    }
  };

  return (
    <div>
      <PageHeader
        title="포트폴리오"
        subtitle="AI 페이스 스왑 포트폴리오"
      />

      <div className="p-4 space-y-4">
        {/* Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowPublished(false)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              !showPublished
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setShowPublished(true)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              showPublished
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            공개됨
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium mb-1">
              아직 포트폴리오가 없습니다
            </p>
            <p className="text-gray-400 text-xs">
              시술 사진에서 AI 페이스 스왑을 적용하면
              <br />
              자동으로 포트폴리오가 생성됩니다
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="aspect-square bg-gray-100 relative">
                  {item.photo.face_swapped_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.photo.face_swapped_url}
                      alt={item.title || "포트폴리오"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                  {item.is_published && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                      공개
                    </span>
                  )}
                </div>
                <div className="p-3">
                  {item.title && (
                    <div className="text-sm font-medium truncate text-gray-900">{item.title}</div>
                  )}
                  {item.tags && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {item.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleTogglePublish(item.id)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${
                        item.is_published
                          ? "bg-gray-100 text-gray-500"
                          : "bg-black text-white"
                      }`}
                    >
                      {item.is_published ? "비공개" : "공개하기"}
                    </button>
                    <ShareButton
                      imageUrl={item.photo.face_swapped_url || item.photo.photo_url}
                      title={item.title || "포트폴리오"}
                      className="py-1.5 px-3 rounded-lg text-xs font-medium bg-gray-100 text-gray-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
