"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useShopApi } from "@/hooks/useShopApi";
import { type TrashPhoto } from "@/lib/api";

const PHOTO_TYPE_LABELS: Record<string, string> = {
  before: "시술 전",
  during: "시술 중",
  after: "시술 후",
  source: "소스",
};

function getDaysLeft(deletedAt: string): number {
  const deleted = new Date(deletedAt).getTime();
  const expiry = deleted + 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return Math.max(0, Math.ceil((expiry - now) / (24 * 60 * 60 * 1000)));
}

export default function TrashPage() {
  const router = useRouter();
  const { api, isReady } = useShopApi();
  const [photos, setPhotos] = useState<TrashPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrash = useCallback(async () => {
    try {
      const data = await api.getTrash();
      setPhotos(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!isReady) return;
    loadTrash();
  }, [loadTrash, isReady]);

  async function handleRestore(photoId: string) {
    try {
      await api.restorePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      alert("복원에 실패했습니다.");
    }
  }

  async function handlePurge(photoId: string) {
    if (!confirm("영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    try {
      await api.purgePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      alert("영구 삭제에 실패했습니다.");
    }
  }

  return (
    <div className="min-h-screen bg-muted pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-header-bg backdrop-blur-sm px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-muted-foreground"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-sm">뒤로</span>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">휴지통</h1>
          <p className="text-[11px] text-muted-foreground">7일 후 자동 영구 삭제</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-subtle text-sm">불러오는 중...</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-hint mb-4">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <p className="text-sm text-subtle">휴지통이 비어 있습니다</p>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-2">
          {photos.map((photo) => {
            const daysLeft = getDaysLeft(photo.deleted_at);
            const thumbUrl = photo.thumbnail_url || photo.photo_url;
            return (
              <div
                key={photo.id}
                className="bg-card rounded-xl p-3 flex items-center gap-3"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted relative flex-shrink-0">
                  <Image
                    src={thumbUrl}
                    alt="삭제된 사진"
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {PHOTO_TYPE_LABELS[photo.photo_type] || photo.photo_type}
                    {photo.media_type === "video" && (
                      <span className="ml-1 text-accent text-xs">영상</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {photo.customer_name && `${photo.customer_name} · `}
                    {photo.service_type || "시술"}
                  </p>
                  <p className="text-[11px] text-destructive mt-0.5">
                    {daysLeft > 0 ? `${daysLeft}일 후 영구 삭제` : "곧 삭제됩니다"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleRestore(photo.id)}
                    className="px-2.5 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded-lg active:opacity-80"
                  >
                    복원
                  </button>
                  <button
                    onClick={() => handlePurge(photo.id)}
                    className="px-2.5 py-1.5 text-xs font-medium bg-destructive/10 text-destructive rounded-lg active:opacity-80"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
