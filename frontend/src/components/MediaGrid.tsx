"use client";

import { useState } from "react";
import type { CapturedMedia } from "./MediaCapture";

interface MediaGridProps {
  items: CapturedMedia[];
  onRemove: (index: number) => void;
  editable?: boolean;
}

export function MediaGrid({ items, onRemove, editable = true }: MediaGridProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  const formatDuration = (s?: number) => {
    if (s == null) return "";
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
            onClick={() => setPreviewIndex(index)}
          >
            {item.type === "photo" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.previewUrl}
                alt={`촬영 ${index + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl}
                    alt={`영상 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <polygon points="10 9 16 12 10 15 10 9" fill="#9ca3af" stroke="none" />
                    </svg>
                  </div>
                )}
                {/* Play icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                      <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                  </div>
                </div>
                {/* Duration badge */}
                {item.durationSeconds != null && (
                  <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1 py-0.5 rounded">
                    {formatDuration(item.durationSeconds)}
                  </span>
                )}
              </>
            )}

            {/* Delete button */}
            {editable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Fullscreen preview modal */}
      {previewIndex !== null && items[previewIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setPreviewIndex(null)}
        >
          <button
            onClick={() => setPreviewIndex(null)}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {items[previewIndex].type === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={items[previewIndex].previewUrl}
              alt="미리보기"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={items[previewIndex].previewUrl}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}
