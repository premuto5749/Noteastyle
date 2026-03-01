"use client";

import type { KeyComment } from "@/lib/api";

const CHIP_COLORS: Record<string, string> = {
  area: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  product: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800",
  time: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  caution: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800",
  result: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800",
};

interface VoiceChipTrayProps {
  comments: KeyComment[];
  placedIndexes: Set<number>;
  onPlaceOnPhoto: (comment: KeyComment, index: number) => void;
  onRemove: (index: number) => void;
}

export function VoiceChipTray({
  comments,
  placedIndexes,
  onPlaceOnPhoto,
  onRemove,
}: VoiceChipTrayProps) {
  if (comments.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        AI 코멘트 — 탭하여 사진에 배치
      </p>
      <div className="flex flex-wrap gap-2">
        {comments.map((comment, i) => {
          const isPlaced = placedIndexes.has(i);
          return (
            <button
              key={i}
              onClick={() => {
                if (isPlaced) {
                  onRemove(i);
                } else {
                  onPlaceOnPhoto(comment, i);
                }
              }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                CHIP_COLORS[comment.category] || "bg-muted text-muted-foreground border-border"
              } ${isPlaced ? "opacity-40 line-through" : "active:scale-95"}`}
            >
              {comment.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
