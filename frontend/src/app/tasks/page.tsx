"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { DayCalendarStrip } from "@/components/DayCalendarStrip";
import { MonthlyCalendar } from "@/components/MonthlyCalendar";
import { ReservationList } from "@/components/ReservationList";
import { VoiceNote } from "@/components/VoiceNote";
import { CameraDrawer } from "@/components/CameraDrawer";
import { useShopApi } from "@/hooks/useShopApi";
import { type Reservation } from "@/lib/api";

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function TasksPage() {
  const router = useRouter();
  const { api, isReady } = useShopApi();
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [voiceNoteReservation, setVoiceNoteReservation] = useState<Reservation | null>(null);
  const [cameraReservation, setCameraReservation] = useState<Reservation | null>(null);

  // Monthly calendar state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [monthCounts, setMonthCounts] = useState<Record<string, number>>({});
  const fetchingMonth = useRef<string>("");

  // Week counts for the strip
  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({});

  const isToday = selectedDate === formatDate(new Date());

  const loadReservations = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const data = await api.getReservations(date);
      setReservations(data);
    } catch {
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Load week counts when selected date changes
  const loadWeekCounts = useCallback(async (centerDate: string) => {
    const d = new Date(centerDate + "T00:00:00");
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    try {
      const data = await api.getReservationCounts(month);
      setWeekCounts(prev => ({ ...prev, ...data }));
    } catch {
      // ignore
    }
  }, [api]);

  useEffect(() => {
    if (!isReady) return;
    loadReservations(selectedDate);
    loadWeekCounts(selectedDate);
  }, [selectedDate, loadReservations, loadWeekCounts, isReady]);

  // Fetch monthly counts when calendar month changes
  const loadMonthCounts = useCallback(async (month: string) => {
    if (fetchingMonth.current === month) return;
    fetchingMonth.current = month;
    try {
      const data = await api.getReservationCounts(month);
      setMonthCounts(data);
    } catch {
      setMonthCounts({});
    }
  }, [api]);

  useEffect(() => {
    if (!isReady || !calendarOpen) return;
    loadMonthCounts(calendarMonth);
  }, [calendarMonth, calendarOpen, loadMonthCounts, isReady]);

  const handleCalendarOpen = useCallback(() => {
    const d = new Date(selectedDate + "T00:00:00");
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setCalendarMonth(month);
    fetchingMonth.current = ""; // force re-fetch
    setCalendarOpen(true);
  }, [selectedDate]);

  // Ensure treatment exists, then return its ID
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

  const handleVoiceMemo = useCallback((reservation: Reservation) => {
    setVoiceNoteReservation(reservation);
  }, []);

  const handleCamera = useCallback((reservation: Reservation) => {
    setCameraReservation(reservation);
  }, []);

  const handleCameraAction = useCallback(
    async (type: "gallery" | "video" | "camera") => {
      if (!cameraReservation) return;
      const treatmentId = await ensureTreatment(cameraReservation);
      setCameraReservation(null);
      if (treatmentId) {
        const captureType = type === "gallery" ? "before" : type === "video" ? "before" : "before";
        router.push(`/treatments/${treatmentId}/capture?type=${captureType}&source=${type}`);
      }
    },
    [cameraReservation, ensureTreatment, router]
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
      {/* Calendar strip (sticky below header) */}
      <div className="sticky top-12 z-10">
        <DayCalendarStrip
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onCalendarOpen={handleCalendarOpen}
          reservationCounts={weekCounts}
        />
      </div>

      {/* Reservation list */}
      <div className="px-4 mt-3">
        <ReservationList
          reservations={reservations}
          loading={loading}
          onVoiceMemo={handleVoiceMemo}
          onCamera={handleCamera}
          onDetail={handleDetail}
          isToday={isToday}
        />
      </div>

      {/* Monthly Calendar */}
      <MonthlyCalendar
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        currentMonth={calendarMonth}
        onMonthChange={setCalendarMonth}
        counts={monthCounts}
      />

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

      {/* Camera Drawer */}
      <CameraDrawer
        isOpen={!!cameraReservation}
        onClose={() => setCameraReservation(null)}
        onSelect={handleCameraAction}
      />
    </div>
  );
}
