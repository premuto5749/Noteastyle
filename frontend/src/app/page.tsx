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

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

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
  const [nextUp, setNextUp] = useState<Reservation[]>([]);
  const [recentTreatments, setRecentTreatments] = useState<Treatment[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
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

      const completed = allReservations.filter((r) => r.status === "completed");
      setCompletedCount(completed.length);

      const confirmed = allReservations
        .filter((r) => r.status === "confirmed")
        .sort((a, b) => (a.scheduled_time || "").localeCompare(b.scheduled_time || ""));
      setNextUp(confirmed.slice(0, 3));

      setRecentTreatments(treatments.slice(0, 8));
    } catch {
      setInProgress([]);
      setNextUp([]);
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

  const handleStartTreatment = useCallback(
    async (reservation: Reservation) => {
      const treatmentId = await ensureTreatment(reservation);
      if (treatmentId) router.push(`/treatments/${treatmentId}`);
    },
    [ensureTreatment, router]
  );

  return (
    <div className="pb-20">
      {loading ? (
        <div className="px-4 pt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* === Section 1: Today Summary === */}
          <div className="px-4 pt-4 pb-2">
            <div className="grid grid-cols-3 gap-3">
              <Link
                href="/tasks"
                className="bg-surface rounded-2xl p-3.5 text-center active:scale-[0.97] transition-transform"
              >
                <p className="text-2xl font-bold text-foreground">{todayCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">오늘 예약</p>
              </Link>
              <div className="bg-surface rounded-2xl p-3.5 text-center">
                <p className="text-2xl font-bold text-accent">{inProgress.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">진행중</p>
              </div>
              <div className="bg-surface rounded-2xl p-3.5 text-center">
                <p className="text-2xl font-bold text-foreground">{completedCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">완료</p>
              </div>
            </div>
          </div>

          {/* === Section 2: In-Progress === */}
          {inProgress.length > 0 && (
            <div className="px-4 mt-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                진행 중
              </h2>
              <div className="space-y-3">
                {inProgress.map((r) => (
                  <div key={r.id} className="card-elevated p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                          <span className="text-accent text-sm font-bold">
                            {r.scheduled_time?.slice(0, 5)}
                          </span>
                        </div>
                        <div>
                          <p className="text-base font-semibold text-foreground">
                            {r.customer?.name ?? "알 수 없음"}
                          </p>
                          {r.service_type && (
                            <p className="text-sm text-muted-foreground">
                              {r.service_type}{r.service_detail && ` · ${r.service_detail}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent font-semibold rounded-full">
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
            </div>
          )}

          {/* === Section 3: Next Up === */}
          {nextUp.length > 0 && (
            <div className="px-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  다음 예약
                </h2>
                <Link href="/tasks" className="text-sm text-accent font-medium">
                  전체보기
                </Link>
              </div>
              <div className="space-y-2">
                {nextUp.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleStartTreatment(r)}
                    className="w-full card-elevated p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="w-11 h-11 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-foreground">
                        {r.scheduled_time?.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-foreground truncate">
                        {r.customer?.name ?? "알 수 없음"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {r.service_type || "미정"}
                        {r.service_detail && ` · ${r.service_detail}`}
                        {r.member?.display_name && ` · ${r.member.display_name}`}
                      </p>
                    </div>
                    <span className="text-sm text-accent font-medium flex-shrink-0">
                      시술 시작
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* === Section 4: Recent Treatments Feed === */}
          <div className="px-4 mt-4">
            {recentTreatments.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    최근 시술
                  </h2>
                  <Link href="/treatments" className="text-sm text-accent font-medium">
                    전체보기
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentTreatments.map((t) => {
                    const photo = getRepresentativePhoto(t.photos || []);
                    const customerName = t.customer?.name;
                    const photoCount = (t.photos || []).filter(
                      (p) => p.photo_type !== "source" && !p.deleted_at
                    ).length;

                    return (
                      <button
                        key={t.id}
                        onClick={() => router.push(`/treatments/${t.id}`)}
                        className="w-full card-elevated overflow-hidden text-left active:scale-[0.98] transition-transform"
                      >
                        <div className="flex">
                          <div className="w-24 h-24 flex-shrink-0 bg-muted relative">
                            {photo ? (
                              <Image
                                src={photo.face_swapped_url || photo.mosaic_url || photo.photo_url}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="96px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-hint">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <rect x="3" y="3" width="18" height="18" rx="2" />
                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                  <path d="M21 15l-5-5L5 21" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5">
                              <p className="text-base font-semibold text-foreground truncate">
                                {customerName || "고객"}
                              </p>
                              {t.customer?.visit_count != null && t.customer.visit_count > 1 && (
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {t.customer.visit_count}회
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {t.service_type || "미정"}
                              {t.service_detail && ` · ${t.service_detail}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-subtle">
                              <span>{formatShortDate(t.created_at)}</span>
                              {photoCount > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <path d="M21 15l-5-5L5 21" />
                                  </svg>
                                  {photoCount}
                                </span>
                              )}
                            </div>
                            {t.ai_summary && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {t.ai_summary}
                              </p>
                            )}
                          </div>
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
            ) : inProgress.length === 0 && nextUp.length === 0 ? (
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
            ) : null}
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
