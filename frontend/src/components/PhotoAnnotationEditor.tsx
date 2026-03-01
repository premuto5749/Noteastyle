"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type { PhotoAnnotation, TreatmentPhoto, DrawingShape, DrawingData, KeyComment } from "@/lib/api";
import { VoiceChipTray } from "./VoiceChipTray";

const DrawingCanvas = dynamic(() => import("./DrawingCanvas"), { ssr: false });

const MAX_ANNOTATIONS = 10;
const MAX_TEXT_LENGTH = 50;

type EditMode = "pin" | "drawing" | "chip";

interface PhotoAnnotationEditorProps {
  photo: TreatmentPhoto;
  onSave: (data: {
    annotations: PhotoAnnotation[];
    drawing_data: DrawingData | null;
  }) => Promise<void>;
  onClose: () => void;
  pendingChips?: KeyComment[];
}

export function PhotoAnnotationEditor({
  photo,
  onSave,
  onClose,
  pendingChips = [],
}: PhotoAnnotationEditorProps) {
  const [editMode, setEditMode] = useState<EditMode>("pin");
  const [annotations, setAnnotations] = useState<PhotoAnnotation[]>(
    photo.annotations || []
  );
  const [drawingShapes, setDrawingShapes] = useState<DrawingShape[]>(
    photo.drawing_data?.shapes || []
  );
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [pendingText, setPendingText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [chipPlacingIndex, setChipPlacingIndex] = useState<number | null>(null);
  const [placedChipIndexes, setPlacedChipIndexes] = useState<Set<number>>(new Set());
  const [showDrawingCanvas, setShowDrawingCanvas] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getImageDimensions = useCallback(() => {
    if (!containerRef.current) return { width: 480, height: 480 };
    const rect = containerRef.current.getBoundingClientRect();
    return { width: rect.width, height: rect.width }; // square
  }, []);

  // ===== Pin mode handlers =====
  const handleImageTap = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      if (editMode === "pin") {
        if (annotations.length >= MAX_ANNOTATIONS) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setPendingPin({ x, y });
        setPendingText("");
        setTimeout(() => inputRef.current?.focus(), 100);
      } else if (editMode === "chip" && chipPlacingIndex !== null) {
        // Place chip at tapped location
        const chip = pendingChips[chipPlacingIndex];
        if (!chip) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const newAnnotation: PhotoAnnotation = {
          id: crypto.randomUUID(),
          x,
          y,
          text: chip.text,
          type: "chip",
          category: chip.category,
          source: "voice_ai",
        };
        setAnnotations((prev) => [...prev, newAnnotation]);
        setPlacedChipIndexes((prev) => new Set(prev).add(chipPlacingIndex));
        setChipPlacingIndex(null);
      }
    },
    [editMode, annotations.length, chipPlacingIndex, pendingChips]
  );

  const handleConfirmPin = useCallback(() => {
    if (!pendingPin || !pendingText.trim()) return;
    const newAnnotation: PhotoAnnotation = {
      id: crypto.randomUUID(),
      x: pendingPin.x,
      y: pendingPin.y,
      text: pendingText.trim().slice(0, MAX_TEXT_LENGTH),
      type: "pin",
      source: "manual",
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
    setPendingPin(null);
    setPendingText("");
  }, [pendingPin, pendingText]);

  const handleDeletePin = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setDeleteTarget(null);
  }, []);

  // ===== Drawing mode handlers =====
  const handleDrawingSave = useCallback((shapes: DrawingShape[]) => {
    setDrawingShapes(shapes);
    setShowDrawingCanvas(false);
  }, []);

  // ===== Chip mode handlers =====
  const handleChipPlace = useCallback((_comment: KeyComment, index: number) => {
    setChipPlacingIndex(index);
  }, []);

  const handleChipRemove = useCallback((index: number) => {
    const chip = pendingChips[index];
    if (!chip) return;
    setAnnotations((prev) =>
      prev.filter((a) => !(a.type === "chip" && a.text === chip.text && a.source === "voice_ai"))
    );
    setPlacedChipIndexes((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, [pendingChips]);

  // ===== Save =====
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      let finalAnnotations = [...annotations];
      if (pendingPin && pendingText.trim()) {
        finalAnnotations.push({
          id: crypto.randomUUID(),
          x: pendingPin.x,
          y: pendingPin.y,
          text: pendingText.trim().slice(0, MAX_TEXT_LENGTH),
          type: "pin",
          source: "manual",
        });
      }

      const drawingData: DrawingData | null =
        drawingShapes.length > 0
          ? { version: 1, shapes: drawingShapes }
          : null;

      await onSave({ annotations: finalAnnotations, drawing_data: drawingData });
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [annotations, pendingPin, pendingText, drawingShapes, onSave]);

  const photoSrc = photo.face_swapped_url || photo.photo_url;

  // Full-screen drawing canvas
  if (showDrawingCanvas) {
    const dims = getImageDimensions();
    return (
      <DrawingCanvas
        imageUrl={photoSrc}
        initialShapes={drawingShapes}
        onSave={handleDrawingSave}
        onClose={() => setShowDrawingCanvas(false)}
        width={dims.width}
        height={dims.height}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={onClose} className="text-muted-foreground text-sm">
          닫기
        </button>
        <h2 className="text-sm font-bold text-foreground">어노테이션 편집</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-accent text-sm font-bold disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-border">
        {([
          ["pin", "핀"],
          ["drawing", "드로잉"],
          ...(pendingChips.length > 0 ? [["chip", "AI칩"]] : []),
        ] as [EditMode, string][]).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => {
              setEditMode(mode);
              setChipPlacingIndex(null);
            }}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              editMode === mode
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Image area */}
      <div className="flex-1 overflow-hidden flex items-center justify-center bg-black/5 dark:bg-white/5 p-2">
        <div ref={containerRef} className="relative w-full max-w-md aspect-square">
          <img
            ref={imageRef}
            src={photoSrc}
            alt="Treatment photo"
            className="absolute inset-0 w-full h-full object-cover rounded-xl"
            onClick={handleImageTap}
          />

          {/* Existing annotations overlay */}
          {annotations.map((ann) => (
            <div
              key={ann.id}
              className="absolute pointer-events-auto"
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
                {ann.type === "chip" ? (
                  <div className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm max-w-[120px] truncate">
                    {ann.text}
                  </div>
                ) : (
                  <>
                    <div className="bg-accent text-accent-foreground text-[10px] font-medium px-2 py-0.5 rounded-full shadow-md max-w-[120px] truncate">
                      {ann.text}
                    </div>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="-mt-0.5">
                      <path d="M6 12L2 6h8L6 12z" fill="var(--accent, #f97316)" />
                    </svg>
                  </>
                )}
              </div>
              {deleteTarget === ann.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePin(ann.id);
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full text-[10px] flex items-center justify-center shadow-md"
                >
                  x
                </button>
              )}
            </div>
          ))}

          {/* Pending pin marker */}
          {pendingPin && editMode === "pin" && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${pendingPin.x}%`,
                top: `${pendingPin.y}%`,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="w-4 h-4 bg-accent rounded-full border-2 border-white shadow-lg animate-bounce" />
            </div>
          )}

          {/* Chip placement hint */}
          {editMode === "chip" && chipPlacingIndex !== null && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                사진을 탭하여 배치
              </p>
            </div>
          )}

          {/* Drawing indicator */}
          {drawingShapes.length > 0 && (
            <div className="absolute top-2 right-2 bg-accent/80 text-white text-[10px] px-2 py-0.5 rounded-full">
              드로잉 {drawingShapes.length}개
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls by mode */}
      <div className="px-4 py-3 border-t border-border space-y-3">
        {/* Pin mode */}
        {editMode === "pin" && (
          <>
            {pendingPin ? (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={pendingText}
                  onChange={(e) => setPendingText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmPin()}
                  placeholder="메모 입력 (최대 50자)"
                  className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-xl text-foreground placeholder:text-subtle"
                  autoFocus
                />
                <button
                  onClick={handleConfirmPin}
                  disabled={!pendingText.trim()}
                  className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  확인
                </button>
                <button
                  onClick={() => setPendingPin(null)}
                  className="px-3 py-2 text-muted-foreground text-sm"
                >
                  취소
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                사진을 탭하여 핀 추가 ({annotations.filter(a => !a.type || a.type === "pin").length}/{MAX_ANNOTATIONS})
              </p>
            )}
          </>
        )}

        {/* Drawing mode */}
        {editMode === "drawing" && (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setShowDrawingCanvas(true)}
              className="w-full py-3 bg-accent text-white rounded-xl text-sm font-medium active:scale-95 transition-transform"
            >
              {drawingShapes.length > 0 ? "드로잉 수정" : "드로잉 시작"}
            </button>
            {drawingShapes.length > 0 && (
              <button
                onClick={() => setDrawingShapes([])}
                className="text-xs text-destructive underline"
              >
                드로잉 전체 삭제
              </button>
            )}
          </div>
        )}

        {/* Chip mode */}
        {editMode === "chip" && (
          <VoiceChipTray
            comments={pendingChips}
            placedIndexes={placedChipIndexes}
            onPlaceOnPhoto={handleChipPlace}
            onRemove={handleChipRemove}
          />
        )}
      </div>
    </div>
  );
}
