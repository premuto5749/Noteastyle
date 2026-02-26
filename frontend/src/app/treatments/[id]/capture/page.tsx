"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { NativeCapture } from "@/components/NativeCapture";
import { useShopApi } from "@/hooks/useShopApi";
import type { CapturedMedia } from "@/types/media";

const PHOTO_TYPES = [
  { value: "before", label: "전" },
  { value: "during", label: "중" },
  { value: "after", label: "후" },
] as const;

const PHOTO_TYPE_LABELS: Record<string, string> = {
  before: "시술 전",
  during: "시술 중",
  after: "시술 후",
};

export default function CapturePage() {
  const params = useParams();
  const router = useRouter();
  const { api } = useShopApi();
  const treatmentId = params.id as string;

  const [items, setItems] = useState<CapturedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const handleCapture = useCallback((media: CapturedMedia) => {
    setItems((prev) => [...prev, { ...media, photoType: "after" }]);
  }, []);

  const handleRemove = useCallback((index: number) => {
    setItems((prev) => {
      const item = prev[index];
      URL.revokeObjectURL(item.previewUrl);
      if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleTypeChange = useCallback((index: number, newType: string) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, photoType: newType } : item
      )
    );
  }, []);

  const handleSave = async () => {
    if (items.length === 0) {
      router.push(`/treatments/${treatmentId}`);
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: items.length });

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setUploadProgress({ current: i + 1, total: items.length });

        await api.uploadTreatmentPhoto(
          treatmentId,
          item.blob,
          item.photoType,
          undefined,
          {
            mediaType: item.type,
            videoDuration: item.durationSeconds,
            thumbnail: item.thumbnailBlob,
          }
        );
      }

      router.push(`/treatments/${treatmentId}`);
    } catch {
      alert("업로드에 실패했습니다. 다시 시도해주세요.");
    } finally {
      items.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
        if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
      });
      setUploading(false);
    }
  };

  const formatDuration = (s?: number) => {
    if (s == null) return "";
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div>
      <PageHeader title="사진/영상 추가" />

      <div className="p-4 space-y-4">
        {/* Native capture */}
        <NativeCapture onCapture={handleCapture} disabled={uploading} />

        {/* Captured items with per-item type classification */}
        {items.length > 0 && (
          <div className="bg-surface rounded-2xl p-4 border border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              촬영된 미디어{" "}
              <span className="text-subtle">{items.length}개</span>
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {items.map((item, index) => (
                <div key={index} className="space-y-1.5">
                  {/* Thumbnail */}
                  <div
                    className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer"
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
                          <div className="w-full h-full bg-muted flex items-center justify-center text-subtle">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="2" y="4" width="20" height="16" rx="2" />
                              <polygon points="10 9 16 12 10 15 10 9" fill="currentColor" stroke="none" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                              <polygon points="6 3 20 12 6 21 6 3" />
                            </svg>
                          </div>
                        </div>
                        {item.durationSeconds != null && (
                          <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1 py-0.5 rounded">
                            {formatDuration(item.durationSeconds)}
                          </span>
                        )}
                      </>
                    )}

                    {/* Delete button */}
                    {!uploading && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(index);
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

                  {/* Per-item type selector */}
                  <div className="flex gap-0.5 rounded-lg overflow-hidden bg-muted">
                    {PHOTO_TYPES.map((pt) => (
                      <button
                        key={pt.value}
                        onClick={() => handleTypeChange(index, pt.value)}
                        disabled={uploading}
                        className={`flex-1 py-1 text-[11px] font-medium transition-colors ${
                          item.photoType === pt.value
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Type legend */}
            <div className="flex justify-center gap-4 mt-3 pt-3 border-t border-border">
              {Object.entries(PHOTO_TYPE_LABELS).map(([key, label]) => (
                <span key={key} className="text-[10px] text-subtle">
                  {PHOTO_TYPES.find((pt) => pt.value === key)?.label} = {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={uploading}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          {uploading
            ? `업로드 중... (${uploadProgress.current}/${uploadProgress.total})`
            : items.length > 0
              ? `저장 (${items.length}개)`
              : "건너뛰기"
          }
        </button>
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
    </div>
  );
}
