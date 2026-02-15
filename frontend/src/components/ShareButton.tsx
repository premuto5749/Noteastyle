"use client";

import { useState } from "react";

interface ShareButtonProps {
  imageUrl: string;
  title?: string;
  text?: string;
  className?: string;
}

export function ShareButton({ imageUrl, title = "Note-a-Style", text = "", className }: ShareButtonProps) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      // Try Web Share API with file (mobile native share sheet)
      if (navigator.share) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const ext = blob.type.includes("png") ? "png" : "jpg";
          const file = new File([blob], `noteastyle.${ext}`, { type: blob.type });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title, text });
            return;
          }
        } catch {
          // File sharing not supported, fall through to URL share
        }

        // Fallback: share URL only
        await navigator.share({ title, text, url: imageUrl });
        return;
      }

      // Fallback: download image
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = `noteastyle-${Date.now()}.jpg`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      // User cancelled share - not an error
      if (err instanceof Error && err.name === "AbortError") return;
    } finally {
      setSharing(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className={className || "text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-md disabled:opacity-50"}
      title="공유"
    >
      {sharing ? (
        "..."
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-0.5">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      )}
      공유
    </button>
  );
}
