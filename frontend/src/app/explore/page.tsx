"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { getExplorePortfolio, type ExplorePortfolioItem } from "@/lib/api";

const SHOP_TYPE_FILTERS = [
  { value: "", label: "전체" },
  { value: "hair", label: "헤어" },
  { value: "nail", label: "네일" },
  { value: "skin", label: "피부" },
  { value: "scalp", label: "두피" },
] as const;

const PAGE_SIZE = 20;

export default function ExplorePage() {
  const [items, setItems] = useState<ExplorePortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [shopType, setShopType] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [hasMore, setHasMore] = useState(true);

  const loadItems = useCallback(
    async (reset: boolean = true) => {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const skip = reset ? 0 : items.length;
        const data = await getExplorePortfolio({
          shop_type: shopType || undefined,
          search: search || undefined,
          skip,
          limit: PAGE_SIZE,
        });

        if (reset) {
          setItems(data);
        } else {
          setItems((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === PAGE_SIZE);
      } catch {
        if (reset) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [shopType, search, items.length]
  );

  useEffect(() => {
    loadItems(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopType, search]);

  const handleSearch = () => {
    setSearch(searchInput.trim());
  };

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-base font-bold text-foreground">탐색</h2>
        <p className="text-xs text-muted-foreground mt-0.5">전체 매장의 공개 포트폴리오</p>
      </div>

      <div className="px-4 space-y-3">
        {/* Search bar */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="제목, 태그 검색"
            className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-muted rounded-xl text-sm font-medium text-muted-foreground"
          >
            검색
          </button>
        </div>

        {/* Shop type filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {SHOP_TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setShopType(filter.value)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                shopType === filter.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-xl border border-border">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-subtle">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm font-medium mb-1">
              {search ? "검색 결과가 없습니다" : "공개된 포트폴리오가 없습니다"}
            </p>
            <p className="text-subtle text-xs">
              매장에서 포트폴리오를 공개하면 여기에 표시됩니다
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  <div className="aspect-square bg-muted relative">
                    {item.photo?.face_swapped_url || item.photo?.photo_url ? (
                      <Image
                        src={item.photo.face_swapped_url || item.photo.photo_url}
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
                  </div>
                  <div className="p-2.5">
                    {item.shop && (
                      <p className="text-[11px] text-accent font-medium truncate">
                        {item.shop.name}
                      </p>
                    )}
                    {item.title && (
                      <p className="text-sm font-medium text-foreground truncate mt-0.5">
                        {item.title}
                      </p>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="py-4 text-center">
                <button
                  onClick={() => loadItems(false)}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {loadingMore ? "불러오는 중..." : "더보기"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
