"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { type PortfolioItem } from "@/lib/api";
import { useShopApi } from "@/hooks/useShopApi";
import { ShareButton } from "@/components/ShareButton";

export default function PortfolioPage() {
  const { api, isReady } = useShopApi();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPublished, setShowPublished] = useState(false);

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPortfolio(showPublished);
      setItems(data);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, [api, showPublished]);

  useEffect(() => {
    if (!isReady) return;
    loadPortfolio();
  }, [loadPortfolio, isReady]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 포트폴리오 항목을 삭제하시겠습니까?")) return;
    try {
      await api.deletePortfolioItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  const handleTogglePublish = async (id: string) => {
    try {
      const updated = await api.togglePortfolioPublish(id);
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
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-base font-bold text-foreground">내 포트폴리오</h2>
        <p className="text-xs text-muted-foreground mt-0.5">AI 페이스 스왑 포트폴리오</p>
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowPublished(false)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              !showPublished
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setShowPublished(true)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              showPublished
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            공개됨
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-subtle">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-xl border border-border">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-subtle">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm font-medium mb-1">
              아직 포트폴리오가 없습니다
            </p>
            <p className="text-subtle text-xs">
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
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                <div className="aspect-square bg-muted relative">
                  {item.photo.face_swapped_url ? (
                    <Image
                      src={item.photo.face_swapped_url}
                      alt={item.title || "포트폴리오"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 480px) 50vw, 240px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-hint">
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
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
                    title="삭제"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="p-3">
                  {item.title && (
                    <div className="text-sm font-medium truncate text-foreground">{item.title}</div>
                  )}
                  {item.tags && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {item.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded"
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
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {item.is_published ? "비공개" : "공개하기"}
                    </button>
                    <ShareButton
                      imageUrl={item.photo.face_swapped_url || item.photo.photo_url}
                      title={item.title || "포트폴리오"}
                      className="py-1.5 px-3 rounded-lg text-xs font-medium bg-muted text-muted-foreground"
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
