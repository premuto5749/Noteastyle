"use client";

import { useState, useRef, useCallback } from "react";
import type { PhotoAnnotation, TreatmentPhoto } from "@/lib/api";

interface PhotoAnnotationEditorProps {
  photo: TreatmentPhoto;
  onSave: (annotations: PhotoAnnotation[]) => Promise<void>;
  onClose: () => void;
}

const MAX_ANNOTATIONS = 10;
const MAX_TEXT_LENGTH = 50;

export function PhotoAnnotationEditor({
  photo,
  onSave,
  onClose,
}: PhotoAnnotationEditorProps) {
  const [annotations, setAnnotations] = useState<PhotoAnnotation[]>(
    photo.annotations || []
  );
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(
    null
  );
  const [pendingText, setPendingText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleImageTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (deleteTarget) {
        setDeleteTarget(null);
        return;
      }
      if (annotations.length >= MAX_ANNOTATIONS) return;

      const img = imageRef.current;
      if (!img) return;

      const rect = img.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;

      setPendingPin({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
      setPendingText("");
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [annotations.length, deleteTarget]
  );

  const handleConfirmPin = useCallback(() => {
    if (!pendingPin || !pendingText.trim()) return;

    const newAnnotation: PhotoAnnotation = {
      id: crypto.randomUUID(),
      x: pendingPin.x,
      y: pendingPin.y,
      text: pendingText.trim().slice(0, MAX_TEXT_LENGTH),
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
    setPendingPin(null);
    setPendingText("");
  }, [pendingPin, pendingText]);

  const handleDeletePin = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setDeleteTarget(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Auto-confirm pending pin if it has text
      let finalAnnotations = annotations;
      if (pendingPin && pendingText.trim()) {
        const newAnnotation: PhotoAnnotation = {
          id: crypto.randomUUID(),
          x: pendingPin.x,
          y: pendingPin.y,
          text: pendingText.trim().slice(0, MAX_TEXT_LENGTH),
        };
        finalAnnotations = [...annotations, newAnnotation];
      }
      await onSave(finalAnnotations);
      onClose();
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [annotations, pendingPin, pendingText, onSave, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <button
          onClick={onClose}
          className="text-white text-sm"
        >
          취소
        </button>
        <span className="text-white text-sm font-medium">
          핀 노트 ({annotations.length}/{MAX_ANNOTATIONS})
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-accent text-sm font-bold disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* Photo area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        <div
          className="relative w-full"
          style={{ touchAction: "manipulation" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={photo.face_swapped_url || photo.photo_url}
            alt="annotation target"
            className="w-full object-contain"
            onClick={handleImageTap}
            draggable={false}
          />

          {/* Existing pins */}
          {annotations.map((ann) => (
            <div
              key={ann.id}
              className="absolute"
              style={{
                left: `${ann.x}%`,
                top: `${ann.y}%`,
                transform: "translate(-50%, -100%)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(deleteTarget === ann.id ? null : ann.id);
              }}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full shadow-md max-w-[140px] truncate whitespace-nowrap ${
                    deleteTarget === ann.id
                      ? "bg-red-500 text-white"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {deleteTarget === ann.id ? "탭하여 삭제" : ann.text}
                </div>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="-mt-0.5"
                >
                  <path
                    d="M6 12L2 6h8L6 12z"
                    fill={
                      deleteTarget === ann.id
                        ? "#ef4444"
                        : "var(--accent, #f97316)"
                    }
                  />
                </svg>
              </div>
              {deleteTarget === ann.id && (
                <button
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePin(ann.id);
                  }}
                >
                  x
                </button>
              )}
            </div>
          ))}

          {/* Pending pin (pulsing) */}
          {pendingPin && (
            <div
              className="absolute"
              style={{
                left: `${pendingPin.x}%`,
                top: `${pendingPin.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="w-4 h-4 bg-accent rounded-full animate-pulse shadow-lg border-2 border-white" />
            </div>
          )}
        </div>
      </div>

      {/* Text input area (when placing a new pin) */}
      {pendingPin && (
        <div className="bg-zinc-900 px-4 py-3 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={pendingText}
            onChange={(e) => setPendingText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirmPin();
            }}
            placeholder="메모 입력 (최대 50자)"
            className="flex-1 bg-zinc-800 text-white text-sm px-3 py-2 rounded-lg outline-none placeholder:text-zinc-500"
            maxLength={MAX_TEXT_LENGTH}
          />
          <button
            onClick={handleConfirmPin}
            disabled={!pendingText.trim()}
            className="bg-accent text-accent-foreground text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
          >
            확인
          </button>
          <button
            onClick={() => {
              setPendingPin(null);
              setPendingText("");
            }}
            className="text-zinc-400 text-sm px-2 py-2"
          >
            취소
          </button>
        </div>
      )}

      {/* Help text */}
      {!pendingPin && (
        <div className="bg-zinc-900 px-4 py-3 text-center text-zinc-500 text-xs">
          사진을 터치하여 핀 노트를 추가하세요
          {annotations.length > 0 && " · 핀을 터치하면 삭제할 수 있습니다"}
        </div>
      )}
    </div>
  );
}
