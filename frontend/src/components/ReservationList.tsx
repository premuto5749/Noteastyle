"use client";

import { useMemo } from "react";
import { ReservationCard } from "./ReservationCard";
import type { Reservation } from "@/lib/api";

interface ReservationListProps {
  reservations: Reservation[];
  loading: boolean;
  expandedId: string | null;
  onToggle: (id: string) => void;
  onVoiceMemo: (reservation: Reservation) => void;
  onCamera: (reservation: Reservation) => void;
  onDetail: (reservation: Reservation) => void;
  isToday: boolean;
}

export function ReservationList({
  reservations,
  loading,
  expandedId,
  onToggle,
  onVoiceMemo,
  onCamera,
  onDetail,
  isToday,
}: ReservationListProps) {
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

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 bg-gray-100 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">📅</div>
        <p className="text-gray-400 text-sm">오늘 예약이 없습니다</p>
        <p className="text-gray-300 text-xs mt-1">예약을 등록하세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reservations.map((reservation, index) => (
        <div key={reservation.id}>
          {/* Now line before this card */}
          {isToday && nowInsertIndex === index && <NowLine />}
          <ReservationCard
            reservation={reservation}
            isExpanded={expandedId === reservation.id}
            onToggle={() => onToggle(reservation.id)}
            onVoiceMemo={() => onVoiceMemo(reservation)}
            onCamera={() => onCamera(reservation)}
            onDetail={() => onDetail(reservation)}
          />
        </div>
      ))}
      {/* Now line after all cards */}
      {isToday && nowInsertIndex === reservations.length && <NowLine />}
    </div>
  );
}

function NowLine() {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
      <div className="flex-1 h-px bg-red-400" />
      <span className="text-[10px] font-medium text-red-500 shrink-0">
        지금
      </span>
      <div className="flex-1 h-px bg-red-400" />
      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
    </div>
  );
}
