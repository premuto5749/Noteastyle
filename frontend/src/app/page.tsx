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
      const [allReservations, treatments] = await Promise.all([
        api.getReservations(today),
        api.getTreatments(undefined, undefined, { compact: true }),
      ]);

      setTodayCount(allReservations.length);
      const active = allReservations.filter((r) => r.status === "in_progress");
      setInProgress(active);
      setRecentTreatments(treatments.slice(0, 8));
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
      {loading ? (
        /* Loading skeleton */
        <div className="px-4 pt-4 space-y-4">
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
                <div className="w-10 h-2 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Stories Row — Recent Treatments */}
          {recentTreatments.length > 0 && (
            <div className="pt-3 pb-1">
              <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide">
                {recentTreatments.map((t) => {
                  const photo = getRepresentativePhoto(t.photos || []);
                  const customerName = t.customer?.name;
                  return (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/treatments/${t.id}`)}
                      className="flex flex-col items-center gap-1 flex-shrink-0 active:scale-95 transition-transform"
                    >
                      <div className="w-[60px] h-[60px] rounded-full p-[2px] bg-gradient-to-br from-accent to-purple-500">
                        <div className="w-full h-full rounded-full overflow-hidden bg-background p-[2px]">
                          <div className="w-full h-full rounded-full overflow-hidden bg-muted relative">
                            {photo ? (
                              <Image
                                src={photo.face_swapped_url || photo.mosaic_url || photo.photo_url}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-subtle">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <rect x="3" y="3" width="18" height="18" rx="2" />
                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                  <path d="M21 15l-5-5L5 21" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground max-w-[60px] truncate">
                        {customerName || SERVICE_LABELS[t.service_type] || "시술"}
                      </span>
                    </button>
                  );
                })}
                {/* "More" circle */}
                <Link
                  href="/treatments"
                  className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                  <div className="w-[60px] h-[60px] rounded-full border-2 border-dashed border-border flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-subtle">
                      <path d="M5 12h14M12 5v14" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-muted-foreground">전체보기</span>
                </Link>
              </div>
            </div>
          )}

          <div className="px-4 mt-3">
            {/* In-Progress Reservations */}
            {inProgress.length > 0 && (
              <div className="mb-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  진행 중
                </h2>
                <div className="space-y-3">
                  {inProgress.map((r) => (
                    <div
                      key={r.id}
                      className="card-elevated p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                            <span className="text-accent text-xs font-bold">
                              {r.scheduled_time?.slice(0, 5)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {r.customer?.name ?? "알 수 없음"}
                            </p>
                            {r.service_type && (
                              <p className="text-xs text-muted-foreground">
                                {r.service_type}{r.service_detail && ` · ${r.service_detail}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent font-semibold rounded-full">
                          진행중
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVoiceMemo(r)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-surface rounded-xl text-sm font-medium text-foreground active:scale-[0.97] transition-transform"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          </svg>
                          녹음
                        </button>
                        <button
                          onClick={() => handleCamera(r)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-surface rounded-xl text-sm font-medium text-foreground active:scale-[0.97] transition-transform"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                          촬영
                        </button>
                        <button
                          onClick={() => handleDetail(r)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-medium active:scale-[0.97] transition-transform"
                        >
                          상세
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/tasks"
                  className="block mt-3 text-center text-sm text-accent font-medium py-2"
                >
                  오늘 예약 {todayCount}건 &rarr;
                </Link>
              </div>
            )}

            {/* No in-progress: show feed of recent treatments */}
            {inProgress.length === 0 && (
              <div>
                {recentTreatments.length > 0 ? (
                  <>
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      최근 시술
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                      {recentTreatments.slice(0, 6).map((t) => {
                        const photo = getRepresentativePhoto(t.photos || []);
                        const customerName = t.customer?.name;
                        const serviceLabel = SERVICE_LABELS[t.service_type] || t.service_type;

                        return (
                          <button
                            key={t.id}
                            onClick={() => router.push(`/treatments/${t.id}`)}
                            className="card-elevated overflow-hidden text-left active:scale-[0.97] transition-transform"
                          >
                            {photo ? (
                              <div className="relative aspect-[4/3] bg-muted">
                                <Image
                                  src={photo.face_swapped_url || photo.mosaic_url || photo.photo_url}
                                  alt={serviceLabel}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 480px) 50vw, 240px"
                                />
                              </div>
                            ) : (
                              <div className="aspect-[4/3] bg-surface flex items-center justify-center">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-hint">
                                  <rect x="3" y="3" width="18" height="18" rx="2" />
                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                  <path d="M21 15l-5-5L5 21" />
                                </svg>
                              </div>
                            )}
                            <div className="p-2.5">
                              {customerName && (
                                <p className="text-sm font-medium text-foreground truncate">
                                  {customerName}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground truncate">
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
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-surface mx-auto mb-4 flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-subtle">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground text-sm">아직 기록이 없습니다</p>
                    <p className="text-subtle text-xs mt-1">첫 시술을 기록해보세요</p>
                  </div>
                )}

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
        </>
      )}

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
