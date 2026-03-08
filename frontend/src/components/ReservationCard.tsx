"use client";

import type { Reservation } from "@/lib/api";

interface ReservationCardProps {
  reservation: Reservation;
  onVoiceMemo: () => void;
  onCamera: () => void;
  onDetail: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { border: string; bg: string; badge: string; badgeBg: string; label: string }
> = {
  scheduled: {
    border: "border-l-muted-foreground/40",
    bg: "bg-card",
    badge: "text-muted-foreground",
    badgeBg: "bg-muted",
    label: "예정",
  },
  in_progress: {
    border: "border-l-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    badge: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-100 dark:bg-blue-900/50",
    label: "진행중",
  },
  completed: {
    border: "border-l-green-500",
    bg: "bg-green-50 dark:bg-green-950/30",
    badge: "text-green-600 dark:text-green-400",
    badgeBg: "bg-green-100 dark:bg-green-900/50",
    label: "완료",
  },
  cancelled: {
    border: "border-l-hint",
    bg: "bg-surface",
    badge: "text-subtle",
    badgeBg: "bg-muted",
    label: "취소",
  },
  no_show: {
    border: "border-l-hint",
    bg: "bg-surface",
    badge: "text-subtle",
    badgeBg: "bg-muted",
    label: "노쇼",
  },
};

export function ReservationCard({
  reservation,
  onVoiceMemo,
  onCamera,
  onDetail,
}: ReservationCardProps) {
  const r = reservation;
  const config = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.scheduled;
  const isCancelledOrNoShow = r.status === "cancelled" || r.status === "no_show";
  const timeStr = r.scheduled_time.slice(0, 5);

  return (
    <div
      className={`border border-border rounded-2xl overflow-hidden border-l-4 ${config.border} ${config.bg} transition-colors`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Time */}
        <span
          className={`text-base font-mono font-bold shrink-0 w-14 ${
            isCancelledOrNoShow ? "text-subtle line-through" : "text-foreground"
          }`}
        >
          {timeStr}
        </span>

        {/* Customer + Service + Status */}
        <button
          onClick={onDetail}
          disabled={isCancelledOrNoShow}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-base font-semibold truncate ${
                isCancelledOrNoShow ? "text-subtle line-through" : "text-foreground"
              }`}
            >
              {r.customer?.name ?? "알 수 없음"}
            </span>
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${config.badgeBg} ${config.badge}`}
            >
              {config.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {r.service_type && (
              <span className={`text-sm ${isCancelledOrNoShow ? "text-hint" : "text-muted-foreground"}`}>
                {r.service_type}
              </span>
            )}
            <span className="text-xs text-subtle">
              {r.estimated_duration_minutes}분
            </span>
          </div>
          {r.notes && (
            <p className="text-xs text-subtle mt-1 truncate">{r.notes}</p>
          )}
          {/* Treatment summary */}
          {r.status === "completed" ? (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1 truncate">
              {r.treatment?.ai_summary || r.treatment?.customer_notes || "기록 추가 필요"}
            </p>
          ) : (r.status === "scheduled" || r.status === "in_progress") && r.last_treatment ? (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              최근: {r.last_treatment.service_type} ({r.last_treatment.date})
              {r.last_treatment.photo_count > 0 && ` 사진 ${r.last_treatment.photo_count}장`}
            </p>
          ) : null}
        </button>

        {/* Quick action icons - always visible */}
        {!isCancelledOrNoShow && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onVoiceMemo}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
              aria-label="음성 녹음"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
            <button
              onClick={onCamera}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
              aria-label="촬영"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
