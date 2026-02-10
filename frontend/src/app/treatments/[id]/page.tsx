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
  type Treatment,
  type Customer,
  type TreatmentPhoto,
} from "@/lib/api";

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

  // Photo upload handler
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !treatment) return;
    setUploading(true);
    try {
      await uploadTreatmentPhoto(treatment.id, file, uploadType);
      await loadData();
    } catch {
      alert("사진 업로드에 실패했습니다.");
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
          // AKOOL status: 1 = processing, 2 = completed, 3 = failed
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
            alert("페이스 스왑 처리에 실패했습니다.");
          }
        } catch {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setSwapPolling(false);
          setSwapJobId(null);
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
          ? `${SERVICE_LABELS[treatment.service_type] || treatment.service_type} - ${photo.photo_type}`
          : undefined,
      });
      alert("포트폴리오에 추가되었습니다.");
    } catch {
      alert("포트폴리오 추가에 실패했습니다.");
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="시술 상세" />
        <div className="text-center py-8 text-gray-400">불러오는 중...</div>
      </div>
    );
  }

  if (!treatment) return null;

  return (
    <div>
      <PageHeader
        title="시술 상세"
        subtitle={customer ? customer.name : undefined}
        action={
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg"
          >
            뒤로
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {/* 시술 정보 카드 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
              {SERVICE_LABELS[treatment.service_type] || treatment.service_type}
            </span>
            {treatment.service_detail && (
              <span className="text-sm text-gray-600">
                {treatment.service_detail}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">날짜</div>
            <div>
              {new Date(treatment.created_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>

            {treatment.duration_minutes && (
              <>
                <div className="text-gray-500">소요 시간</div>
                <div>{treatment.duration_minutes}분</div>
              </>
            )}

            {treatment.price != null && (
              <>
                <div className="text-gray-500">가격</div>
                <div>{treatment.price.toLocaleString()}원</div>
              </>
            )}

            {treatment.area && (
              <>
                <div className="text-gray-500">시술 부위</div>
                <div>{treatment.area}</div>
              </>
            )}

            {treatment.satisfaction && (
              <>
                <div className="text-gray-500">만족도</div>
                <div>{"★".repeat(Number(treatment.satisfaction))}{"☆".repeat(5 - Number(treatment.satisfaction))}</div>
              </>
            )}

            {customer && (
              <>
                <div className="text-gray-500">고객</div>
                <div>
                  <Link
                    href={`/customers`}
                    className="text-[var(--primary)] underline"
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
              <div className="text-xs text-gray-500 mb-1">사용 제품</div>
              <div className="flex gap-1 flex-wrap">
                {treatment.products_used.map((p, i) => (
                  <span
                    key={i}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
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
              <div className="text-xs text-gray-500 mb-1">메모</div>
              <p className="text-sm text-gray-700">{treatment.customer_notes}</p>
            </div>
          )}

          {/* AI 요약 */}
          {treatment.ai_summary && (
            <div>
              <div className="text-xs text-gray-500 mb-1">AI 요약</div>
              <p className="text-sm text-gray-700 bg-purple-50 rounded-lg p-2">
                {treatment.ai_summary}
              </p>
            </div>
          )}

          {/* 다음 방문 추천 */}
          {treatment.next_visit_recommendation && (
            <div>
              <div className="text-xs text-gray-500 mb-1">다음 방문 추천</div>
              <p className="text-sm text-gray-700">
                {treatment.next_visit_recommendation}
              </p>
            </div>
          )}
        </div>

        {/* 사진 갤러리 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="font-bold text-gray-900 mb-3">
            시술 사진{" "}
            <span className="text-sm font-normal text-gray-400">
              {sortedPhotos.length}장
            </span>
          </h2>

          {sortedPhotos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              아직 사진이 없습니다
            </p>
          ) : (
            <div className="space-y-4">
              {sortedPhotos.map((photo) => (
                <div key={photo.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {PHOTO_TYPE_LABELS[photo.photo_type] || photo.photo_type}
                    </span>
                    <div className="flex gap-2">
                      {/* 페이스 스왑 버튼 */}
                      {!photo.face_swapped_url && (
                        <button
                          onClick={() => setSwapTargetPhotoId(photo.id)}
                          disabled={swapPolling}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md disabled:opacity-50"
                        >
                          AI 페이스 스왑
                        </button>
                      )}
                      {/* 포트폴리오 추가 버튼 */}
                      <button
                        onClick={() => handleAddToPortfolio(photo)}
                        className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md"
                      >
                        {photo.is_portfolio ? "포트폴리오 추가됨" : "포트폴리오 추가"}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.photo_url}
                      alt={`${photo.photo_type} 사진`}
                      className="w-full rounded-lg object-cover max-h-64"
                    />
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
                    <p className="text-xs text-gray-500">{photo.caption}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 사진 업로드 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="font-bold text-gray-900 mb-3">사진 업로드</h2>
          <div className="flex items-center gap-2">
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
            >
              <option value="before">시술 전</option>
              <option value="during">시술 중</option>
              <option value="after">시술 후</option>
            </select>
            <label
              className={`flex-1 text-center text-sm py-2 rounded-lg cursor-pointer ${
                uploading
                  ? "bg-gray-100 text-gray-400"
                  : "bg-[var(--primary)] text-white active:opacity-80"
              }`}
            >
              {uploading ? "업로드 중..." : "사진 선택"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* 페이스 스왑 모달 */}
        {swapTargetPhotoId && !swapPolling && (
          <div className="bg-white rounded-xl border border-blue-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900">AI 페이스 스왑</h2>
              <button
                onClick={() => setSwapTargetPhotoId(null)}
                className="text-xs text-gray-400"
              >
                취소
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              교체할 얼굴이 담긴 소스 이미지를 선택하세요.
            </p>
            <label
              className={`block text-center text-sm py-2 rounded-lg cursor-pointer ${
                swapUploading
                  ? "bg-gray-100 text-gray-400"
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
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
            <div className="text-sm text-blue-700 font-medium">
              AI 페이스 스왑 처리 중...
            </div>
            <p className="text-xs text-blue-500 mt-1">
              처리가 완료되면 자동으로 결과가 표시됩니다. (Job: {swapJobId})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
