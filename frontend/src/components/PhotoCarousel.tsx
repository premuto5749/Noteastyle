"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import type { TreatmentPhoto } from "@/lib/api";

interface PhotoCarouselProps {
  photos: TreatmentPhoto[];
  children?: (activeIndex: number) => React.ReactNode;
}

export function PhotoCarousel({ photos, children }: PhotoCarouselProps) {
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
    </div>
  );
}
