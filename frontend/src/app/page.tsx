"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useShopApi } from "@/hooks/useShopApi";

const VoiceNote = dynamic(
  () => import("@/components/VoiceNote").then((m) => ({ default: m.VoiceNote })),
  { ssr: false }
);
import {
  type Reservation,
  type Treatment,
  type TreatmentPhoto,
} from "@/lib/api";

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const SERVICE_LABELS: Record<string, string> = {
  cut: "커트",
  color: "염색",
  perm: "펌",
  treatment: "트리트먼트",
  bleach: "블리치",
  scalp: "두피관리",
};

function getRepresentativePhoto(photos: TreatmentPhoto[]): TreatmentPhoto | null {
  const nonSource = photos.filter((p) => p.photo_type !== "source");
  return (
    nonSource.find((p) => p.photo_type === "after") ||
    nonSource.find((p) => p.photo_type === "during") ||
    nonSource.find((p) => p.photo_type === "before") ||
    nonSource[0] ||
    null
  );
}

export default function HomePage() {
  const router = useRouter();
  const { api, isReady } = useShopApi();

  const [inProgress, setInProgress] = useState<Reservation[]>([]);
  const [recentTreatments, setRecentTreatments] = useState<Treatment[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voiceNoteReservation, setVoiceNoteReservation] = useState<Reservation | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const today = formatDate(new Date());

      // 병렬 fetch: reservations + treatments 동시 호출
      const [allReservations, treatments] = await Promise.all([
        api.getReservations(today),
        api.getTreatments(undefined, undefined, { compact: true }),
      ]);

      setTodayCount(allReservations.length);

      const active = allReservations.filter((r) => r.status === "in_progress");
      setInProgress(active);

      if (active.length === 0) {
        setRecentTreatments(treatments.slice(0, 5));
      } else {
        setRecentTreatments([]);
      }
    } catch {
      setInProgress([]);
      setRecentTreatments([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!isReady) return;
    loadData();
  }, [loadData, isReady]);

  const ensureTreatment = useCallback(
    async (reservation: Reservation): Promise<string | null> => {
      if (reservation.treatment_id) return reservation.treatment_id;
      try {
        const result = await api.startTreatmentFromReservation(reservation.id);
        loadData();
        return result.treatment.id;
      } catch {
        alert("시술 시작에 실패했습니다.");
        return null;
      }
    },
    [api, loadData]
  );

  const handleVoiceMemo = useCallback((reservation: Reservation) => {
    setVoiceNoteReservation(reservation);
  }, []);

  const handleCamera = useCallback(
    async (reservation: Reservation) => {
      const treatmentId = await ensureTreatment(reservation);
      if (treatmentId) router.push(`/treatments/${treatmentId}/capture?type=before`);
    },
    [ensureTreatment, router]
  );

  const handleDetail = useCallback(
    async (reservation: Reservation) => {
      const treatmentId = await ensureTreatment(reservation);
      if (treatmentId) router.push(`/treatments/${treatmentId}`);
    },
    [ensureTreatment, router]
  );

  return (
    <div className="pb-20">
      <div className="px-4 mt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : inProgress.length > 0 ? (
          /* ===== A. In-progress reservations ===== */
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3">현재 작업</h2>
            <div className="space-y-3">
              {inProgress.map((r) => (
                <div
                  key={r.id}
                  className="bg-card border border-border rounded-xl p-4 border-l-4 border-l-blue-500"
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-mono font-semibold text-foreground mr-2">
                        {r.scheduled_time?.slice(0, 5)}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {r.customer?.name ?? "알 수 없음"} 고객님
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-info-bg text-info-foreground font-bold rounded">
                      진행중
                    </span>
                  </div>
                  {r.service_type && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {r.service_type}
                      {r.service_detail && ` · ${r.service_detail}`}
                    </p>
                  )}

                  {/* Action buttons — always visible */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVoiceMemo(r)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-muted rounded-lg text-sm font-medium text-foreground active:scale-95 transition-transform"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                      녹음
                    </button>
                    <button
                      onClick={() => handleCamera(r)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-muted rounded-lg text-sm font-medium text-foreground active:scale-95 transition-transform"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      촬영
                    </button>
                    <button
                      onClick={() => handleDetail(r)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-muted rounded-lg text-sm font-medium text-foreground active:scale-95 transition-transform"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                        <rect x="8" y="2" width="8" height="4" rx="1" />
                        <path d="9 14l2 2 4-4" />
                      </svg>
                      상세
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Today's reservations link */}
            <Link
              href="/tasks"
              className="block mt-4 text-center text-sm text-accent font-medium py-2"
            >
              오늘 예약 {todayCount}건 &rarr;
            </Link>
          </div>
        ) : (
          /* ===== B. No in-progress — show recent treatments ===== */
          <div>
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm">진행 중인 작업이 없습니다</p>
            </div>

            {recentTreatments.length > 0 && (
              <>
                <h2 className="text-sm font-bold text-foreground mb-3">최근 작업</h2>
                <div className="grid grid-cols-2 gap-3">
                  {recentTreatments.map((t) => {
                    const photo = getRepresentativePhoto(t.photos || []);
                    const customerName = t.customer?.name;
                    const serviceLabel = SERVICE_LABELS[t.service_type] || t.service_type;

                    return (
                      <button
                        key={t.id}
                        onClick={() => router.push(`/treatments/${t.id}`)}
                        className="bg-card rounded-xl overflow-hidden shadow-sm border border-border text-left active:scale-[0.98] transition-transform"
                      >
                        {photo ? (
                          <div className="relative aspect-square bg-muted">
                            <Image
                              src={photo.photo_url}
                              alt={serviceLabel}
                              fill
                              className="object-cover"
                              sizes="(max-width: 480px) 50vw, 240px"
                            />
                          </div>
                        ) : (
                          <div className="aspect-square bg-muted flex items-center justify-center">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-hint">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                          </div>
                        )}
                        <div className="p-2">
                          {customerName && (
                            <p className="text-xs font-medium text-foreground truncate">
                              {customerName}
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground truncate">
                            {serviceLabel}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Link
                  href="/treatments"
                  className="block mt-4 text-center text-sm text-accent font-medium py-2"
                >
                  더보기 &rarr;
                </Link>
              </>
            )}

            {/* Today's reservations link */}
            {todayCount > 0 && (
              <Link
                href="/tasks"
                className="block mt-2 text-center text-sm text-muted-foreground py-2"
              >
                오늘 예약 {todayCount}건 &rarr;
              </Link>
            )}
          </div>
        )}
      </div>

      {/* VoiceNote Modal */}
      {voiceNoteReservation && (
        <VoiceNote
          reservation={voiceNoteReservation}
          onComplete={() => {
            setVoiceNoteReservation(null);
            loadData();
          }}
          onClose={() => setVoiceNoteReservation(null)}
        />
      )}
    </div>
  );
}
