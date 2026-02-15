"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getTreatment,
  uploadTreatmentPhoto,
  startFaceSwap,
  getFaceSwapStatus,
  completeFaceSwap,
  createPortfolioItem,
  deleteTreatment,
  type Treatment,
  type TreatmentPhoto,
} from "@/lib/api";
import { ShareButton } from "@/components/ShareButton";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { StyleNoteOverlay } from "@/components/StyleNoteOverlay";

const SERVICE_LABELS: Record<string, string> = {
  cut: "커트",
  color: "염색",
  perm: "펌",
  treatment: "트리트먼트",
  bleach: "블리치",
  scalp: "두피관리",
};

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
  const id = params.id as string;

  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Photo upload state
  const [uploadType, setUploadType] = useState<string>("after");
  const [uploading, setUploading] = useState(false);

  // Face swap state
  const [swapTargetPhotoId, setSwapTargetPhotoId] = useState<string | null>(null);
  const [swapUploading, setSwapUploading] = useState(false);
  const [swapJobId, setSwapJobId] = useState<string | null>(null);
  const [swapPolling, setSwapPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const t = await getTreatment(id);
      setTreatment(t);
    } catch {
      alert("시술 정보를 불러올 수 없습니다.");
      router.push("/treatments");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const sortedPhotos = treatment?.photos
    ? [...treatment.photos]
        .filter((p) => p.photo_type !== "source")
        .sort(
          (a, b) =>
            (PHOTO_TYPE_ORDER[a.photo_type] ?? 99) -
            (PHOTO_TYPE_ORDER[b.photo_type] ?? 99)
        )
    : [];

  // Collect tags for display
  const tags: string[] = [];
  if (treatment) {
    if (treatment.service_detail) tags.push(treatment.service_detail);
    const serviceLabel = SERVICE_LABELS[treatment.service_type] || treatment.service_type;
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
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      await uploadTreatmentPhoto(treatment.id, file, uploadType, undefined, isVideo ? { mediaType: "video" } : undefined);
      await loadData();
    } catch {
      alert("업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleFaceSwapStart(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !treatment || !swapTargetPhotoId) return;
    setSwapUploading(true);
    try {
      const sourcePhoto = await uploadTreatmentPhoto(treatment.id, file, "source");
      const job = await startFaceSwap(sourcePhoto.id, swapTargetPhotoId);
      setSwapJobId(job._id);
      setSwapUploading(false);
      setSwapPolling(true);
      pollingRef.current = setInterval(async () => {
        try {
          const status = await getFaceSwapStatus(job._id);
          if (status.status === 2 && status.url) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            await completeFaceSwap(swapTargetPhotoId, status.url);
            setSwapPolling(false);
            setSwapJobId(null);
            setSwapTargetPhotoId(null);
            await loadData();
          } else if (status.status === 3) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setSwapPolling(false);
            setSwapJobId(null);
            setSwapTargetPhotoId(null);
            alert("페이스 스왑 처리에 실패했습니다.");
          }
        } catch {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setSwapPolling(false);
          setSwapJobId(null);
          setSwapTargetPhotoId(null);
          alert("페이스 스왑 상태 확인에 실패했습니다.");
        }
      }, 3000);
    } catch {
      setSwapUploading(false);
      alert("페이스 스왑을 시작할 수 없습니다.");
    } finally {
      e.target.value = "";
    }
  }

  async function handleAddToPortfolio(photo: TreatmentPhoto) {
    try {
      await createPortfolioItem({
        photo_id: photo.id,
        title: treatment
          ? `${SERVICE_LABELS[treatment.service_type] || treatment.service_type} - ${PHOTO_TYPE_LABELS[photo.photo_type] || photo.photo_type}`
          : undefined,
      });
      await loadData();
    } catch {
      alert("포트폴리오 추가에 실패했습니다.");
    }
  }

  async function handleDelete() {
    if (!confirm("이 시술 기록을 삭제하시겠습니까? 관련 사진도 함께 삭제됩니다.")) return;
    try {
      await deleteTreatment(id);
      router.push("/treatments");
    } catch {
      alert("삭제에 실패했습니다.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  if (!treatment) return null;

  const customerName = treatment.customer?.name;
  const visitCount = treatment.customer?.visit_count;

  return (
    <div className="min-h-screen bg-gray-100 pb-8">
      {/* Custom Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-500"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-sm">뒤로</span>
        </button>
        <div className="text-center">
          <div className="text-sm font-bold text-gray-900">
            {SERVICE_LABELS[treatment.service_type] || treatment.service_type}
          </div>
          {customerName && (
            <div className="text-xs text-gray-500">{customerName} 고객님</div>
          )}
        </div>
        <div className="w-12" /> {/* Spacer for centering */}
      </div>

      {/* Photo Carousel */}
      <PhotoCarousel photos={sortedPhotos}>
        {() => <StyleNoteOverlay treatment={treatment} />}
      </PhotoCarousel>

      {/* Bottom Sheet */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 min-h-[40vh]">
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-4 pb-6 space-y-4">
          {/* Title + Customer + Price */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {SERVICE_LABELS[treatment.service_type] || treatment.service_type}
                {treatment.service_detail && (
                  <span className="text-gray-500 font-normal ml-2 text-base">
                    {treatment.service_detail}
                  </span>
                )}
              </h2>
              {treatment.price != null && (
                <span className="text-lg font-bold text-gray-900">
                  {treatment.price.toLocaleString()}원
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {customerName && (
                <span className="text-sm text-gray-500">
                  {customerName} 고객님
                </span>
              )}
              {visitCount != null && visitCount >= 5 && (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">
                  VIP
                </span>
              )}
              {visitCount != null && (
                <span className="text-xs text-gray-400">
                  방문 {visitCount}회
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(treatment.created_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {treatment.duration_minutes && ` · ${treatment.duration_minutes}분`}
            </div>
          </div>

          {/* Notes */}
          {treatment.customer_notes && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">노트</h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
                {treatment.customer_notes}
              </p>
            </div>
          )}

          {/* AI Summary */}
          {treatment.ai_summary && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">AI 요약</h3>
              <p className="text-sm text-gray-600 bg-blue-50 rounded-xl p-3">
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
                  className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Next Visit */}
          {treatment.next_visit_recommendation && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">다음 방문 추천</h3>
              <p className="text-sm text-gray-600">{treatment.next_visit_recommendation}</p>
            </div>
          )}

          {/* Show Details Button */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 active:bg-gray-50"
          >
            {showDetails ? "상세 접기" : "상세 보기"}
          </button>

          {/* Expanded Details */}
          {showDetails && (
            <div className="space-y-4">
              {/* Detail Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">날짜</div>
                  <div className="text-gray-900">
                    {new Date(treatment.created_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>

                  {treatment.duration_minutes && (
                    <>
                      <div className="text-gray-500">소요 시간</div>
                      <div className="text-gray-900">{treatment.duration_minutes}분</div>
                    </>
                  )}

                  {treatment.price != null && (
                    <>
                      <div className="text-gray-500">가격</div>
                      <div className="text-gray-900">{treatment.price.toLocaleString()}원</div>
                    </>
                  )}

                  {treatment.area && (
                    <>
                      <div className="text-gray-500">시술 부위</div>
                      <div className="text-gray-900">{treatment.area}</div>
                    </>
                  )}

                  {treatment.satisfaction && (
                    <>
                      <div className="text-gray-500">만족도</div>
                      <div className="text-gray-900">
                        {"★".repeat(Number(treatment.satisfaction))}{"☆".repeat(5 - Number(treatment.satisfaction))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Products */}
              {treatment.products_used && treatment.products_used.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">사용 제품</h3>
                  <div className="flex gap-1 flex-wrap">
                    {treatment.products_used.map((p, i) => (
                      <span
                        key={i}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                      >
                        {p.brand} {p.code} {p.area && `(${p.area})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo Actions */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900">사진 관리</h3>

                {sortedPhotos.map((photo) => (
                  <div key={photo.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {PHOTO_TYPE_LABELS[photo.photo_type] || photo.photo_type}
                        {photo.media_type === "video" && (
                          <span className="ml-1 text-blue-500">영상</span>
                        )}
                      </span>
                      <div className="flex gap-1.5">
                        <ShareButton
                          imageUrl={photo.face_swapped_url || photo.photo_url}
                          title={`${SERVICE_LABELS[treatment.service_type] || treatment.service_type} - ${PHOTO_TYPE_LABELS[photo.photo_type] || photo.photo_type}`}
                          className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded-md disabled:opacity-50"
                        />
                        {!photo.face_swapped_url && (photo.media_type || "photo") === "photo" && (
                          <button
                            onClick={() => setSwapTargetPhotoId(photo.id)}
                            disabled={swapPolling}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-md disabled:opacity-50"
                          >
                            AI 스왑
                          </button>
                        )}
                        <button
                          onClick={() => handleAddToPortfolio(photo)}
                          disabled={photo.is_portfolio}
                          className={`text-xs px-2 py-1 rounded-md ${
                            photo.is_portfolio
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {photo.is_portfolio ? "추가됨" : "포트폴리오"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">파일 업로드</h3>
                  <Link
                    href={`/treatments/${id}/capture`}
                    className="text-xs text-blue-500"
                  >
                    촬영하기
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-900"
                  >
                    <option value="before">시술 전</option>
                    <option value="during">시술 중</option>
                    <option value="after">시술 후</option>
                  </select>
                  <label
                    className={`flex-1 text-center text-sm py-2 rounded-lg cursor-pointer ${
                      uploading
                        ? "bg-gray-100 text-gray-400"
                        : "bg-black text-white active:opacity-80"
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
                className="w-full py-3 border border-red-200 text-red-400 rounded-xl text-sm font-medium active:bg-red-50"
              >
                시술 기록 삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Face Swap Modal */}
      {swapTargetPhotoId && !swapPolling && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setSwapTargetPhotoId(null)}>
          <div className="bg-white rounded-t-2xl p-4 w-full max-w-[480px] space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">AI 페이스 스왑</h2>
              <button
                onClick={() => setSwapTargetPhotoId(null)}
                className="text-xs text-gray-400"
              >
                취소
              </button>
            </div>
            <p className="text-sm text-gray-500">
              교체할 얼굴이 담긴 소스 이미지를 선택하세요.
            </p>
            <label
              className={`block text-center text-sm py-3 rounded-xl cursor-pointer ${
                swapUploading
                  ? "bg-gray-100 text-gray-400"
                  : "bg-blue-500 text-white active:opacity-80"
              }`}
            >
              {swapUploading ? "업로드 및 처리 시작 중..." : "소스 얼굴 이미지 선택"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFaceSwapStart}
                disabled={swapUploading}
              />
            </label>
          </div>
        </div>
      )}

      {/* Face Swap Processing */}
      {swapPolling && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-blue-500 text-white px-4 py-3 rounded-xl shadow-lg max-w-[400px] w-[calc(100%-2rem)]">
          <div className="text-sm font-medium text-center">
            AI 페이스 스왑 처리 중...
          </div>
          <p className="text-xs text-blue-100 mt-1 text-center">
            완료되면 자동으로 결과가 표시됩니다
          </p>
        </div>
      )}
    </div>
  );
}
