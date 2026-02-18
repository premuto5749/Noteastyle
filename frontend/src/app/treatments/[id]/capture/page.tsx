"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { MediaCapture, type CapturedMedia } from "@/components/MediaCapture";
import { MediaGrid } from "@/components/MediaGrid";
import { uploadTreatmentPhoto } from "@/lib/api";

const PHOTO_TYPES = [
  { value: "before", label: "시술 전" },
  { value: "during", label: "시술 중" },
  { value: "after", label: "시술 후" },
] as const;

export default function CapturePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const treatmentId = params.id as string;

  const initialType = searchParams.get("type") || "after";
  const [photoType, setPhotoType] = useState(initialType);
  const [captureMode, setCaptureMode] = useState<"photo" | "video" | null>(null);
  const [items, setItems] = useState<CapturedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const handleCapture = useCallback((media: CapturedMedia) => {
    setItems((prev) => [...prev, { ...media, photoType } as CapturedMedia & { photoType: string }]);
    setCaptureMode(null);
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

        await uploadTreatmentPhoto(
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
        title="사진/영상 촬영"
      />

      <div className="p-4 space-y-4">
        {/* Photo type selector */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          {PHOTO_TYPES.map((pt) => (
            <button
              key={pt.value}
              onClick={() => setPhotoType(pt.value)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                photoType === pt.value
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>

        {/* Camera/Video viewfinder */}
        {captureMode && (
          <MediaCapture
            mode={captureMode}
            onCapture={handleCapture}
            onClose={() => setCaptureMode(null)}
          />
        )}

        {/* Mode selection buttons */}
        {!captureMode && (
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-4">
              시술 완료 후 사진 또는 영상을 촬영하세요
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCaptureMode("photo")}
                disabled={uploading}
                className="flex flex-col items-center gap-2 py-6 bg-white rounded-xl border border-gray-200 active:scale-95 transition-transform disabled:opacity-50"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-sm font-medium text-gray-900">사진 촬영</span>
              </button>
              <button
                onClick={() => setCaptureMode("video")}
                disabled={uploading}
                className="flex flex-col items-center gap-2 py-6 bg-white rounded-xl border border-gray-200 active:scale-95 transition-transform disabled:opacity-50"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                  <rect x="2" y="4" width="15" height="16" rx="2" />
                  <path d="M17 9l5-3v12l-5-3" />
                </svg>
                <span className="text-sm font-medium text-gray-900">영상 촬영</span>
              </button>
            </div>
          </div>
        )}

        {/* Media grid */}
        {items.length > 0 && (
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-3">
              촬영된 미디어{" "}
              <span className="text-gray-400">{items.length}개</span>
            </h3>
            <MediaGrid items={items} onRemove={handleRemove} editable={!uploading} />
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={uploading}
          className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-50"
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
