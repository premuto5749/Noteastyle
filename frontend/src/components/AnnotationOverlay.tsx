"use client";

import type { PhotoAnnotation } from "@/lib/api";

interface AnnotationOverlayProps {
  annotations: PhotoAnnotation[];
  onPinTap?: () => void;
}

export function AnnotationOverlay({
  annotations,
  onPinTap,
}: AnnotationOverlayProps) {
  if (annotations.length === 0) return null;

  return (
    <>
      {annotations.map((ann) => (
        <div
          key={ann.id}
          className="absolute pointer-events-auto"
          style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: "translate(-50%, -100%)" }}
          onClick={(e) => {
            e.stopPropagation();
            onPinTap?.();
          }}
        >
          {/* Pin icon */}
          <div className="flex flex-col items-center">
            <div className="bg-accent text-accent-foreground text-[10px] font-medium px-2 py-0.5 rounded-full shadow-md max-w-[120px] truncate whitespace-nowrap">
              {ann.text}
            </div>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="-mt-0.5"
            >
              <path d="M6 12L2 6h8L6 12z" fill="var(--accent, #f97316)" />
            </svg>
          </div>
        </div>
      ))}
    </>
  );
}
