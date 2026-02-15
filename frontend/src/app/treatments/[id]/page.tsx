"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import {
  getTreatment,
  getCustomer,
  uploadTreatmentPhoto,
  startFaceSwap,
  getFaceSwapStatus,
  completeFaceSwap,
  createPortfolioItem,
  deleteTreatment,
  type Treatment,
  type Customer,
  type TreatmentPhoto,
} from "@/lib/api";
import { ShareButton } from "@/components/ShareButton";

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
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

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
      try {
        const c = await getCustomer(t.customer_id);
        setCustomer(c);
      } catch {
        // Customer may not be accessible
      }
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

  // Cleanup polling on unmount
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

  // Photo/video upload handler
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

  // Face swap: select source and start
  async function handleFaceSwapStart(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !treatment || !swapTargetPhotoId) return;
    setSwapUploading(true);
    try {
      // Upload source face image
      const sourcePhoto = await uploadTreatmentPhoto(
        treatment.id,
        file,
        "source"
      );
      // Start face swap
      const job = await startFaceSwap(sourcePhoto.id, swapTargetPhotoId);
      setSwapJobId(job._id);
      setSwapUploading(false);
      // Start polling
      setSwapPolling(true);
      pollingRef.current = setInterval(async () => {
        try {
          const status = await getFaceSwapStatus(job._id);
          // Replicate status (mapped): 1 = processing, 2 = succeeded, 3 = failed
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

  // Portfolio add handler
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

  if (loading) {
    return (
      <div>
        <PageHeader title="시술 상세" />
        <div className="text-center py-8 text-[#555555]">불러오는 중...</div>
      </div>
    );
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

  if (!treatment) return null;

  return (
    <div>
      <PageHeader
        title="시술 상세"
        subtitle={customer ? customer.name : undefined}
        action={
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm text-red-400 bg-[#1a1a1a] rounded-lg"
            >
              삭제
            </button>
            <button
              onClick={() => router.back()}
              className="px-3 py-1.5 text-sm text-[#a1a1a1] bg-[#1a1a1a] rounded-lg"
            >
              뒤로
            </button>
          </div>
        }
      />

      <div className="p-4 space-y-4">
        {/* 시술 정보 카드 */}
        <div className="bg-[#111111] rounded-xl border border-[#262626] p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-[#1a1a1a] text-[#ededed] rounded-md text-xs font-medium">
              {SERVICE_LABELS[treatment.service_type] || treatment.service_type}
            </span>
            {treatment.service_detail && (
              <span className="text-sm text-[#a1a1a1]">
                {treatment.service_detail}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-[#666666]">날짜</div>
            <div>
              {new Date(treatment.created_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>

            {treatment.duration_minutes && (
              <>
                <div className="text-[#666666]">소요 시간</div>
                <div>{treatment.duration_minutes}분</div>
              </>
            )}

            {treatment.price != null && (
              <>
                <div className="text-[#666666]">가격</div>
                <div>{treatment.price.toLocaleString()}원</div>
              </>
            )}

            {treatment.area && (
              <>
                <div className="text-[#666666]">시술 부위</div>
                <div>{treatment.area}</div>
              </>
            )}

            {treatment.satisfaction && (
              <>
                <div className="text-[#666666]">만족도</div>
                <div>{"★".repeat(Number(treatment.satisfaction))}{"☆".repeat(5 - Number(treatment.satisfaction))}</div>
              </>
            )}

            {customer && (
              <>
                <div className="text-[#666666]">고객</div>
                <div>
                  <Link
                    href={`/customers`}
                    className="text-white underline"
                  >
                    {customer.name}
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* 사용 제품 */}
          {treatment.products_used && treatment.products_used.length > 0 && (
            <div>
              <div className="text-xs text-[#666666] mb-1">사용 제품</div>
              <div className="flex gap-1 flex-wrap">
                {treatment.products_used.map((p, i) => (
                  <span
                    key={i}
                    className="text-xs bg-[#1a1a1a] text-[#a1a1a1] px-2 py-0.5 rounded-full"
                  >
                    {p.brand} {p.code} {p.area && `(${p.area})`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 메모 */}
          {treatment.customer_notes && (
            <div>
              <div className="text-xs text-[#666666] mb-1">메모</div>
              <p className="text-sm text-[#a1a1a1]">{treatment.customer_notes}</p>
            </div>
          )}

          {/* AI 요약 */}
          {treatment.ai_summary && (
            <div>
              <div className="text-xs text-[#666666] mb-1">AI 요약</div>
              <p className="text-sm text-[#a1a1a1] bg-[#1a1a1a] rounded-lg p-2">
                {treatment.ai_summary}
              </p>
            </div>
          )}

          {/* 다음 방문 추천 */}
          {treatment.next_visit_recommendation && (
            <div>
              <div className="text-xs text-[#666666] mb-1">다음 방문 추천</div>
              <p className="text-sm text-[#a1a1a1]">
                {treatment.next_visit_recommendation}
              </p>
            </div>
          )}
        </div>

        {/* 사진/영상 갤러리 */}
        <div className="bg-[#111111] rounded-xl border border-[#262626] p-4">
          <h2 className="font-bold text-[#ededed] mb-3">
            시술 사진/영상{" "}
            <span className="text-sm font-normal text-[#555555]">
              {(() => {
                const photoCount = sortedPhotos.filter((p) => (p.media_type || "photo") === "photo").length;
                const videoCount = sortedPhotos.filter((p) => p.media_type === "video").length;
                const parts = [];
                if (photoCount > 0) parts.push(`사진 ${photoCount}장`);
                if (videoCount > 0) parts.push(`영상 ${videoCount}편`);
                return parts.join(" ") || "0장";
              })()}
            </span>
          </h2>

          {sortedPhotos.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-[#555555] mb-3">
                아직 사진/영상이 없습니다
              </p>
              <Link
                href={`/treatments/${id}/capture`}
                className="inline-block px-4 py-2 bg-white text-black rounded-lg text-sm font-medium active:scale-95 transition-transform"
              >
                촬영하기
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedPhotos.map((photo) => (
                <div key={photo.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#666666] uppercase">
                      {PHOTO_TYPE_LABELS[photo.photo_type] || photo.photo_type}
                      {photo.media_type === "video" && (
                        <span className="ml-1 text-blue-400">영상</span>
                      )}
                    </span>
                    <div className="flex gap-2">
                      {/* 공유 버튼 */}
                      <ShareButton
                        imageUrl={photo.face_swapped_url || photo.photo_url}
                        title={treatment ? `${SERVICE_LABELS[treatment.service_type] || treatment.service_type} - ${PHOTO_TYPE_LABELS[photo.photo_type] || photo.photo_type}` : "시술 사진"}
                      />
                      {/* 페이스 스왑 버튼 (사진만) */}
                      {!photo.face_swapped_url && (photo.media_type || "photo") === "photo" && (
                        <button
                          onClick={() => setSwapTargetPhotoId(photo.id)}
                          disabled={swapPolling}
                          className="text-xs px-2 py-1 bg-[#1a1a1a] text-blue-400 rounded-md disabled:opacity-50"
                        >
                          AI 페이스 스왑
                        </button>
                      )}
                      {/* 영상은 face swap 불가 표시 */}
                      {photo.media_type === "video" && !photo.face_swapped_url && (
                        <span className="text-xs px-2 py-1 text-[#555555]">
                          사진만 스왑 가능
                        </span>
                      )}
                      {/* 포트폴리오 추가 버튼 */}
                      <button
                        onClick={() => handleAddToPortfolio(photo)}
                        disabled={photo.is_portfolio}
                        className={`text-xs px-2 py-1 rounded-md ${
                          photo.is_portfolio
                            ? "bg-[#0a2a0a] text-green-500 cursor-default"
                            : "bg-[#1a1a1a] text-[#ededed]"
                        }`}
                      >
                        {photo.is_portfolio ? "포트폴리오 추가됨" : "포트폴리오 추가"}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {photo.media_type === "video" ? (
                      <video
                        src={photo.photo_url}
                        controls
                        playsInline
                        poster={photo.thumbnail_url || undefined}
                        className="w-full rounded-lg max-h-64"
                      />
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.photo_url}
                          alt={`${photo.photo_type} 사진`}
                          className="w-full rounded-lg object-cover max-h-64"
                        />
                      </>
                    )}
                    {photo.face_swapped_url && (
                      <div className="relative w-full">
                        <span className="absolute top-1 left-1 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">
                          AI 변환
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.face_swapped_url}
                          alt="페이스 스왑 결과"
                          className="w-full rounded-lg object-cover max-h-64"
                        />
                      </div>
                    )}
                  </div>

                  {photo.caption && (
                    <p className="text-xs text-[#666666]">{photo.caption}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 사진/영상 업로드 */}
        <div className="bg-[#111111] rounded-xl border border-[#262626] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#ededed]">파일 업로드</h2>
            <Link
              href={`/treatments/${id}/capture`}
              className="text-xs text-blue-400"
            >
              촬영하기
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              className="text-sm border border-[#333333] rounded-lg px-2 py-1.5 bg-[#111111] text-[#ededed]"
            >
              <option value="before">시술 전</option>
              <option value="during">시술 중</option>
              <option value="after">시술 후</option>
            </select>
            <label
              className={`flex-1 text-center text-sm py-2 rounded-lg cursor-pointer ${
                uploading
                  ? "bg-[#1a1a1a] text-[#555555]"
                  : "bg-white text-black active:opacity-80"
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

        {/* 페이스 스왑 모달 */}
        {swapTargetPhotoId && !swapPolling && (
          <div className="bg-[#111111] rounded-xl border border-[#262626] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-[#ededed]">AI 페이스 스왑</h2>
              <button
                onClick={() => setSwapTargetPhotoId(null)}
                className="text-xs text-[#555555]"
              >
                취소
              </button>
            </div>
            <p className="text-sm text-[#666666] mb-3">
              교체할 얼굴이 담긴 소스 이미지를 선택하세요.
            </p>
            <label
              className={`block text-center text-sm py-2 rounded-lg cursor-pointer ${
                swapUploading
                  ? "bg-[#1a1a1a] text-[#555555]"
                  : "bg-blue-600 text-white active:opacity-80"
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
        )}

        {/* 페이스 스왑 진행 중 */}
        {swapPolling && (
          <div className="bg-[#111111] rounded-xl border border-[#262626] p-4 text-center">
            <div className="text-sm text-blue-400 font-medium">
              AI 페이스 스왑 처리 중...
            </div>
            <p className="text-xs text-blue-400/70 mt-1">
              처리가 완료되면 자동으로 결과가 표시됩니다. (Job: {swapJobId})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
