"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DayCalendarStrip } from "@/components/DayCalendarStrip";
import { ReservationList } from "@/components/ReservationList";
import {
  getReservations,
  startTreatmentFromReservation,
  type Reservation,
} from "@/lib/api";

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatHeaderDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}/${d.getDate()} ${dayLabels[d.getDay()]}`;
}

export default function HomePage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isToday = selectedDate === formatDate(new Date());

  const loadReservations = useCallback(async (date: string) => {
    setLoading(true);
    setExpandedId(null);
    try {
      const data = await getReservations(date);
      setReservations(data);
    } catch {
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations(selectedDate);
  }, [selectedDate, loadReservations]);

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Ensure treatment exists, then navigate
  const ensureTreatment = useCallback(
    async (reservation: Reservation): Promise<string | null> => {
      if (reservation.treatment_id) {
        return reservation.treatment_id;
      }
      try {
        const result = await startTreatmentFromReservation(reservation.id);
        // Refresh list to reflect status change
        loadReservations(selectedDate);
        return result.treatment.id;
      } catch {
        alert("시술 시작에 실패했습니다.");
        return null;
      }
    },
    [selectedDate, loadReservations]
  );

  const handleVoiceMemo = useCallback(
    async (reservation: Reservation) => {
      const treatmentId = await ensureTreatment(reservation);
      if (treatmentId) {
        router.push(`/treatments/${treatmentId}`);
      }
    },
    [ensureTreatment, router]
  );

  const handleCamera = useCallback(
    async (reservation: Reservation) => {
      const treatmentId = await ensureTreatment(reservation);
      if (treatmentId) {
        router.push(`/treatments/${treatmentId}/capture?type=before`);
      }
    },
    [ensureTreatment, router]
  );

  const handleDetail = useCallback(
    async (reservation: Reservation) => {
      const treatmentId = await ensureTreatment(reservation);
      if (treatmentId) {
        router.push(`/treatments/${treatmentId}`);
      }
    },
    [ensureTreatment, router]
  );

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Note-a-Style</h1>
        <span className="text-sm text-gray-500 font-medium">
          {formatHeaderDate(selectedDate)}
        </span>
      </div>

      {/* Calendar strip */}
      <div className="sticky top-0 z-10">
        <DayCalendarStrip
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
      </div>

      {/* Reservation list */}
      <div className="px-4 mt-3">
        <ReservationList
          reservations={reservations}
          loading={loading}
          expandedId={expandedId}
          onToggle={handleToggle}
          onVoiceMemo={handleVoiceMemo}
          onCamera={handleCamera}
          onDetail={handleDetail}
          isToday={isToday}
        />
      </div>

      {/* Walk-in FAB */}
      <Link
        href="/reservation"
        className="fixed bottom-20 right-4 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40"
        style={{ maxWidth: "calc((480px - 32px))", right: "max(16px, calc((100vw - 480px) / 2 + 16px))" }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>
    </div>
  );
}
