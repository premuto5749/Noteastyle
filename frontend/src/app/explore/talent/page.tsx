"use client";

import { useEffect, useState, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { searchTalentPool, type TalentSearchItem } from "@/lib/api";
import { ShopContext } from "@/contexts/ShopContext";

const SHOP_TYPE_FILTERS = [
  { value: "", label: "전체" },
  { value: "hair", label: "헤어" },
  { value: "nail", label: "네일" },
  { value: "skin", label: "피부" },
  { value: "scalp", label: "두피" },
] as const;

const PAGE_SIZE = 20;

export default function TalentPoolPage() {
  const router = useRouter();
  const { currentShop } = useContext(ShopContext);

  const [items, setItems] = useState<TalentSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [shopType, setShopType] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [hasMore, setHasMore] = useState(true);

  const loadItems = useCallback(
    async (reset: boolean = true) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      try {
        const skip = reset ? 0 : items.length;
        const data = await searchTalentPool({
          shop_type: shopType || undefined,
          search: search || undefined,
          shop_id: currentShop?.shop_id,
          skip,
          limit: PAGE_SIZE,
        });

        if (reset) setItems(data);
        else setItems((prev) => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
      } catch {
        if (reset) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [shopType, search, currentShop?.shop_id, items.length]
  );

  useEffect(() => {
    loadItems(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopType, search]);

  const handleSearch = () => setSearch(searchInput.trim());

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-base font-bold text-foreground">인재풀</h2>
        <p className="text-xs text-muted-foreground mt-0.5">제안 수신 중인 디자이너</p>
      </div>

      <div className="px-4 space-y-3">
        {/* Back to portfolio tab */}
        <div className="flex border-b border-border">
          <button
            onClick={() => router.push("/explore")}
            className="flex-1 py-2 text-sm font-medium text-muted-foreground"
          >
            포트폴리오
          </button>
          <button className="flex-1 py-2 text-sm font-medium text-primary border-b-2 border-primary">
            인재풀
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="이름, 전문분야 검색"
            className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-muted rounded-xl text-sm font-medium text-muted-foreground"
          >
            검색
          </button>
        </div>

        {/* Shop type filter */}
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
              <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-xl border border-border">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-subtle">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm font-medium mb-1">
              {search ? "검색 결과가 없습니다" : "제안 수신 중인 디자이너가 없습니다"}
            </p>
            <p className="text-subtle text-xs">
              디자이너가 프로필에서 제안 수신을 활성화하면 표시됩니다
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => (
                <button
                  key={item.member_id}
                  onClick={() => router.push(`/explore/designer/${item.member_id}`)}
                  className="bg-card rounded-xl border border-border overflow-hidden text-left"
                >
                  <div className="p-3 flex flex-col items-center text-center gap-2">
                    {/* Profile photo */}
                    <div className="w-16 h-16 rounded-full bg-muted overflow-hidden relative">
                      {item.profile_photo_url ? (
                        <Image
                          src={item.profile_photo_url}
                          alt={item.display_name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-subtle">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.display_name}</p>
                      {item.specialty && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.specialty}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-subtle">
                      {item.career_years != null && (
                        <span>{item.career_years}년 경력</span>
                      )}
                      {item.portfolio_count > 0 && (
                        <span>포트폴리오 {item.portfolio_count}</span>
                      )}
                    </div>

                    {item.shop && (
                      <p className="text-[11px] text-accent truncate w-full text-center">
                        {item.shop.name}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>

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
