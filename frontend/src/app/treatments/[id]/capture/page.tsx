"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { NativeCapture } from "@/components/NativeCapture";
import { MediaGrid } from "@/components/MediaGrid";
import { useShopApi } from "@/hooks/useShopApi";
import type { CapturedMedia } from "@/types/media";

const PHOTO_TYPES = [
  { value: "before", label: "시술 전" },
  { value: "during", label: "시술 중" },
  { value: "after", label: "시술 후" },
] as const;

export default function CapturePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { api } = useShopApi();
  const treatmentId = params.id as string;

  const initialType = searchParams.get("type") || "after";
  const [photoType, setPhotoType] = useState(initialType);
  const [items, setItems] = useState<CapturedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const handleCapture = useCallback((media: CapturedMedia) => {
    setItems((prev) => [...prev, { ...media, photoType } as CapturedMedia & { photoType: string }]);
  }, [photoType]);

  const handleRemove = useCallback((index: number) => {
    setItems((prev) => {
      const item = prev[index];
      URL.revokeObjectURL(item.previewUrl);
      if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
      return prev.filter((_, i) => i !== index);
    });
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
          photoType,
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

  return (
    <div>
      <PageHeader
        title="사진/영상 추가"
      />

      <div className="p-4 space-y-4">
        {/* Photo type selector */}
        <div className="flex bg-muted rounded-xl p-1">
          {PHOTO_TYPES.map((pt) => (
            <button
              key={pt.value}
              onClick={() => setPhotoType(pt.value)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                photoType === pt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>

        {/* Native capture (photo + disabled video) */}
        <NativeCapture onCapture={handleCapture} disabled={uploading} />

        {/* Media grid */}
        {items.length > 0 && (
          <div className="bg-surface rounded-2xl p-4 border border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              촬영된 미디어{" "}
              <span className="text-subtle">{items.length}개</span>
            </h3>
            <MediaGrid items={items} onRemove={handleRemove} editable={!uploading} />
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
    </div>
  );
}
