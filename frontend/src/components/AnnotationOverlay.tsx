"use client";

import { useRef, useEffect } from "react";
import type { PhotoAnnotation, DrawingData } from "@/lib/api";

const CHIP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  area: { bg: "bg-blue-100 dark:bg-blue-900/50", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  product: { bg: "bg-green-100 dark:bg-green-900/50", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  time: { bg: "bg-yellow-100 dark:bg-yellow-900/50", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-200 dark:border-yellow-800" },
  caution: { bg: "bg-red-100 dark:bg-red-900/50", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
  result: { bg: "bg-purple-100 dark:bg-purple-900/50", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
};

interface AnnotationOverlayProps {
  annotations: PhotoAnnotation[];
  drawingData?: DrawingData | null;
  onPinTap?: () => void;
}

function DrawingOverlay({ drawingData }: { drawingData: DrawingData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !drawingData.shapes.length) return;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const toPx = (pct: number, total: number) => (pct / 100) * total;

      for (const shape of drawingData.shapes) {
        ctx.strokeStyle = shape.stroke;
        ctx.lineWidth = shape.strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        switch (shape.type) {
          case "freehand":
            if (shape.points && shape.points.length >= 4) {
              ctx.beginPath();
              ctx.moveTo(toPx(shape.points[0], width), toPx(shape.points[1], height));
              for (let i = 2; i < shape.points.length; i += 2) {
                ctx.lineTo(toPx(shape.points[i], width), toPx(shape.points[i + 1], height));
              }
              ctx.stroke();
            }
            break;

          case "circle":
            if (shape.x != null && shape.y != null && shape.radius != null) {
              ctx.beginPath();
              ctx.arc(
                toPx(shape.x, width),
                toPx(shape.y, height),
                toPx(shape.radius, Math.min(width, height)),
                0,
                Math.PI * 2
              );
              ctx.stroke();
            }
            break;

          case "arrow":
          case "line":
            if (shape.points && shape.points.length >= 4) {
              const x1 = toPx(shape.points[0], width);
              const y1 = toPx(shape.points[1], height);
              const x2 = toPx(shape.points[2], width);
              const y2 = toPx(shape.points[3], height);

              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();

              if (shape.type === "arrow") {
                const angle = Math.atan2(y2 - y1, x2 - x1);
                const headLen = 10;
                ctx.fillStyle = shape.stroke;
                ctx.beginPath();
                ctx.moveTo(x2, y2);
                ctx.lineTo(
                  x2 - headLen * Math.cos(angle - Math.PI / 6),
                  y2 - headLen * Math.sin(angle - Math.PI / 6)
                );
                ctx.lineTo(
                  x2 - headLen * Math.cos(angle + Math.PI / 6),
                  y2 - headLen * Math.sin(angle + Math.PI / 6)
                );
                ctx.closePath();
                ctx.fill();
              }
            }
            break;
        }
      }
    };

    draw();

    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawingData]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  );
}

export function AnnotationOverlay({
  annotations,
  drawingData,
  onPinTap,
}: AnnotationOverlayProps) {
  const hasAnnotations = annotations.length > 0;
  const hasDrawing = drawingData && drawingData.shapes.length > 0;

  if (!hasAnnotations && !hasDrawing) return null;

  return (
    <>
      {/* Drawing overlay (uses native canvas for performance in read-only mode) */}
      {hasDrawing && (
        <DrawingOverlay drawingData={drawingData} />
      )}

      {/* Pin annotations */}
      {annotations.map((ann) => {
        const isChip = ann.type === "chip";
        const chipStyle = isChip && ann.category ? CHIP_COLORS[ann.category] : null;

        return (
          <div
            key={ann.id}
            className="absolute pointer-events-auto"
            style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: "translate(-50%, -100%)" }}
            onClick={(e) => {
              e.stopPropagation();
              onPinTap?.();
            }}
          >
            <div className="flex flex-col items-center">
              {isChip && chipStyle ? (
                /* Chip style badge */
                <div
                  className={`${chipStyle.bg} ${chipStyle.text} ${chipStyle.border} border text-xs font-medium px-2.5 py-1 rounded-full shadow-sm max-w-[160px] truncate whitespace-nowrap`}
                >
                  {ann.text}
                </div>
              ) : (
                /* Default pin style */
                <>
                  <div className="bg-accent text-accent-foreground text-xs font-medium px-2.5 py-1 rounded-full shadow-lg max-w-[160px] truncate whitespace-nowrap drop-shadow-md">
                    {ann.text}
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="-mt-0.5"
                  >
                    <path d="M6 12L2 6h8L6 12z" fill="var(--accent, #f97316)" />
                  </svg>
                </>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
