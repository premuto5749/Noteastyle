"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DayCalendarStrip } from "@/components/DayCalendarStrip";
import { ReservationList } from "@/components/ReservationList";
import { VoiceNote } from "@/components/VoiceNote";
import { useShopApi } from "@/hooks/useShopApi";
import { type Reservation } from "@/lib/api";

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

export default function TasksPage() {
  const router = useRouter();
  const { api, isReady } = useShopApi();
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voiceNoteReservation, setVoiceNoteReservation] = useState<Reservation | null>(null);

  const isToday = selectedDate === formatDate(new Date());

  const loadReservations = useCallback(async (date: string) => {
    setLoading(true);
    setExpandedId(null);
    try {
      const data = await api.getReservations(date);
      setReservations(data);
    } catch {
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!isReady) return;
    loadReservations(selectedDate);
  }, [selectedDate, loadReservations, isReady]);

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
        const result = await api.startTreatmentFromReservation(reservation.id);
        loadReservations(selectedDate);
        return result.treatment.id;
      } catch {
        alert("시술 시작에 실패했습니다.");
        return null;
      }
    },
    [selectedDate, loadReservations, api]
  );

  const handleVoiceMemo = useCallback(
    (reservation: Reservation) => {
      setVoiceNoteReservation(reservation);
    },
    []
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
      {/* Date indicator + Calendar strip */}
      <div className="sticky top-12 z-10">
        <div className="bg-card px-4 py-2 flex items-center justify-end">
          <span className="text-sm text-muted-foreground font-medium">
            {formatHeaderDate(selectedDate)}
          </span>
        </div>
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
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40"
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

      {/* VoiceNote Modal */}
      {voiceNoteReservation && (
        <VoiceNote
          reservation={voiceNoteReservation}
          onComplete={() => {
            setVoiceNoteReservation(null);
            loadReservations(selectedDate);
          }}
          onClose={() => setVoiceNoteReservation(null)}
        />
      )}
    </div>
  );
}
