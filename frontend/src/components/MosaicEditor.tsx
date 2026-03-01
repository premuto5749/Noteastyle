"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface MosaicRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MosaicEditorProps {
  photoUrl: string;
  onComplete: (blob: Blob) => void;
  onCancel: () => void;
}

export function MosaicEditor({ photoUrl, onComplete, onCancel }: MosaicEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [regions, setRegions] = useState<MosaicRegion[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processing, setProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setOriginalImage(img);
      setImageLoaded(true);
    };
    img.onerror = () => {
      const img2 = new window.Image();
      img2.onload = () => {
        setOriginalImage(img2);
        setImageLoaded(true);
      };
      img2.src = photoUrl;
    };
    img.src = photoUrl;
  }, [photoUrl]);

  const applyBlur = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      if (w < 2 || h < 2) return;
      const px = Math.max(0, Math.floor(x));
      const py = Math.max(0, Math.floor(y));
      const pw = Math.min(Math.ceil(w), ctx.canvas.width - px);
      const ph = Math.min(Math.ceil(h), ctx.canvas.height - py);
      if (pw <= 0 || ph <= 0) return;

      // Render the region to an offscreen canvas with blur filter
      const offscreen = document.createElement("canvas");
      offscreen.width = pw;
      offscreen.height = ph;
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return;

      const blurAmount = Math.max(12, Math.min(pw, ph) / 5);
      offCtx.filter = `blur(${blurAmount}px)`;
      offCtx.drawImage(ctx.canvas, px, py, pw, ph, 0, 0, pw, ph);
      offCtx.filter = "none";

      // Clip to ellipse and composite back
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(offscreen, px, py);
      ctx.restore();
    },
    []
  );

  const renderCanvas = useCallback(
    (img: HTMLImageElement, regs: MosaicRegion[], tempReg?: MosaicRegion) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      const allRegions = tempReg ? [...regs, tempReg] : regs;
      for (const reg of allRegions) {
        applyBlur(ctx, reg.x, reg.y, reg.width, reg.height);
      }

      // Draw dashed ellipse border on temp region while drawing
      if (tempReg) {
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.ellipse(
          tempReg.x + tempReg.width / 2,
          tempReg.y + tempReg.height / 2,
          tempReg.width / 2,
          tempReg.height / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [applyBlur]
  );

  useEffect(() => {
    if (!originalImage) return;
    const tempReg =
      drawing && startPoint && currentPoint
        ? {
            x: Math.min(startPoint.x, currentPoint.x),
            y: Math.min(startPoint.y, currentPoint.y),
            width: Math.abs(currentPoint.x - startPoint.x),
            height: Math.abs(currentPoint.y - startPoint.y),
          }
        : undefined;
    renderCanvas(originalImage, regions, tempReg);
  }, [originalImage, regions, startPoint, currentPoint, drawing, renderCanvas]);

  const getCanvasPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImage) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = originalImage.naturalWidth / rect.width;
    const scaleY = originalImage.naturalHeight / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const pos = getCanvasPos(e.clientX, e.clientY);
    if (!pos) return;
    setDrawing(true);
    setStartPoint(pos);
    setCurrentPoint(pos);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    if (pos) setCurrentPoint(pos);
  };

  const handlePointerUp = () => {
    if (!drawing || !startPoint || !currentPoint) {
      setDrawing(false);
      return;
    }

    const region: MosaicRegion = {
      x: Math.min(startPoint.x, currentPoint.x),
      y: Math.min(startPoint.y, currentPoint.y),
      width: Math.abs(currentPoint.x - startPoint.x),
      height: Math.abs(currentPoint.y - startPoint.y),
    };

    if (region.width > 20 && region.height > 20) {
      setRegions((prev) => [...prev, region]);
    }

    setDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
  };

  const handleUndo = () => {
    setRegions((prev) => prev.slice(0, -1));
  };

  const handleComplete = () => {
    if (!canvasRef.current || regions.length === 0) return;
    setProcessing(true);
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) onComplete(blob);
        setProcessing(false);
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <button onClick={onCancel} className="text-white text-sm">
          취소
        </button>
        <h2 className="text-white text-sm font-medium">모자이크</h2>
        <div className="flex items-center gap-3">
          {regions.length > 0 && (
            <button onClick={handleUndo} className="text-white/70 text-sm">
              되돌리기
            </button>
          )}
        </div>
      </div>

      {/* Instruction */}
      <div className="text-center py-2">
        <p className="text-white/60 text-xs">블러 처리할 타원 영역을 드래그하세요</p>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
        {!imageLoaded ? (
          <div className="text-white/40 text-sm">이미지 로딩 중...</div>
        ) : (
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain touch-none"
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-4 py-4 pb-safe bg-black/80 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 text-sm font-medium text-white bg-white/10 rounded-xl"
        >
          취소
        </button>
        <button
          onClick={handleComplete}
          disabled={regions.length === 0 || processing}
          className="flex-1 py-3 text-sm font-medium text-white bg-accent rounded-xl disabled:opacity-40"
        >
          {processing ? "처리 중..." : `적용 (${regions.length})`}
        </button>
      </div>
    </div>
  );
}
