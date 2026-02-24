"use client";

import { useEffect, useState, useCallback } from "react";
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
import { loadVideoMetadata, validateVideoDuration } from "@/lib/video-utils";
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

  // Photo upload state
  const [uploadType, setUploadType] = useState<string>("after");
  const [uploading, setUploading] = useState(false);

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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !treatment) return;

    // 영상 파일인 경우 15초 제한 검증
    const isVideo = file.type.startsWith("video/");
    if (isVideo) {
      try {
        const { duration } = await loadVideoMetadata(file);
        const result = validateVideoDuration(duration);
        if (!result.valid) {
          alert(result.message);
          e.target.value = "";
          return;
        }
      } catch {
        alert("영상 파일을 읽을 수 없습니다.");
        e.target.value = "";
        return;
      }
    }

    setUploading(true);
    try {
      await api.uploadTreatmentPhoto(treatment.id, file, uploadType, undefined, isVideo ? { mediaType: "video" } : undefined);
      await loadData();
    } catch {
      alert("업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      e.target.value = "";
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
        <div className="w-12" /> {/* Spacer for centering */}
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

          {/* Upload */}
          <div className="bg-surface rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground">파일 업로드</h3>
              <Link
                href={`/treatments/${id}/capture`}
                className="text-xs text-accent"
              >
                촬영하기
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="text-sm border border-border rounded-lg pl-3 pr-8 py-1.5 bg-card text-foreground"
              >
                <option value="before">시술 전</option>
                <option value="during">시술 중</option>
                <option value="after">시술 후</option>
              </select>
              <label
                className={`flex-1 text-center text-sm py-2 rounded-lg cursor-pointer ${
                  uploading
                    ? "bg-muted text-subtle"
                    : "bg-primary text-primary-foreground active:opacity-80"
                }`}
              >
                {uploading ? "업로드 중..." : "사진/영상 선택"}
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="w-full py-3 border border-destructive text-destructive rounded-xl text-sm font-medium active:bg-red-50"
          >
            시술 기록 삭제
          </button>
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
