"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useShopApi } from "@/hooks/useShopApi";
import {
  type Treatment,
  type TreatmentPhoto,
  type PhotoAnnotation,
} from "@/lib/api";
import { ShareButton } from "@/components/ShareButton";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { StyleNoteOverlay } from "@/components/StyleNoteOverlay";
import { AnnotationOverlay } from "@/components/AnnotationOverlay";
import { PhotoAnnotationEditor } from "@/components/PhotoAnnotationEditor";
import { FaceSwapFlow } from "@/components/FaceSwapFlow";
import { VoiceNote } from "@/components/VoiceNote";
import { useServiceMenu } from "@/hooks/useServiceMenu";

const PHOTO_TYPE_LABELS: Record<string, string> = {
  before: "시술 전",
  during: "시술 중",
  after: "시술 후",
  source: "소스",
};

const PHOTO_TYPE_ORDER: Record<string, number> = {
  before: 0,
  during: 1,
  after: 2,
  source: 3,
};

export default function TreatmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { api, isReady } = useShopApi();
  const { getCategoryLabel } = useServiceMenu();
  const id = params.id as string;

  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFaceSwap, setShowFaceSwap] = useState(false);
  const [showVoiceNote, setShowVoiceNote] = useState(false);
  const [annotatingPhoto, setAnnotatingPhoto] = useState<TreatmentPhoto | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const t = await api.getTreatment(id);
      setTreatment(t);
    } catch {
      alert("시술 정보를 불러올 수 없습니다.");
      router.push("/treatments");
    } finally {
      setLoading(false);
    }
  }, [id, router, api]);

  useEffect(() => {
    if (!isReady) return;
    loadData();
  }, [loadData, isReady]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  const sortedPhotos = treatment?.photos
    ? [...treatment.photos]
        .filter((p) => p.photo_type !== "source")
        .sort(
          (a, b) =>
            (PHOTO_TYPE_ORDER[a.photo_type] ?? 99) -
            (PHOTO_TYPE_ORDER[b.photo_type] ?? 99)
        )
    : [];

  // Only photo-type media for face swap
  const swappablePhotos = sortedPhotos.filter(
    (p) => (p.media_type || "photo") === "photo"
  );

  // Collect tags for display
  const tags: string[] = [];
  if (treatment) {
    if (treatment.service_detail) tags.push(treatment.service_detail);
    const serviceLabel = getCategoryLabel(treatment.service_type);
    tags.push(serviceLabel);
    if (treatment.area) tags.push(treatment.area);
    if (treatment.products_used) {
      for (const p of treatment.products_used) {
        tags.push(p.code ? `${p.brand} ${p.code}` : p.brand);
      }
    }
  }

  async function handleAddToPortfolio(photo: TreatmentPhoto) {
    try {
      await api.createPortfolioItem({
        photo_id: photo.id,
        title: treatment
          ? `${getCategoryLabel(treatment.service_type)} - ${PHOTO_TYPE_LABELS[photo.photo_type] || photo.photo_type}`
          : undefined,
      });
      await loadData();
    } catch {
      alert("포트폴리오 추가에 실패했습니다.");
    }
  }

  async function handleSaveAnnotations(photo: TreatmentPhoto, annotations: PhotoAnnotation[]) {
    await api.updatePhoto(photo.treatment_id, photo.id, { annotations });
    await loadData();
  }

  async function handleDelete() {
    if (!confirm("이 시술 기록을 삭제하시겠습니까? 관련 사진도 함께 삭제됩니다.")) return;
    try {
      await api.deleteTreatment(id);
      router.push("/treatments");
    } catch {
      alert("삭제에 실패했습니다.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <p className="text-subtle">불러오는 중...</p>
      </div>
    );
  }

  if (!treatment) return null;

  const customerName = treatment.customer?.name;
  const visitCount = treatment.customer?.visit_count;

  return (
    <div className="min-h-screen bg-muted pb-8">
      {/* Custom Header */}
      <div className="sticky top-0 z-40 bg-header-bg backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-muted-foreground"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-sm">뒤로</span>
        </button>
        <div className="text-center">
          <div className="text-sm font-bold text-foreground">
            {getCategoryLabel(treatment.service_type)}
          </div>
          {customerName && (
            <div className="text-xs text-muted-foreground">{customerName} 고객님</div>
          )}
        </div>
        {/* 3-dot menu */}
        <div className="relative w-12 flex justify-end" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="p-1.5 rounded-full active:bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-card rounded-xl shadow-lg border border-border py-1 min-w-[160px] z-50">
              <button
                onClick={() => {
                  setShowMenu(false);
                  router.push(`/treatments/${id}/edit`);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-foreground active:bg-muted flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                시술 기록 수정
              </button>
              <div className="mx-3 border-t border-border" />
              <button
                onClick={() => {
                  setShowMenu(false);
                  handleDelete();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-destructive active:bg-muted flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                시술 기록 삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Photo Carousel */}
      <PhotoCarousel photos={sortedPhotos}>
        {(activeIndex) => (
          <>
            <StyleNoteOverlay treatment={treatment} />
            <AnnotationOverlay
              annotations={sortedPhotos[activeIndex]?.annotations || []}
              onPinTap={() => {
                const photo = sortedPhotos[activeIndex];
                if (photo && (photo.media_type || "photo") === "photo") {
                  setAnnotatingPhoto(photo);
                }
              }}
            />
          </>
        )}
      </PhotoCarousel>

      {/* Bottom Sheet */}
      <div className="bg-card rounded-t-3xl -mt-6 relative z-10 min-h-[40vh]">
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-hint rounded-full" />
        </div>

        <div className="px-4 pb-6 space-y-4">
          {/* Title + Customer + Price */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {getCategoryLabel(treatment.service_type)}
                {treatment.service_detail && (
                  <span className="text-muted-foreground font-normal ml-2 text-base">
                    {treatment.service_detail}
                  </span>
                )}
              </h2>
              {treatment.price != null && (
                <span className="text-lg font-bold text-foreground">
                  {treatment.price.toLocaleString()}원
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {customerName && (
                <span className="text-sm text-muted-foreground">
                  {customerName} 고객님
                </span>
              )}
              {visitCount != null && visitCount >= 5 && (
                <span className="px-1.5 py-0.5 bg-warning-bg text-warning-foreground text-[10px] font-bold rounded">
                  VIP
                </span>
              )}
              {visitCount != null && (
                <span className="text-xs text-subtle">
                  방문 {visitCount}회
                </span>
              )}
            </div>
            <div className="text-xs text-subtle mt-1">
              {new Date(treatment.created_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {treatment.duration_minutes && ` · ${treatment.duration_minutes}분`}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-foreground">노트</h3>
              <button
                onClick={() => setShowVoiceNote(true)}
                className="flex items-center gap-1 text-xs text-accent font-medium active:opacity-70"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                보이스 노트
              </button>
            </div>
            {treatment.customer_notes ? (
              <p className="text-sm text-muted-foreground bg-surface rounded-xl p-3">
                {treatment.customer_notes}
              </p>
            ) : (
              <p className="text-sm text-subtle bg-surface rounded-xl p-3">
                메모가 없습니다. 보이스 노트로 추가해보세요.
              </p>
            )}
          </div>

          {/* AI Summary */}
          {treatment.ai_summary && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-1">AI 요약</h3>
              <p className="text-sm text-muted-foreground bg-info-bg rounded-xl p-3">
                {treatment.ai_summary}
              </p>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Next Visit */}
          {treatment.next_visit_recommendation && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-1">다음 방문 추천</h3>
              <p className="text-sm text-muted-foreground">{treatment.next_visit_recommendation}</p>
            </div>
          )}

          {/* AI Faceswap Button - Full Width */}
          <button
            onClick={() => setShowFaceSwap(true)}
            disabled={swappablePhotos.length === 0}
            className="w-full py-3 bg-accent text-primary-foreground rounded-xl text-sm font-medium active:opacity-80 disabled:opacity-50"
          >
            AI Faceswap
          </button>

          {/* Detail Info */}
          <div className="bg-surface rounded-xl p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">날짜</div>
              <div className="text-foreground">
                {new Date(treatment.created_at).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>

              {treatment.duration_minutes && (
                <>
                  <div className="text-muted-foreground">소요 시간</div>
                  <div className="text-foreground">{treatment.duration_minutes}분</div>
                </>
              )}

              {treatment.price != null && (
                <>
                  <div className="text-muted-foreground">가격</div>
                  <div className="text-foreground">{treatment.price.toLocaleString()}원</div>
                </>
              )}

              {treatment.area && (
                <>
                  <div className="text-muted-foreground">시술 부위</div>
                  <div className="text-foreground">{treatment.area}</div>
                </>
              )}

              {treatment.satisfaction && (
                <>
                  <div className="text-muted-foreground">만족도</div>
                  <div className="text-foreground">
                    {"★".repeat(Number(treatment.satisfaction))}{"☆".repeat(5 - Number(treatment.satisfaction))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Products */}
          {treatment.products_used && treatment.products_used.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-2">사용 제품</h3>
              <div className="flex gap-1 flex-wrap">
                {treatment.products_used.map((p, i) => (
                  <span
                    key={i}
                    className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full"
                  >
                    {p.brand} {p.code} {p.area && `(${p.area})`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Photo Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">사진 관리</h3>

            {sortedPhotos.map((photo) => {
              const isPhoto = (photo.media_type || "photo") === "photo";
              return (
                <div key={photo.id} className="bg-surface rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {PHOTO_TYPE_LABELS[photo.photo_type] || photo.photo_type}
                      {photo.media_type === "video" && (
                        <span className="ml-1 text-accent">영상</span>
                      )}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setAnnotatingPhoto(photo)}
                        disabled={!isPhoto}
                        className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-md disabled:opacity-30"
                      >
                        핀 노트{photo.annotations && photo.annotations.length > 0 ? ` (${photo.annotations.length})` : ""}
                      </button>
                      <ShareButton
                        imageUrl={photo.face_swapped_url || photo.photo_url}
                        title={`${getCategoryLabel(treatment.service_type)} - ${PHOTO_TYPE_LABELS[photo.photo_type] || photo.photo_type}`}
                        className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-md disabled:opacity-50"
                      />
                      <button
                        onClick={() => handleAddToPortfolio(photo)}
                        disabled={photo.is_portfolio}
                        className={`text-xs px-2 py-1 rounded-md ${
                          photo.is_portfolio
                            ? "bg-success-bg text-success-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {photo.is_portfolio ? "추가됨" : "포트폴리오"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Photos */}
          <Link
            href={`/treatments/${id}/capture`}
            className="flex items-center justify-center gap-2 w-full py-3 bg-surface border border-border rounded-xl text-sm font-medium text-foreground active:bg-muted transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            사진/영상 추가
          </Link>
        </div>
      </div>

      {/* Face Swap Flow Modal */}
      {showFaceSwap && (
        <FaceSwapFlow
          photos={swappablePhotos}
          onClose={() => setShowFaceSwap(false)}
          onComplete={() => loadData()}
        />
      )}

      {/* Photo Annotation Editor Modal */}
      {annotatingPhoto && (
        <PhotoAnnotationEditor
          photo={annotatingPhoto}
          onSave={(annotations) => handleSaveAnnotations(annotatingPhoto, annotations)}
          onClose={() => setAnnotatingPhoto(null)}
        />
      )}

      {/* VoiceNote Modal */}
      {showVoiceNote && (
        <VoiceNote
          treatmentId={id}
          onComplete={() => {
            setShowVoiceNote(false);
            loadData();
          }}
          onClose={() => setShowVoiceNote(false)}
        />
      )}
    </div>
  );
}
