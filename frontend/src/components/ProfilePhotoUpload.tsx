"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface ProfilePhotoUploadProps {
  currentUrl: string | null;
  onUpload: (file: File) => Promise<string>;
  size?: number;
}

export function ProfilePhotoUpload({
  currentUrl,
  onUpload,
  size = 80,
}: ProfilePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayUrl = previewUrl || currentUrl;

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    setUploading(true);
    try {
      const url = await onUpload(file);
      setPreviewUrl(url);
    } catch {
      setPreviewUrl(null);
      alert("사진 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localUrl);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative rounded-full overflow-hidden bg-muted border-2 border-border hover:border-primary transition-colors"
        style={{ width: size, height: size }}
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt="프로필 사진"
            fill
            className="object-cover"
            sizes={`${size}px`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-subtle">
            <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}
        {/* Camera overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 hover:opacity-100 transition-opacity">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />
      <span className="text-xs text-muted-foreground">
        {uploading ? "업로드 중..." : "사진 변경"}
      </span>
    </div>
  );
}
