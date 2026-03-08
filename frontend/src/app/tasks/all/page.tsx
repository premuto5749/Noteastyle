"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ReservationCard } from "@/components/ReservationCard";
import { VoiceNote } from "@/components/VoiceNote";
import { useShopApi } from "@/hooks/useShopApi";
import { type Reservation } from "@/lib/api";

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: "", label: "전체" },
  { value: "scheduled", label: "예정" },
  { value: "in_progress", label: "진행중" },
  { value: "completed", label: "완료" },
] as const;

function formatGroupDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${dayLabels[d.getDay()]}요일`;
}

function groupByDate(reservations: Reservation[]): Map<string, Reservation[]> {
  const map = new Map<string, Reservation[]>();
  for (const r of reservations) {
    const key = r.scheduled_date;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

export default function TasksAllPage() {
  const router = useRouter();
  const { api, isReady } = useShopApi();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [voiceNoteReservation, setVoiceNoteReservation] =
    useState<Reservation | null>(null);

  const loadReservations = useCallback(
    async (reset: boolean) => {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const skip = reset ? 0 : reservations.length;
      try {
        const data = await api.getReservations(
          undefined,
          statusFilter || undefined,
          skip,
          PAGE_SIZE
        );
        if (reset) {
          setReservations(data);
        } else {
          setReservations((prev) => [...prev, ...data]);
        }
        setHasMore(data.length >= PAGE_SIZE);
      } catch {
        if (reset) setReservations([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [api, statusFilter, reservations.length]
  );

  // Reset on filter change or api ready
  useEffect(() => {
    if (!isReady) return;
    loadReservations(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, statusFilter, api]);

  const ensureTreatment = useCallback(
    async (reservation: Reservation): Promise<string | null> => {
      if (reservation.treatment_id) return reservation.treatment_id;
      try {
        const result = await api.startTreatmentFromReservation(reservation.id);
        // Update this reservation in-place
        setReservations((prev) =>
          prev.map((r) =>
            r.id === reservation.id
              ? { ...r, treatment_id: result.treatment.id, status: result.reservation.status }
              : r
          )
        );
        return result.treatment.id;
      } catch {
        alert("시술 시작에 실패했습니다.");
        return null;
      }
    },
    [api]
  );

  const handleVoiceMemo = useCallback((reservation: Reservation) => {
    setVoiceNoteReservation(reservation);
  }, []);

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

  const grouped = groupByDate(reservations);

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-12 z-10 bg-background border-b border-border">
        <div className="px-4 pt-3 pb-2">
          <h1 className="text-lg font-bold text-foreground">작업 전체 보기</h1>
        </div>

        {/* Status filter chips */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">예약이 없습니다</p>
          </div>
        ) : (
          <>
            {Array.from(grouped.entries()).map(([date, items]) => (
              <div key={date} className="mb-4">
                {/* Date group header */}
                <div className="sticky top-[7.5rem] z-[5] bg-background py-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {formatGroupDate(date)}
                  </p>
                </div>

                {/* Reservation cards */}
                <div className="flex flex-col gap-2">
                  {items.map((r) => (
                    <ReservationCard
                      key={r.id}
                      reservation={r}
                      onVoiceMemo={() => handleVoiceMemo(r)}
                      onCamera={() => handleCamera(r)}
                      onDetail={() => handleDetail(r)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="py-4 flex justify-center">
                <button
                  onClick={() => loadReservations(false)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                      불러오는 중...
                    </span>
                  ) : (
                    "더보기"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* VoiceNote Modal */}
      {voiceNoteReservation && (
        <VoiceNote
          reservation={voiceNoteReservation}
          onComplete={() => {
            setVoiceNoteReservation(null);
            loadReservations(true);
          }}
          onClose={() => setVoiceNoteReservation(null)}
        />
      )}
    </div>
  );
}
