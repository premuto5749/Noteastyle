"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getExplorePortfolio, togglePortfolioLike, type ExplorePortfolioItem } from "@/lib/api";
import { useShopApi } from "@/hooks/useShopApi";
import { useShop } from "@/contexts/ShopContext";
import { DesignerBadge } from "@/components/DesignerBadge";

const SHOP_TYPE_FILTERS = [
  { value: "", label: "전체" },
  { value: "hair", label: "헤어" },
  { value: "nail", label: "네일" },
  { value: "skin", label: "피부" },
  { value: "scalp", label: "두피" },
] as const;

const PAGE_SIZE = 20;

type SortType = "latest" | "popular";
type TabType = "portfolio" | "talent";

export default function ExplorePage() {
  const router = useRouter();
  const { currentShop } = useShop();
  const { api: shopApi, isReady: shopApiReady } = useShopApi();

  const [tab, setTab] = useState<TabType>("portfolio");
  const [items, setItems] = useState<ExplorePortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [shopType, setShopType] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState<SortType>("latest");
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set());
  const [bookmarkingIds, setBookmarkingIds] = useState<Set<string>>(new Set());

  const canBookmark = currentShop?.role === "owner" || currentShop?.role === "admin";

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
          sort,
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
    [shopType, search, sort, items.length]
  );

  useEffect(() => {
    if (tab === "talent") {
      router.push("/explore/talent");
    }
  }, [tab, router]);

  useEffect(() => {
    loadItems(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopType, search, sort]);

  const handleSearch = () => {
    setSearch(searchInput.trim());
  };

  const handleLike = async (item: ExplorePortfolioItem) => {
    if (likingIds.has(item.id)) return;
    setLikingIds((prev) => new Set(prev).add(item.id));
    try {
      const result = await togglePortfolioLike(item.id);
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                liked: result.liked,
                like_count: (p.like_count ?? 0) + (result.liked ? 1 : -1),
              }
            : p
        )
      );
    } finally {
      setLikingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleBookmark = async (item: ExplorePortfolioItem) => {
    if (!shopApiReady || bookmarkingIds.has(item.id)) return;
    setBookmarkingIds((prev) => new Set(prev).add(item.id));
    try {
      await shopApi.addBookmark(item.id);
    } catch {
      // ignore duplicate error
    } finally {
      setBookmarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-base font-bold text-foreground">탐색</h2>
        <p className="text-xs text-muted-foreground mt-0.5">전체 매장의 공개 포트폴리오</p>
      </div>

      <div className="px-4 space-y-3">
        {/* Tab switcher */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("portfolio")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === "portfolio"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            포트폴리오
          </button>
          <button
            onClick={() => setTab("talent")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === "talent"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            인재풀
          </button>
        </div>

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

        {/* Shop type filter + sort */}
        <div className="flex items-center gap-2">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1 -mx-0">
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
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="shrink-0 px-2 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground"
          >
            <option value="latest">최신순</option>
            <option value="popular">인기순</option>
          </select>
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
                    {/* Bookmark button */}
                    {canBookmark && (
                      <button
                        onClick={() => handleBookmark(item)}
                        disabled={bookmarkingIds.has(item.id)}
                        className="absolute top-2 right-2 p-1.5 bg-black/40 rounded-full text-white backdrop-blur-sm"
                        aria-label="찜하기"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                      </button>
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
                    {item.designer?.is_public && (
                      <DesignerBadge designer={item.designer} />
                    )}
                    {/* Like button */}
                    <div className="flex items-center justify-end mt-1.5">
                      <button
                        onClick={() => handleLike(item)}
                        disabled={likingIds.has(item.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground"
                        aria-label="좋아요"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill={item.liked ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                          className={item.liked ? "text-red-500" : "text-muted-foreground"}
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span>{item.like_count ?? 0}</span>
                      </button>
                    </div>
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
