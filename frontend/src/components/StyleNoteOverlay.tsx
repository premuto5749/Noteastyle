"use client";

import type { Treatment } from "@/lib/api";

interface StyleNoteOverlayProps {
  treatment: Treatment;
}

const POSITION_SLOTS = [
  "top-4 left-4",
  "top-4 right-4",
  "top-12 left-8",
  "bottom-12 left-4",
  "bottom-12 right-4",
  "bottom-20 left-8",
];

export function StyleNoteOverlay({ treatment }: StyleNoteOverlayProps) {
  const tags: string[] = [];

  if (treatment.service_detail) {
    tags.push(treatment.service_detail);
  }

  if (treatment.products_used) {
    for (const p of treatment.products_used) {
      const label = p.code ? `${p.brand} ${p.code}` : p.brand;
      tags.push(label);
    }
  }

  if (treatment.area) {
    tags.push(treatment.area);
  }

  if (tags.length === 0) return null;

  return (
    <>
      {tags.slice(0, POSITION_SLOTS.length).map((tag, i) => (
        <span
          key={i}
          className={`absolute ${POSITION_SLOTS[i]} px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full shadow-sm`}
        >
          {tag}
        </span>
      ))}
    </>
  );
}
