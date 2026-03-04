"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { type PortfolioItem } from "@/lib/api";
import { useShopApi } from "@/hooks/useShopApi";
import { ShareButton } from "@/components/ShareButton";

export default function PortfolioPage() {
  const { api, isReady } = useShopApi();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPublished, setShowPublished] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

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
      {/* Sticky glass header */}
      <div className="sticky top-0 z-40 glass border-b border-border/30 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">포트폴리오</h1>
            <p className="text-xs text-muted-foreground mt-0.5">AI 페이스 스왑 포트폴리오</p>
          </div>
          <Link
            href="/profile"
            className="px-3 py-1.5 bg-surface text-muted-foreground rounded-full text-sm font-medium"
          >
            내 프로필
          </Link>
        </div>
      </div>

      <div className="pb-4 space-y-0">
        {/* Filter pills */}
        <div className="px-4 py-3 flex gap-2">
          <button
            onClick={() => setShowPublished(false)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              !showPublished
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setShowPublished(true)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              showPublished
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            공개됨
          </button>
        </div>

        {loading ? (
          /* Loading skeleton: 9 pulsing squares in 3-column grid */
          <div className="grid grid-cols-3 gap-0.5">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <div className="px-4">
            <div className="card-elevated text-center py-12">
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
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-subtle">{items.length}개의 작품</span>
            </div>

            {/* Instagram-style 3-column tight grid */}
            <div className="grid grid-cols-3 gap-0.5">
              {items.map((item) => (
                <button key={item.id} className="aspect-square relative group" onClick={() => setSelectedItem(item)}>
                  {/* Image */}
                  {(item.photo.face_swapped_url || item.photo.mosaic_url) ? (
                    <Image
                      src={item.photo.face_swapped_url || item.photo.mosaic_url || item.photo.photo_url}
                      alt={item.title || "포트폴리오"}
                      fill
                      className="object-cover"
                      sizes="33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-hint">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}

                  {/* Published badge */}
                  {item.is_published && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-green-500/90 text-white text-[10px] font-medium rounded-full">
                      공개
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Fullscreen modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setSelectedItem(null)} className="text-white text-sm">
              닫기
            </button>
            <span className="text-white text-xs">
              {selectedItem.is_published ? "공개됨" : "비공개"}
            </span>
          </div>
          {/* Photo */}
          <div className="flex-1 flex items-center justify-center p-4">
            <Image
              src={selectedItem.photo.face_swapped_url || selectedItem.photo.mosaic_url || selectedItem.photo.photo_url}
              alt={selectedItem.title || "포트폴리오"}
              width={480}
              height={640}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          {/* Title */}
          {selectedItem.title && (
            <p className="text-white text-sm font-medium text-center px-4 pb-2">
              {selectedItem.title}
            </p>
          )}
          {/* Actions */}
          <div className="px-4 pb-6 flex gap-3">
            <button
              onClick={() => { handleTogglePublish(selectedItem.id); setSelectedItem(null); }}
              className="flex-1 py-3 bg-white/10 text-white rounded-xl text-sm font-medium"
            >
              {selectedItem.is_published ? "비공개로 전환" : "공개하기"}
            </button>
            <button
              onClick={() => { handleDelete(selectedItem.id); setSelectedItem(null); }}
              className="px-6 py-3 bg-red-500/80 text-white rounded-xl text-sm font-medium"
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
