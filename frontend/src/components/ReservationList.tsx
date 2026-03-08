"use client";

import { useMemo, useRef, useEffect, forwardRef } from "react";
import { ReservationCard } from "./ReservationCard";
import type { Reservation } from "@/lib/api";

interface ReservationListProps {
  reservations: Reservation[];
  loading: boolean;
  onVoiceMemo: (reservation: Reservation) => void;
  onCamera: (reservation: Reservation) => void;
  onDetail: (reservation: Reservation) => void;
  isToday: boolean;
}

export function ReservationList({
  reservations,
  loading,
  onVoiceMemo,
  onCamera,
  onDetail,
  isToday,
}: ReservationListProps) {
  const nowLineRef = useRef<HTMLDivElement>(null);

  // Current time line position
  const nowTimeStr = useMemo(() => {
    if (!isToday) return null;
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }, [isToday]);

  // Find where to insert the "now" line
  const nowInsertIndex = useMemo(() => {
    if (!nowTimeStr) return -1;
    const idx = reservations.findIndex(
      (r) => r.scheduled_time.slice(0, 5) > nowTimeStr
    );
    return idx === -1 ? reservations.length : idx;
  }, [reservations, nowTimeStr]);

  // Auto-scroll to "now" line on today's view after loading
  useEffect(() => {
    if (isToday && nowInsertIndex >= 0 && reservations.length > 0) {
      const timer = setTimeout(() => {
        nowLineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isToday, nowInsertIndex, reservations.length]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-muted rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-subtle">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4" />
            <path d="M8 2v4" />
            <path d="M3 10h18" />
          </svg>
        </div>
        <p className="text-muted-foreground text-base font-medium">예약이 없습니다</p>
        <p className="text-subtle text-sm mt-1">하단 + 버튼으로 예약을 등록하세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {reservations.map((reservation, index) => (
        <div key={reservation.id}>
          {/* Now line before this card */}
          {isToday && nowInsertIndex === index && <NowLine ref={nowLineRef} />}
          <ReservationCard
            reservation={reservation}
            onVoiceMemo={() => onVoiceMemo(reservation)}
            onCamera={() => onCamera(reservation)}
            onDetail={() => onDetail(reservation)}
          />
        </div>
      ))}
      {/* Now line after all cards */}
      {isToday && nowInsertIndex === reservations.length && <NowLine ref={nowLineRef} />}
    </div>
  );
}

const NowLine = forwardRef<HTMLDivElement>(function NowLine(_props, ref) {
  return (
    <div ref={ref} className="flex items-center gap-2 py-1.5">
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 shadow-sm shadow-red-500/30" />
      <div className="flex-1 h-px bg-red-400/60" />
      <span className="text-[11px] font-semibold text-red-500 shrink-0">
        지금
      </span>
      <div className="flex-1 h-px bg-red-400/60" />
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 shadow-sm shadow-red-500/30" />
    </div>
  );
});
