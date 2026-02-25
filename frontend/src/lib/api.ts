const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  // Propagate external abort signal to our controller
  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
      signal: controller.signal,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || error.error || "API request failed");
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

// Treatments
export interface ProductUsed {
  brand: string;
  code?: string;
  area?: string;
}

export interface PhotoAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
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
  annotations: PhotoAnnotation[] | null;
}

export interface Treatment {
  id: string;
  customer_id: string;
  member_id: string | null;
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
  customer?: { name: string; visit_count?: number };
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

// AI Face Models
export interface FaceModel {
  id: string;
  shop_id: string;
  name: string;
  gender: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
}

// Reservations
export interface Reservation {
  id: string;
  shop_id: string;
  customer_id: string;
  member_id: string | null;
  treatment_id: string | null;
  scheduled_date: string;
  scheduled_time: string;
  estimated_duration_minutes: number;
  service_type: string | null;
  service_detail: string | null;
  notes: string | null;
  source: string;
  status: string;
  created_at: string;
  customer?: { name: string; phone: string | null };
  member?: { display_name: string } | null;
  treatment?: { id: string } | null;
}

// Shop Services
export interface ShopService {
  id: string;
  category_id: string;
  shop_id: string;
  name: string;
  estimated_duration_minutes: number | null;
  price: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  shop_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  services: ShopService[];
}

// Shop Members
export interface ShopMember {
  id: string;
  user_id: string;
  shop_id: string;
  role: string;
  display_name: string;
  specialty: string | null;
  phone: string | null;
  is_active: boolean;
  joined_at: string;
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

// Face Swap types
export interface FaceSwapJob {
  _id: string;
  status: number;
  url?: string;
  [key: string]: unknown;
}

export interface FaceSwapGenerateResult {
  jobs: { _id: string; status: number }[];
}

export interface FaceSwapResult {
  id: string;
  treatment_photo_id: string;
  face_model_id: string;
  result_url: string;
  is_selected: boolean;
  created_at: string;
}

// Member Profile
export interface CareerEntry {
  company: string;
  role: string;
  start_year: number;
  end_year: number | null;
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  year: number;
}

export interface SnsLinks {
  instagram?: string;
  kakao?: string;
  youtube?: string;
  blog?: string;
}

export interface MemberProfile {
  profile_photo_url: string | null;
  bio: string | null;
  career_history: CareerEntry[];
  certifications: CertificationEntry[];
  sns_links: SnsLinks;
  show_contact: boolean;
  is_public: boolean;
  display_name: string;
  specialty: string | null;
  phone: string | null;
}

export interface DesignerBadge {
  id: string;
  display_name: string;
  profile_photo_url: string | null;
  is_public: boolean;
}

// ---------- Shop-scoped API factory ----------

export function createShopApi(shopId: string) {
  return {
    // Customers
    getCustomers(search?: string, phone?: string, opts?: { limit?: number; signal?: AbortSignal }) {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (phone) p.set("phone", phone);
      if (opts?.limit) p.set("limit", String(opts.limit));
      const qs = p.toString();
      return request<Customer[]>(`/shops/${shopId}/customers${qs ? `?${qs}` : ""}`, opts?.signal ? { signal: opts.signal } : undefined);
    },
    getCustomer(id: string) {
      return request<Customer>(`/shops/${shopId}/customers/${id}`);
    },
    updateCustomer(id: string, data: Partial<{
      name: string;
      phone: string;
      gender: string;
      birth_date: string;
      notes: string;
      naver_booking_id: string;
    }>) {
      return request<Customer>(`/shops/${shopId}/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    deleteCustomer(id: string) {
      return request<{ status: string }>(`/shops/${shopId}/customers/${id}`, {
        method: "DELETE",
      });
    },
    createCustomer(data: { name: string; phone?: string; gender?: string; notes?: string; naver_booking_id?: string }) {
      return request<Customer>(`/shops/${shopId}/customers`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    // Treatments
    getTreatments(customerId?: string, date?: string, options?: { compact?: boolean }) {
      const searchParams = new URLSearchParams();
      if (customerId) searchParams.set("customer_id", customerId);
      if (date) searchParams.set("date", date);
      if (options?.compact) searchParams.set("compact", "true");
      const qs = searchParams.toString();
      return request<Treatment[]>(`/shops/${shopId}/treatments${qs ? `?${qs}` : ""}`);
    },
    getTreatment(id: string) {
      return request<Treatment>(`/shops/${shopId}/treatments/${id}`);
    },
    updateTreatment(id: string, data: Partial<{
      service_type: string;
      service_detail: string;
      products_used: ProductUsed[];
      area: string;
      duration_minutes: number;
      price: number;
      satisfaction: string;
      customer_notes: string;
      ai_summary: string;
      next_visit_recommendation: string;
    }>) {
      return request<Treatment>(`/shops/${shopId}/treatments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    deleteTreatment(id: string) {
      return request<{ status: string }>(`/shops/${shopId}/treatments/${id}`, {
        method: "DELETE",
      });
    },
    createTreatment(data: {
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
      return request<Treatment>(`/shops/${shopId}/treatments`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    async uploadTreatmentPhoto(
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
        `${API_BASE}/shops/${shopId}/treatments/${treatmentId}/photos`,
        { method: "POST", body: formData }
      );
      if (!res.ok) throw new Error("Failed to upload media");
      return res.json() as Promise<TreatmentPhoto>;
    },
    updatePhoto(
      treatmentId: string,
      photoId: string,
      data: { annotations?: PhotoAnnotation[] }
    ) {
      return request<TreatmentPhoto>(
        `/shops/${shopId}/treatments/${treatmentId}/photos/${photoId}`,
        { method: "PATCH", body: JSON.stringify(data) }
      );
    },

    // Portfolio
    getPortfolio(publishedOnly: boolean = false) {
      return request<PortfolioItem[]>(
        `/shops/${shopId}/portfolio?published_only=${publishedOnly}`
      );
    },
    createPortfolioItem(data: {
      photo_id: string;
      title?: string;
      description?: string;
      tags?: string[];
    }) {
      return request<PortfolioItem>(`/shops/${shopId}/portfolio`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    togglePortfolioPublish(id: string) {
      return request<PortfolioItem>(`/shops/${shopId}/portfolio/${id}/publish`, {
        method: "PUT",
      });
    },
    deletePortfolioItem(id: string) {
      return request<{ status: string }>(`/shops/${shopId}/portfolio/${id}`, {
        method: "DELETE",
      });
    },

    // Face Models
    getFaceModels() {
      return request<FaceModel[]>(`/shops/${shopId}/face-models`);
    },
    async uploadFaceModel(name: string, gender: string, file: File): Promise<FaceModel> {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("gender", gender);
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/shops/${shopId}/face-models`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(error.detail || "Failed to upload face model");
      }
      return res.json();
    },
    deleteFaceModel(id: string) {
      return request<{ status: string }>(`/shops/${shopId}/face-models/${id}`, {
        method: "DELETE",
      });
    },

    // Reservations
    getReservations(date?: string, status?: string, skip?: number, limit?: number) {
      const p = new URLSearchParams();
      if (date) p.set("date", date);
      if (status) p.set("status", status);
      if (skip != null && skip > 0) p.set("skip", String(skip));
      if (limit != null && limit > 0) p.set("limit", String(limit));
      const qs = p.toString();
      return request<Reservation[]>(
        `/shops/${shopId}/reservations${qs ? `?${qs}` : ""}`
      );
    },
    getReservation(id: string) {
      return request<Reservation>(`/shops/${shopId}/reservations/${id}`);
    },
    createReservation(data: {
      customer_id: string;
      member_id?: string;
      scheduled_date: string;
      scheduled_time: string;
      estimated_duration_minutes?: number;
      service_type?: string;
      service_detail?: string;
      notes?: string;
      source?: string;
    }) {
      return request<Reservation>(`/shops/${shopId}/reservations`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    updateReservation(
      id: string,
      data: Partial<{
        customer_id: string;
        member_id: string;
        treatment_id: string;
        scheduled_date: string;
        scheduled_time: string;
        estimated_duration_minutes: number;
        service_type: string;
        service_detail: string;
        notes: string;
        source: string;
        status: string;
      }>
    ) {
      return request<Reservation>(`/shops/${shopId}/reservations/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    deleteReservation(id: string) {
      return request<{ status: string }>(`/shops/${shopId}/reservations/${id}`, {
        method: "DELETE",
      });
    },
    startTreatmentFromReservation(
      reservationId: string,
      data?: { service_type?: string; member_id?: string }
    ) {
      return request<{ treatment: Treatment; reservation: Reservation }>(
        `/shops/${shopId}/reservations/${reservationId}/start-treatment`,
        {
          method: "POST",
          body: data ? JSON.stringify(data) : undefined,
        }
      );
    },

    // Members
    getMembers() {
      return request<ShopMember[]>(`/shops/${shopId}/members`);
    },

    // Member Profile
    getMemberProfile(memberId: string) {
      return request<MemberProfile>(`/shops/${shopId}/members/${memberId}/profile`);
    },
    updateMemberProfile(memberId: string, data: Partial<Omit<MemberProfile, "display_name" | "phone">>) {
      return request<MemberProfile>(`/shops/${shopId}/members/${memberId}/profile`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    async uploadProfilePhoto(memberId: string, file: File): Promise<{ profile_photo_url: string }> {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/shops/${shopId}/members/${memberId}/profile/photo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(error.detail || "프로필 사진 업로드에 실패했습니다.");
      }
      return res.json();
    },

    // Service Categories & Services
    getServiceCategories() {
      return request<ServiceCategory[]>(`/shops/${shopId}/services/categories`);
    },
    createServiceCategory(data: { name: string; icon?: string; sort_order?: number }) {
      return request<ServiceCategory>(`/shops/${shopId}/services/categories`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    updateServiceCategory(categoryId: string, data: Partial<{ name: string; icon: string; sort_order: number }>) {
      return request<ServiceCategory>(`/shops/${shopId}/services/categories/${categoryId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    deleteServiceCategory(categoryId: string) {
      return request<{ status: string }>(`/shops/${shopId}/services/categories/${categoryId}`, {
        method: "DELETE",
      });
    },
    createService(data: { category_id: string; name: string; estimated_duration_minutes?: number; price?: number; sort_order?: number }) {
      return request<ShopService>(`/shops/${shopId}/services`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    updateService(serviceId: string, data: Partial<{ name: string; estimated_duration_minutes: number | null; price: number | null; sort_order: number }>) {
      return request<ShopService>(`/shops/${shopId}/services/${serviceId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    deleteService(serviceId: string) {
      return request<{ status: string }>(`/shops/${shopId}/services/${serviceId}`, {
        method: "DELETE",
      });
    },
  };
}

// ---------- Non-shop-scoped APIs ----------

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

export function generateFaceSwap(
  treatmentPhotoId: string,
  faceModelId: string,
  count: number = 2
) {
  return request<FaceSwapGenerateResult>(`/face-swap/generate`, {
    method: "POST",
    body: JSON.stringify({
      treatment_photo_id: treatmentPhotoId,
      face_model_id: faceModelId,
      count,
    }),
  });
}

export function saveFaceSwapResult(data: {
  treatment_photo_id: string;
  face_model_id: string;
  result_url: string;
}) {
  return request<FaceSwapResult>(`/face-swap/results`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getFaceSwapResults(treatmentPhotoId: string) {
  return request<FaceSwapResult[]>(
    `/face-swap/results?treatment_photo_id=${encodeURIComponent(treatmentPhotoId)}`
  );
}

export function selectFaceSwapResult(resultId: string) {
  return request<{ portfolio_id: string; result_id: string }>(
    `/face-swap/results/${resultId}/select`,
    { method: "POST" }
  );
}

// Explore (cross-shop public portfolio)
export interface ExplorePortfolioItem {
  id: string;
  title: string | null;
  description: string | null;
  tags: string[] | null;
  is_published: boolean;
  created_at: string;
  photo: TreatmentPhoto;
  shop: {
    id: string;
    name: string;
    shop_type: string;
  };
  designer?: DesignerBadge | null;
}

export function getExplorePortfolio(params?: {
  shop_type?: string;
  search?: string;
  skip?: number;
  limit?: number;
}) {
  const p = new URLSearchParams();
  if (params?.shop_type) p.set("shop_type", params.shop_type);
  if (params?.search) p.set("search", params.search);
  if (params?.skip != null) p.set("skip", String(params.skip));
  if (params?.limit != null) p.set("limit", String(params.limit));
  const qs = p.toString();
  return request<ExplorePortfolioItem[]>(`/explore/portfolio${qs ? `?${qs}` : ""}`);
}

// Designer public profile
export interface DesignerPublicProfile {
  member_id: string;
  display_name: string;
  specialty: string | null;
  phone: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  career_history: CareerEntry[];
  certifications: CertificationEntry[];
  sns_links: SnsLinks;
  show_contact: boolean;
  shop: { id: string; name: string; shop_type: string };
  portfolios: ExplorePortfolioItem[];
}

export function getDesignerPublicProfile(memberId: string) {
  return request<DesignerPublicProfile>(`/explore/designer/${memberId}`);
}

// Shop creation (no shop context needed)
export function createShop(data: {
  name: string;
  shop_type: string;
  address?: string;
  phone?: string;
  display_name?: string;
}) {
  return request<{ id: string; name: string; shop_type: string }>(
    `/shops`,
    { method: "POST", body: JSON.stringify(data) }
  );
}
