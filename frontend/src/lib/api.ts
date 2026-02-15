const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

// Default shop ID for MVP (single-shop mode)
const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID || "00000000-0000-0000-0000-000000000001";

export { SHOP_ID };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
      signal: controller.signal,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || "API request failed");
    }
    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// Customers
export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  gender: string | null;
  birth_date: string | null;
  notes: string | null;
  visit_count: number;
  last_visit: string | null;
  created_at: string;
}

export function getCustomers(search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  return request<Customer[]>(`/shops/${SHOP_ID}/customers${params}`);
}

export function getCustomer(id: string) {
  return request<Customer>(`/shops/${SHOP_ID}/customers/${id}`);
}

export function updateCustomer(id: string, data: Partial<{
  name: string;
  phone: string;
  gender: string;
  birth_date: string;
  notes: string;
  naver_booking_id: string;
}>) {
  return request<Customer>(`/shops/${SHOP_ID}/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteCustomer(id: string) {
  return request<{ status: string }>(`/shops/${SHOP_ID}/customers/${id}`, {
    method: "DELETE",
  });
}

export function createCustomer(data: { name: string; phone?: string; gender?: string; notes?: string; naver_booking_id?: string }) {
  return request<Customer>(`/shops/${SHOP_ID}/customers`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Treatments
export interface ProductUsed {
  brand: string;
  code?: string;
  area?: string;
}

export interface TreatmentPhoto {
  id: string;
  treatment_id: string;
  photo_url: string;
  photo_type: string;
  face_swapped_url: string | null;
  is_portfolio: boolean;
  caption: string | null;
  taken_at: string;
  media_type: "photo" | "video";
  video_duration_seconds: number | null;
  thumbnail_url: string | null;
}

export interface Treatment {
  id: string;
  customer_id: string;
  designer_id: string | null;
  shop_id: string;
  service_type: string;
  service_detail: string | null;
  products_used: ProductUsed[] | null;
  area: string | null;
  duration_minutes: number | null;
  price: number | null;
  satisfaction: string | null;
  customer_notes: string | null;
  ai_summary: string | null;
  next_visit_recommendation: string | null;
  created_at: string;
  photos: TreatmentPhoto[];
}

export function getTreatments(customerId?: string) {
  const params = customerId ? `?customer_id=${customerId}` : "";
  return request<Treatment[]>(`/shops/${SHOP_ID}/treatments${params}`);
}

export function getTreatment(id: string) {
  return request<Treatment>(`/shops/${SHOP_ID}/treatments/${id}`);
}

export function updateTreatment(id: string, data: Partial<{
  service_type: string;
  service_detail: string;
  products_used: ProductUsed[];
  area: string;
  duration_minutes: number;
  price: number;
  satisfaction: string;
  customer_notes: string;
  next_visit_recommendation: string;
}>) {
  return request<Treatment>(`/shops/${SHOP_ID}/treatments/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteTreatment(id: string) {
  return request<{ status: string }>(`/shops/${SHOP_ID}/treatments/${id}`, {
    method: "DELETE",
  });
}

export function createTreatment(data: {
  customer_id: string;
  service_type: string;
  service_detail?: string;
  products_used?: ProductUsed[];
  area?: string;
  duration_minutes?: number;
  price?: number;
  satisfaction?: string;
  customer_notes?: string;
  next_visit_recommendation?: string;
}) {
  return request<Treatment>(`/shops/${SHOP_ID}/treatments`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function uploadTreatmentPhoto(
  treatmentId: string,
  file: File | Blob,
  photoType: string = "after",
  caption?: string,
  options?: {
    mediaType?: "photo" | "video";
    videoDuration?: number;
    thumbnail?: Blob;
  }
) {
  const formData = new FormData();
  formData.append("file", file instanceof Blob && !(file instanceof File)
    ? new File([file], `capture.${options?.mediaType === "video" ? "webm" : "jpg"}`, { type: file.type })
    : file);
  formData.append("photo_type", photoType);
  if (caption) formData.append("caption", caption);
  if (options?.mediaType) formData.append("media_type", options.mediaType);
  if (options?.videoDuration != null) formData.append("video_duration_seconds", String(options.videoDuration));
  if (options?.thumbnail) {
    formData.append("thumbnail", new File([options.thumbnail], "thumbnail.jpg", { type: "image/jpeg" }));
  }

  const res = await fetch(
    `${API_BASE}/shops/${SHOP_ID}/treatments/${treatmentId}/photos`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Failed to upload media");
  return res.json() as Promise<TreatmentPhoto>;
}

// Voice Memo
export interface VoiceMemoResult {
  customer_name: string | null;
  service_type: string | null;
  products_used: ProductUsed[] | null;
  area: string | null;
  duration_minutes: number | null;
  satisfaction: string | null;
  next_visit_recommendation: string | null;
  summary: string | null;
}

export async function transcribeVoiceMemo(audioBlob: Blob): Promise<VoiceMemoResult> {
  const formData = new FormData();
  formData.append("file", audioBlob, "voice-memo.webm");

  const res = await fetch(`${API_BASE}/voice/transcribe`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "알 수 없는 오류" }));
    throw new Error(errorData.detail || "음성 인식에 실패했습니다.");
  }
  return res.json();
}

// Portfolio
export interface PortfolioItem {
  id: string;
  shop_id: string;
  photo_id: string;
  title: string | null;
  description: string | null;
  tags: string[] | null;
  is_published: boolean;
  created_at: string;
  photo: TreatmentPhoto;
}

export function getPortfolio(publishedOnly: boolean = false) {
  return request<PortfolioItem[]>(
    `/shops/${SHOP_ID}/portfolio?published_only=${publishedOnly}`
  );
}

export function createPortfolioItem(data: {
  photo_id: string;
  title?: string;
  description?: string;
  tags?: string[];
}) {
  return request<PortfolioItem>(`/shops/${SHOP_ID}/portfolio`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function togglePortfolioPublish(id: string) {
  return request<PortfolioItem>(`/shops/${SHOP_ID}/portfolio/${id}/publish`, {
    method: "PUT",
  });
}

// Face Swap
export interface FaceSwapJob {
  _id: string;
  status: number;
  url?: string;
  [key: string]: unknown;
}

export function startFaceSwap(sourcePhotoId: string, targetPhotoId: string) {
  return request<FaceSwapJob>(
    `/face-swap?source_photo_id=${encodeURIComponent(sourcePhotoId)}&target_photo_id=${encodeURIComponent(targetPhotoId)}`,
    { method: "POST" }
  );
}

export function getFaceSwapStatus(jobId: string) {
  return request<FaceSwapJob>(`/face-swap/status/${jobId}`);
}

export function completeFaceSwap(photoId: string, faceSwappedUrl: string) {
  return request<{ status: string; photo_id: string; face_swapped_url: string }>(
    `/face-swap/complete/${photoId}`,
    { method: "POST", body: JSON.stringify({ face_swapped_url: faceSwappedUrl }) }
  );
}
