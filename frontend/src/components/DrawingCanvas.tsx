"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Stage, Layer, Line, Circle, Arrow, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { DrawingShape } from "@/lib/api";

type DrawingTool = "freehand" | "circle" | "arrow" | "line" | "eraser";

interface DrawingCanvasProps {
  imageUrl: string;
  initialShapes?: DrawingShape[];
  onSave: (shapes: DrawingShape[]) => void;
  onClose: () => void;
  width: number;
  height: number;
}

const COLORS = ["#FF0000", "#0066FF", "#FFCC00", "#FFFFFF", "#00CC66"];
const MAX_SHAPES = 50;

// % ↔ px conversion
const toPx = (pct: number, total: number) => (pct / 100) * total;
const toPct = (px: number, total: number) => (px / total) * 100;

// Simplify freehand points (Douglas-Peucker lite)
function simplifyPoints(points: number[], epsilon: number): number[] {
  if (points.length <= 6) return points; // 3 or fewer points

  const pts: [number, number][] = [];
  for (let i = 0; i < points.length; i += 2) {
    pts.push([points[i], points[i + 1]]);
  }

  function perpDist(p: [number, number], a: [number, number], b: [number, number]) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return Math.sqrt((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2);
    return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
  }

  function simplify(start: number, end: number): number[] {
    let maxD = 0, idx = start;
    for (let i = start + 1; i < end; i++) {
      const d = perpDist(pts[i], pts[start], pts[end]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > epsilon) {
      const left = simplify(start, idx);
      const right = simplify(idx, end);
      return [...left.slice(0, -2), ...right];
    }
    return [pts[start][0], pts[start][1], pts[end][0], pts[end][1]];
  }

  return simplify(0, pts.length - 1);
}

export default function DrawingCanvas({
  imageUrl,
  initialShapes = [],
  onSave,
  onClose,
  width,
  height,
}: DrawingCanvasProps) {
  const [tool, setTool] = useState<DrawingTool>("freehand");
  const [color, setColor] = useState("#FF0000");
  const [strokeWidth] = useState(3);
  const [shapes, setShapes] = useState<DrawingShape[]>(initialShapes);
  const [undoStack, setUndoStack] = useState<DrawingShape[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingShape[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [previewEnd, setPreviewEnd] = useState<[number, number] | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Load background image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBgImage(img);
    img.src = imageUrl;
  }, [imageUrl]);

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-19), shapes]); // keep max 20
    setRedoStack([]);
  }, [shapes]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    setRedoStack((prev) => [...prev, shapes]);
    setShapes(undoStack[undoStack.length - 1]);
    setUndoStack((prev) => prev.slice(0, -1));
  }, [undoStack, shapes]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    setUndoStack((prev) => [...prev, shapes]);
    setShapes(redoStack[redoStack.length - 1]);
    setRedoStack((prev) => prev.slice(0, -1));
  }, [redoStack, shapes]);

  const getPos = useCallback(
    (e: KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return null;
      return { x: pos.x, y: pos.y };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>) => {
      if (tool === "eraser") {
        // Find clicked shape and remove it
        const target = e.target;
        const id = target.attrs?.id;
        if (id && id.startsWith("shape-")) {
          pushUndo();
          setShapes((prev) => prev.filter((s) => s.id !== id.replace("shape-", "")));
        }
        return;
      }

      if (shapes.length >= MAX_SHAPES) return;

      const pos = getPos(e);
      if (!pos) return;

      setIsDrawing(true);
      pushUndo();

      if (tool === "freehand") {
        setCurrentPoints([toPct(pos.x, width), toPct(pos.y, height)]);
      } else {
        setStartPoint([pos.x, pos.y]);
        setPreviewEnd([pos.x, pos.y]);
      }
    },
    [tool, shapes.length, getPos, pushUndo, width, height]
  );

  const handlePointerMove = useCallback(
    (e: KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>) => {
      if (!isDrawing) return;
      const pos = getPos(e);
      if (!pos) return;

      if (tool === "freehand") {
        setCurrentPoints((prev) => [
          ...prev,
          toPct(pos.x, width),
          toPct(pos.y, height),
        ]);
      } else {
        setPreviewEnd([pos.x, pos.y]);
      }
    },
    [isDrawing, tool, getPos, width, height]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const id = crypto.randomUUID().slice(0, 8);

    if (tool === "freehand" && currentPoints.length >= 4) {
      const simplified = simplifyPoints(currentPoints, 0.5);
      setShapes((prev) => [
        ...prev,
        { id, type: "freehand", points: simplified, stroke: color, strokeWidth },
      ]);
    } else if (startPoint && previewEnd) {
      const [sx, sy] = startPoint;
      const [ex, ey] = previewEnd;

      if (tool === "circle") {
        const cx = toPct((sx + ex) / 2, width);
        const cy = toPct((sy + ey) / 2, height);
        const rx = Math.abs(ex - sx) / 2;
        const ry = Math.abs(ey - sy) / 2;
        const r = toPct(Math.max(rx, ry), Math.min(width, height));
        if (r > 0.5) {
          setShapes((prev) => [
            ...prev,
            { id, type: "circle", x: cx, y: cy, radius: r, stroke: color, strokeWidth },
          ]);
        }
      } else if (tool === "arrow" || tool === "line") {
        const pts = [toPct(sx, width), toPct(sy, height), toPct(ex, width), toPct(ey, height)];
        const dist = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
        if (dist > 5) {
          setShapes((prev) => [
            ...prev,
            { id, type: tool, points: pts, stroke: color, strokeWidth },
          ]);
        }
      }
    }

    setCurrentPoints([]);
    setStartPoint(null);
    setPreviewEnd(null);
  }, [isDrawing, tool, currentPoints, startPoint, previewEnd, color, strokeWidth, width, height]);

  const handleSave = useCallback(() => {
    onSave(shapes);
  }, [shapes, onSave]);

  // Render shapes
  const renderShape = (shape: DrawingShape) => {
    const key = `shape-${shape.id}`;
    const common = { id: key, key };

    switch (shape.type) {
      case "freehand":
        return shape.points ? (
          <Line
            {...common}
            points={shape.points.map((p, i) =>
              i % 2 === 0 ? toPx(p, width) : toPx(p, height)
            )}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            lineCap="round"
            lineJoin="round"
            tension={0.3}
          />
        ) : null;
      case "circle":
        return shape.x != null && shape.y != null && shape.radius != null ? (
          <Circle
            {...common}
            x={toPx(shape.x, width)}
            y={toPx(shape.y, height)}
            radius={toPx(shape.radius, Math.min(width, height))}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            fill="transparent"
          />
        ) : null;
      case "arrow":
        return shape.points ? (
          <Arrow
            {...common}
            points={shape.points.map((p, i) =>
              i % 2 === 0 ? toPx(p, width) : toPx(p, height)
            )}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            fill={shape.stroke}
            pointerLength={8}
            pointerWidth={6}
          />
        ) : null;
      case "line":
        return shape.points ? (
          <Line
            {...common}
            points={shape.points.map((p, i) =>
              i % 2 === 0 ? toPx(p, width) : toPx(p, height)
            )}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            lineCap="round"
          />
        ) : null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
        {/* Tools */}
        <div className="flex gap-1 mr-2">
          {([
            ["freehand", "M3 17l6-6 4 4 8-8"],
            ["circle", "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0"],
            ["arrow", "M5 12h14M12 5l7 7-7 7"],
            ["line", "M5 12h14"],
            ["eraser", "M20 20H7L3 16l9-9 8 8-4 4"],
          ] as [DrawingTool, string][]).map(([t, path]) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs ${
                tool === t
                  ? "bg-accent text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={path} />
              </svg>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-border mx-1" />

        {/* Colors */}
        <div className="flex gap-1 mr-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full border-2 ${
                color === c ? "border-foreground scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-border mx-1" />

        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted text-muted-foreground disabled:opacity-30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.69 3L3 13" /></svg>
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted text-muted-foreground disabled:opacity-30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.69 3L21 13" /></svg>
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden touch-none">
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          style={{ touchAction: "none" }}
        >
          <Layer>
            {bgImage && (
              <KonvaImage image={bgImage} width={width} height={height} />
            )}
          </Layer>
          <Layer>
            {shapes.map(renderShape)}

            {/* Live preview for freehand */}
            {isDrawing && tool === "freehand" && currentPoints.length >= 4 && (
              <Line
                points={currentPoints.map((p, i) =>
                  i % 2 === 0 ? toPx(p, width) : toPx(p, height)
                )}
                stroke={color}
                strokeWidth={strokeWidth}
                lineCap="round"
                lineJoin="round"
                tension={0.3}
                opacity={0.6}
              />
            )}

            {/* Live preview for shapes */}
            {isDrawing && startPoint && previewEnd && tool === "circle" && (
              <Circle
                x={(startPoint[0] + previewEnd[0]) / 2}
                y={(startPoint[1] + previewEnd[1]) / 2}
                radius={Math.max(
                  Math.abs(previewEnd[0] - startPoint[0]) / 2,
                  Math.abs(previewEnd[1] - startPoint[1]) / 2
                )}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="transparent"
                opacity={0.6}
              />
            )}
            {isDrawing && startPoint && previewEnd && tool === "arrow" && (
              <Arrow
                points={[...startPoint, ...previewEnd]}
                stroke={color}
                strokeWidth={strokeWidth}
                fill={color}
                pointerLength={8}
                pointerWidth={6}
                opacity={0.6}
              />
            )}
            {isDrawing && startPoint && previewEnd && tool === "line" && (
              <Line
                points={[...startPoint, ...previewEnd]}
                stroke={color}
                strokeWidth={strokeWidth}
                lineCap="round"
                opacity={0.6}
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* Bottom actions */}
      <div className="flex gap-3 px-4 py-3 border-t border-border">
        <button
          onClick={onClose}
          className="flex-1 py-3 border border-border text-muted-foreground rounded-xl text-sm font-medium"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-3 bg-accent text-white rounded-xl text-sm font-medium"
        >
          저장
        </button>
      </div>
    </div>
  );
}
