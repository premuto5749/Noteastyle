"use client";

import Image from "next/image";
import Link from "next/link";
import type { DesignerBadge as DesignerBadgeType } from "@/lib/api";

interface DesignerBadgeProps {
  designer: DesignerBadgeType;
}

export function DesignerBadge({ designer }: DesignerBadgeProps) {
  if (!designer.is_public) return null;

  return (
    <Link
      href={`/explore/designer/${designer.id}`}
      className="flex items-center gap-1.5 mt-1 group"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative w-5 h-5 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
        {designer.profile_photo_url ? (
          <Image
            src={designer.profile_photo_url}
            alt={designer.display_name}
            fill
            className="object-cover"
            sizes="20px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-subtle">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}
      </div>
      <span className="text-[11px] text-muted-foreground group-hover:text-accent truncate">
        {designer.display_name}
      </span>
    </Link>
  );
}
