"use client";

import { useRef, useState, useCallback } from "react";
import type { CapturedMedia } from "@/types/media";
import {
  loadVideoMetadata,
  validateVideoDuration,
  generateVideoThumbnail,
  MAX_VIDEO_DURATION,
} from "@/lib/video-utils";

interface NativeCaptureProps {
  onCapture: (media: CapturedMedia) => void;
  onCaptureMultiple?: (media: CapturedMedia[]) => void;
  disabled?: boolean;
}

export function NativeCapture({ onCapture, onCaptureMultiple, disabled }: NativeCaptureProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handlePhotoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const file = e.target.files?.[0];
      if (!file) return;

      const previewUrl = URL.createObjectURL(file);
      onCapture({ blob: file, type: "photo", previewUrl, photoType: "after" });
      e.target.value = "";
    },
    [onCapture],
  );

  const handleGalleryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      if (files.length === 1 || !onCaptureMultiple) {
        const file = files[0];
        const previewUrl = URL.createObjectURL(file);
        onCapture({ blob: file, type: "photo", previewUrl, photoType: "after" });
      } else {
        const items: CapturedMedia[] = files.map((f) => ({
          blob: f,
          type: "photo" as const,
          previewUrl: URL.createObjectURL(f),
          photoType: "after",
        }));
        onCaptureMultiple(items);
      }
      e.target.value = "";
    },
    [onCapture, onCaptureMultiple],
  );

  const handleVideoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const file = e.target.files?.[0];
      if (!file) return;

      setProcessing(true);
      try {
        const { duration, videoEl } = await loadVideoMetadata(file);
        const result = validateVideoDuration(duration);
        if (!result.valid) {
          setError(result.message!);
          e.target.value = "";
          return;
        }

        const previewUrl = URL.createObjectURL(file);
        let thumbnailBlob: Blob | undefined;
        let thumbnailUrl: string | undefined;
        try {
          thumbnailBlob = await generateVideoThumbnail(videoEl);
          thumbnailUrl = URL.createObjectURL(thumbnailBlob);
        } catch {
          // 썸네일 실패해도 영상은 진행
        }

        onCapture({
          blob: file,
          type: "video",
          durationSeconds: Math.round(duration),
          thumbnailBlob,
          previewUrl,
          thumbnailUrl,
          photoType: "after",
        });
      } catch {
        setError("영상 파일을 읽을 수 없습니다.");
      } finally {
        setProcessing(false);
        e.target.value = "";
      }
    },
    [onCapture],
  );

  return (
    <div className="bg-surface rounded-2xl p-4 border border-border">
      <p className="text-sm text-muted-foreground text-center mb-4">
        시술 완료 후 사진 또는 영상을 촬영하세요
      </p>

      {error && (
        <p className="text-sm text-destructive text-center mb-3">{error}</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {/* 카메라 버튼 */}
        <button
          onClick={() => photoInputRef.current?.click()}
          disabled={disabled || processing}
          className="flex flex-col items-center gap-2 py-5 bg-card rounded-xl border border-border active:scale-95 transition-transform disabled:opacity-50"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted-foreground"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span className="text-xs font-medium text-foreground">카메라</span>
        </button>

        {/* 갤러리 버튼 */}
        <button
          onClick={() => galleryInputRef.current?.click()}
          disabled={disabled || processing}
          className="flex flex-col items-center gap-2 py-5 bg-card rounded-xl border border-border active:scale-95 transition-transform disabled:opacity-50"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted-foreground"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="text-xs font-medium text-foreground">갤러리</span>
        </button>

        {/* 영상 촬영 버튼 */}
        <button
          onClick={() => videoInputRef.current?.click()}
          disabled={disabled || processing}
          className="flex flex-col items-center gap-2 py-5 bg-card rounded-xl border border-border active:scale-95 transition-transform disabled:opacity-50"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted-foreground"
          >
            <rect x="2" y="4" width="15" height="16" rx="2" />
            <path d="M17 9l5-3v12l-5-3" />
          </svg>
          <span className="text-xs font-medium text-foreground">
            {processing ? "처리 중..." : "영상"}
          </span>
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleGalleryChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={handleVideoChange}
      />
    </div>
  );
}
