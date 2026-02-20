"use client";

import type { Reservation } from "@/lib/api";

interface ReservationCardProps {
  reservation: Reservation;
  isExpanded: boolean;
  onToggle: () => void;
  onVoiceMemo: () => void;
  onCamera: () => void;
  onDetail: () => void;
}

const STATUS_STYLES: Record<
  string,
  { border: string; bg: string; text: string; label: string }
> = {
  scheduled: {
    border: "border-l-hint",
    bg: "bg-card",
    text: "text-muted-foreground",
    label: "예정",
  },
  in_progress: {
    border: "border-l-blue-500",
    bg: "bg-info-bg",
    text: "text-info-foreground",
    label: "진행중",
  },
  completed: {
    border: "border-l-green-500",
    bg: "bg-success-bg",
    text: "text-success-foreground",
    label: "완료",
  },
  cancelled: {
    border: "border-l-hint",
    bg: "bg-surface",
    text: "text-subtle",
    label: "취소",
  },
  no_show: {
    border: "border-l-hint",
    bg: "bg-surface",
    text: "text-subtle",
    label: "노쇼",
  },
};

export function ReservationCard({
  reservation,
  isExpanded,
  onToggle,
  onVoiceMemo,
  onCamera,
  onDetail,
}: ReservationCardProps) {
  const r = reservation;
  const style = STATUS_STYLES[r.status] ?? STATUS_STYLES.scheduled;
  const isCancelledOrNoShow =
    r.status === "cancelled" || r.status === "no_show";

  const timeStr = r.scheduled_time.slice(0, 5); // HH:MM

  return (
    <div
      className={`border border-border rounded-xl overflow-hidden border-l-4 ${style.border} ${style.bg}`}
    >
      {/* Collapsed header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
        disabled={isCancelledOrNoShow}
      >
        {/* Time */}
        <span
          className={`text-sm font-mono font-semibold shrink-0 w-12 ${
            isCancelledOrNoShow ? "text-subtle line-through" : "text-foreground"
          }`}
        >
          {timeStr}
        </span>

        {/* Customer + Service */}
        <div className="flex-1 min-w-0">
          <span
            className={`text-sm font-medium ${
              isCancelledOrNoShow
                ? "text-subtle line-through"
                : "text-foreground"
            }`}
          >
            {r.customer?.name ?? "알 수 없음"}
          </span>
          {r.service_type && (
            <span
              className={`text-sm ml-2 ${
                isCancelledOrNoShow ? "text-hint" : "text-muted-foreground"
              }`}
            >
              {r.service_type}
            </span>
          )}
        </div>

        {/* Duration */}
        <span className="text-xs text-subtle shrink-0">
          {r.estimated_duration_minutes}분
        </span>

        {/* Status indicator */}
        {r.status === "completed" && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {r.status !== "completed" && !isCancelledOrNoShow && (
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              r.status === "in_progress" ? "bg-blue-500" : "bg-hint"
            }`}
          />
        )}
      </button>

      {/* Expanded actions */}
      {isExpanded && !isCancelledOrNoShow && (
        <div className="px-4 pb-3 pt-0">
          <div className="flex gap-2">
            <button
              onClick={onVoiceMemo}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-muted rounded-lg text-sm font-medium text-foreground active:scale-95 transition-transform"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              녹음
            </button>
            <button
              onClick={onCamera}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-muted rounded-lg text-sm font-medium text-foreground active:scale-95 transition-transform"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              촬영
            </button>
            <button
              onClick={onDetail}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-muted rounded-lg text-sm font-medium text-foreground active:scale-95 transition-transform"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" />
                <path d="9 14l2 2 4-4" />
              </svg>
              상세
            </button>
          </div>
          {r.notes && (
            <p className="text-xs text-subtle mt-2 px-1">{r.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
