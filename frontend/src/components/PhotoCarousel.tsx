"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import type { TreatmentPhoto } from "@/lib/api";

type QuickAction = "annotate" | "faceswap" | "mosaic" | "portfolio";

interface PhotoCarouselProps {
  photos: TreatmentPhoto[];
  children?: (activeIndex: number) => React.ReactNode;
  onAction?: (photo: TreatmentPhoto, action: QuickAction) => void;
}

export function PhotoCarousel({ photos, children, onAction }: PhotoCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(index);
  }, []);

  if (photos.length === 0) {
    return (
      <div className="aspect-[4/3] bg-muted flex items-center justify-center text-hint">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Scrollable container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollBehavior: "smooth" }}
      >
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="w-full shrink-0 snap-center aspect-[4/3] relative bg-muted"
          >
            {photo.media_type === "video" ? (
              <video
                src={photo.photo_url}
                controls
                playsInline
                poster={photo.thumbnail_url || undefined}
                className="w-full h-full object-cover"
              />
            ) : (
              <Image
                src={photo.face_swapped_url || photo.mosaic_url || photo.photo_url}
                alt={photo.photo_type}
                fill
                className="object-cover"
                sizes="100vw"
                priority={index === 0}
              />
            )}

            {/* AI badge */}
            {photo.face_swapped_url && (
              <span className="absolute top-3 left-3 px-2 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full">
                AI
              </span>
            )}
            {photo.mosaic_url && !photo.face_swapped_url && (
              <span className="absolute top-3 left-3 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">
                M
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {photos.length > 1 && (
        <>
          {activeIndex > 0 && (
            <button
              onClick={() => {
                scrollRef.current?.scrollTo({
                  left: (activeIndex - 1) * scrollRef.current!.clientWidth,
                  behavior: "smooth",
                });
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center z-10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {activeIndex < photos.length - 1 && (
            <button
              onClick={() => {
                scrollRef.current?.scrollTo({
                  left: (activeIndex + 1) * scrollRef.current!.clientWidth,
                  behavior: "smooth",
                });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center z-10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </>
      )}

      {/* Page indicator */}
      {photos.length > 1 && (
        <span className="absolute top-3 right-3 px-2 py-0.5 bg-black/50 text-white text-xs rounded-full z-10">
          {activeIndex + 1} / {photos.length}
        </span>
      )}

      {/* Overlay children (StyleNoteOverlay) */}
      {children && (
        <div className="absolute inset-0 pointer-events-none">
          {children(activeIndex)}
        </div>
      )}

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {photos.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === activeIndex ? "bg-white w-4" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}

      {/* Quick Action Bar */}
      {onAction && photos.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
          {/* Left: annotate, faceswap, mosaic */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAction(photos[activeIndex], "annotate")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground active:bg-muted transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="text-xs">어노테이션</span>
            </button>
            <button
              onClick={() => onAction(photos[activeIndex], "faceswap")}
              disabled={photos[activeIndex]?.media_type === "video"}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground active:bg-muted transition-colors disabled:opacity-30"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 1 0-16 0" />
              </svg>
              <span className="text-xs">페이스스왑</span>
            </button>
            <button
              onClick={() => onAction(photos[activeIndex], "mosaic")}
              disabled={photos[activeIndex]?.media_type === "video"}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground active:bg-muted transition-colors disabled:opacity-30"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              <span className="text-xs">모자이크</span>
            </button>
          </div>
          {/* Right: portfolio bookmark */}
          <button
            onClick={() => onAction(photos[activeIndex], "portfolio")}
            className={`p-2 rounded-lg active:bg-muted transition-colors ${
              photos[activeIndex]?.is_portfolio ? "text-accent" : "text-muted-foreground"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={photos[activeIndex]?.is_portfolio ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
