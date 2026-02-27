# Database Schema -- Note-a-Style (노터스타일)

> 최종 업데이트: 2026-02-28
> 정의 위치: `supabase/migrations/` (23개 마이그레이션)

---

## 1. 개요

- **DBMS**: PostgreSQL 15+ (Supabase)
- **Primary Key**: 모든 테이블 UUID (`gen_random_uuid()`)
  - 예외: `app_settings`는 TEXT PK (`key`)
- **Timestamps**: `created_at` (필수), `updated_at` (트리거 자동 갱신 -- 9개 테이블 적용)
- **Soft Delete 정책**: `treatment_photos`만 `deleted_at` 컬럼으로 soft delete. 나머지는 hard delete.
- **RLS**: `user_roles`, `app_settings`만 RLS 활성화. 나머지는 API Routes의 `withShopAuth`/`requireAuth`로 접근 제어.
- **Storage**: Supabase Storage (`treatment-photos` 버킷)
- **Extensions**: `pg_trgm` (고객 검색용 trigram 인덱스)
- **인증**: Supabase Auth (`auth.users` 테이블 연동)

---

## 2. ER 다이어그램

### 4개 도메인

```
┌─────────────────────────────────────────────────────────────────┐
│  인증 도메인 (Authentication)                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │  auth.users   │──<│ user_profiles│   │  user_roles  │        │
│  │  (Supabase)   │──<│              │   │              │        │
│  └──────┬───────┘   └──────────────┘   └──────────────┘        │
│         │                                                       │
│         │ 1:N                                                   │
│         ▼                                                       │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │ shop_members  │────────<│member_profiles│                     │
│  │ (user+shop)   │         └──────────────┘                     │
│  └──────┬───────┘                                               │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
┌─────────┼───────────────────────────────────────────────────────┐
│  매장/고객 도메인 (Shop & Customer)                                │
│         │                                                       │
│  ┌──────▼───────┐                                               │
│  │    shops     │──< shop_invitations                           │
│  │              │──< shop_audit_logs                            │
│  │              │──< shop_service_categories ──< shop_services  │
│  └──────┬───────┘                                               │
│         │ 1:N                                                   │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │  customers   │                                               │
│  └──────┬───────┘                                               │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
┌─────────┼───────────────────────────────────────────────────────┐
│  시술/사진 도메인 (Treatment & Photo)                              │
│         │                                                       │
│  ┌──────▼───────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ reservations │────>│  treatments  │────<│treatment_     │    │
│  │              │     │  (핵심 엔티티)│     │photos         │    │
│  └──────────────┘     └──────────────┘     └──────┬───────┘    │
│                                                    │            │
│                                             ┌──────▼───────┐   │
│                                             │  portfolios  │   │
│                                             └──────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  AI 도메인 (AI & Face Swap)                                      │
│                                                                 │
│  ┌──────────────┐     ┌──────────────────┐                     │
│  │ai_face_models│────<│face_swap_results │                     │
│  │ (소스 얼굴)   │     │(treatment_photo  │                     │
│  └──────────────┘     │ + face_model)    │                     │
│                       └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  시스템 도메인 (System)                                           │
│  ┌──────────────┐                                               │
│  │ app_settings │  (key-value, RLS 적용)                        │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 관계 요약

| 관계 | FK | 설명 |
|------|-----|------|
| Shop 1:N Customer | customers.shop_id | 매장별 고객 |
| Shop 1:N ShopMember | shop_members.shop_id | 매장별 멤버 (N:M with auth.users) |
| Customer 1:N Treatment | treatments.customer_id | 고객별 시술 |
| Treatment 1:N TreatmentPhoto | treatment_photos.treatment_id | 시술별 사진 (CASCADE) |
| TreatmentPhoto 1:N Portfolio | portfolios.photo_id | 사진 → 포트폴리오 |
| TreatmentPhoto 1:N FaceSwapResult | face_swap_results.treatment_photo_id | 사진 → AI 결과 |
| Reservation 0..1:1 Treatment | reservations.treatment_id | 예약 → 시술 (선택) |
| ShopMember 0..1:N Treatment | treatments.member_id | 담당 멤버 (선택) |
| ShopMember 1:1 MemberProfile | member_profiles.member_id | 디자이너 프로필 |
| ShopServiceCategory 1:N ShopService | shop_services.category_id | 서비스 분류 |

---

## 3. 테이블 상세 (17개)

### 3.1 shops (매장)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 매장 고유 ID |
| name | varchar(200) | NOT NULL | -- | 매장명 |
| shop_type | varchar(50) | NOT NULL | -- | `hair` / `nail` / `skin` / `scalp` |
| address | varchar(500) | NULL | -- | 주소 |
| phone | varchar(20) | NULL | -- | 전화번호 |
| subscription_plan | varchar(20) | NOT NULL | `'basic'` | `basic` / `premium` |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | 수정일시 (트리거) |

**트리거**: `shops_updated_at` -- UPDATE 시 `updated_at` 자동 갱신

---

### 3.2 shop_members (매장 멤버)

> `designers` 테이블을 대체 (마이그레이션 014). auth.users와 shops의 N:M 관계.

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 멤버 고유 ID |
| user_id | uuid | NOT NULL, FK → auth.users | -- | Supabase Auth 사용자 |
| shop_id | uuid | NOT NULL, FK → shops | -- | 소속 매장 |
| role | text | NOT NULL | `'designer'` | `owner` / `admin` / `designer` / `assistant` |
| display_name | varchar(100) | NOT NULL | -- | 표시 이름 |
| specialty | varchar(100) | NULL | -- | 전문 분야 (예: 염색, 펌) |
| phone | varchar(20) | NULL | -- | 연락처 |
| invited_by | uuid | NULL, FK → auth.users | -- | 초대한 사용자 |
| is_active | boolean | NOT NULL | true | 활성 상태 |
| joined_at | timestamptz | NOT NULL | now() | 가입일시 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | 수정일시 (트리거) |

**제약**: UNIQUE(user_id, shop_id) -- 한 사용자는 하나의 매장에 1개 멤버십
**CHECK**: role IN ('owner', 'admin', 'designer', 'assistant')
**인덱스**: `idx_shop_members_user_id`, `idx_shop_members_shop_id`
**트리거**: `shop_members_updated_at`

**역할 계층**:
| 역할 | 권한 |
|------|------|
| owner | 전체 권한 + 매장 삭제 + 멤버 역할 변경 |
| admin | 멤버 관리 + 서비스 설정 + 초대 생성 |
| designer | 고객/시술/예약 CRUD + 포트폴리오 |
| assistant | 고객/시술/예약 CRUD (읽기 중심) |

---

### 3.3 customers (고객)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 고객 고유 ID |
| shop_id | uuid | NOT NULL, FK → shops | -- | 소속 매장 |
| name | varchar(100) | NOT NULL | -- | 이름 |
| phone | varchar(20) | NULL | -- | 전화번호 |
| gender | varchar(10) | NULL | -- | 성별 |
| birth_date | varchar(10) | NULL | -- | 생년월일 (YYYY-MM-DD) |
| notes | text | NULL | -- | 메모 |
| naver_booking_id | varchar(100) | NULL | -- | 네이버 예약 ID |
| visit_count | integer | NOT NULL | 0 | 방문 횟수 (RPC 증가) |
| last_visit | timestamptz | NULL | -- | 최근 방문일 (RPC 갱신) |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | 수정일시 (트리거) |

**인덱스**: `idx_customers_shop_id`, `idx_customers_name`, `idx_customers_shop_phone` (composite), `idx_customers_shop_name` (composite), `idx_customers_phone_trgm` (GIN), `idx_customers_name_trgm` (GIN)
**FK**: shop_id → shops(id) ON DELETE CASCADE
**트리거**: `customers_updated_at`

---

### 3.4 treatments (시술 기록) -- 핵심 엔티티

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 시술 고유 ID |
| customer_id | uuid | NOT NULL, FK → customers | -- | 고객 |
| shop_id | uuid | NOT NULL, FK → shops | -- | 매장 |
| member_id | uuid | NULL, FK → shop_members | -- | 담당 멤버 |
| service_type | varchar(50) | NOT NULL | -- | 시술 종류 |
| service_detail | varchar(200) | NULL | -- | 상세 시술 내용 |
| products_used | jsonb | NULL | -- | 사용 제품 (아래 구조 참조) |
| area | varchar(100) | NULL | -- | 시술 부위 |
| duration_minutes | integer | NULL | -- | 소요 시간 (분) |
| price | integer | NULL | -- | 가격 (원) |
| satisfaction | varchar(20) | NULL | -- | `high` / `medium` / `low` |
| customer_notes | text | NULL | -- | 고객/시술 메모 |
| voice_memo_text | text | NULL | -- | 음성 메모 텍스트 (변환 후 원본 삭제) |
| ai_summary | text | NULL | -- | AI 생성 요약 |
| next_visit_recommendation | varchar(100) | NULL | -- | 다음 방문 추천 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | 수정일시 (트리거) |

**인덱스**: `idx_treatments_shop_id`, `idx_treatments_customer_id`, `idx_treatments_created_at` (DESC), `idx_treatments_member_id`
**트리거**: `treatments_updated_at`

**products_used JSONB 구조**:
```json
[
  { "brand": "로레알", "code": "7.1", "area": "뿌리" },
  { "brand": "웰라", "code": null, "area": "전체" }
]
```

---

### 3.5 treatment_photos (시술 사진/영상)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 사진 고유 ID |
| treatment_id | uuid | NOT NULL, FK → treatments | -- | 시술 (CASCADE) |
| photo_url | varchar(500) | NOT NULL | -- | 원본 URL |
| photo_type | varchar(20) | NOT NULL | -- | `before` / `during` / `after` / `source` |
| face_swapped_url | varchar(500) | NULL | -- | AI 페이스 스왑 결과 URL |
| is_portfolio | boolean | NOT NULL | false | 포트폴리오 등록 여부 |
| caption | varchar(300) | NULL | -- | 설명 |
| taken_at | timestamptz | NOT NULL | now() | 촬영 시점 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |
| media_type | varchar(10) | NOT NULL | `'photo'` | `photo` / `video` |
| video_duration_seconds | integer | NULL | -- | 영상 길이 (초) |
| thumbnail_url | varchar(500) | NULL | -- | 영상 썸네일 URL |
| annotations | jsonb | NULL | `'[]'::jsonb` | 스타일 노트 (아래 구조 참조) |
| deleted_at | timestamptz | NULL | -- | Soft delete 시점 |

**인덱스**: `idx_treatment_photos_treatment_id`, `idx_treatment_photos_deleted_at` (partial, WHERE deleted_at IS NOT NULL)
**CHECK**: `check_photo_type` (before/during/after/source), `check_media_type` (photo/video)
**FK**: treatment_id → treatments(id) ON DELETE CASCADE

**annotations JSONB 구조**:
```json
[
  { "id": "uuid", "x": 45.2, "y": 30.1, "text": "뿌리 염색 7.1" }
]
```
- `x`, `y`: 0-100 범위 (사진 내 상대 위치 %)
- 최대 10개, 텍스트 최대 50자

**Soft Delete 정책**:
- `DELETE /photos/{id}` → `deleted_at = now()` (soft delete)
- 7일 후 `GET /api/cron/cleanup-trash` → 스토리지 + DB에서 영구 삭제
- `PATCH /trash/{id}` → `deleted_at = null` (복원)

---

### 3.6 portfolios (포트폴리오)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 포트폴리오 고유 ID |
| shop_id | uuid | NOT NULL, FK → shops | -- | 매장 |
| photo_id | uuid | NOT NULL, FK → treatment_photos | -- | 원본 사진 |
| member_id | uuid | NULL, FK → shop_members | -- | 담당 멤버 |
| title | varchar(200) | NULL | -- | 제목 |
| description | text | NULL | -- | 설명 |
| tags | jsonb | NULL | -- | `["염색", "로레알"]` |
| is_published | boolean | NOT NULL | false | 공개 여부 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |

**인덱스**: `idx_portfolios_shop_id`

---

### 3.7 reservations (예약)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 예약 고유 ID |
| shop_id | uuid | NOT NULL, FK → shops | -- | 매장 (CASCADE) |
| customer_id | uuid | NOT NULL, FK → customers | -- | 고객 |
| member_id | uuid | NULL, FK → shop_members | -- | 담당 멤버 |
| treatment_id | uuid | NULL, FK → treatments | -- | 연결된 시술 |
| scheduled_date | date | NOT NULL | -- | 예약일 |
| scheduled_time | time | NOT NULL | -- | 예약 시간 |
| estimated_duration_minutes | integer | NULL | 60 | 예상 소요시간 (분) |
| service_type | varchar(50) | NULL | -- | 시술 종류 |
| service_detail | varchar(200) | NULL | -- | 상세 내용 |
| notes | text | NULL | -- | 메모 |
| source | varchar(20) | NOT NULL | `'manual'` | `manual` / `naver_booking` / `api` |
| status | varchar(20) | NOT NULL | `'scheduled'` | 상태 (아래 참조) |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | 수정일시 (트리거) |

**인덱스**: `idx_reservations_shop_date` (shop_id, scheduled_date), `idx_reservations_customer`, `idx_reservations_status`, `idx_reservations_member_id`
**트리거**: `reservations_updated_at`

**예약 상태 머신**:
```
scheduled → confirmed → completed
    │                      ↑
    └── cancelled     (start-treatment 시)
```
- `scheduled`: 초기 상태 (수동 또는 API 생성)
- `confirmed`: 확인됨
- `completed`: 시술 완료 (start-treatment API 호출 시 자동 전환)
- `cancelled`: 취소됨

---

### 3.8 user_profiles (글로벌 사용자 프로필)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 프로필 ID |
| user_id | uuid | NOT NULL UNIQUE, FK → auth.users | -- | Supabase Auth 사용자 |
| full_name | varchar(100) | NOT NULL | -- | 이름 |
| avatar_url | text | NULL | -- | 프로필 사진 URL |
| phone | varchar(20) | NULL | -- | 전화번호 |
| bio | text | NULL | -- | 자기소개 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | 수정일시 (트리거) |

**인덱스**: `idx_user_profiles_user_id`
**트리거**: `user_profiles_updated_at`

---

### 3.9 member_profiles (디자이너 공개 프로필)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 프로필 ID |
| member_id | uuid | NOT NULL UNIQUE, FK → shop_members | -- | 매장 멤버 (CASCADE) |
| profile_photo_url | text | NULL | -- | 프로필 사진 URL |
| bio | text | NULL | -- | 자기소개 |
| career_history | jsonb | NOT NULL | `'[]'` | 경력 (아래 구조) |
| certifications | jsonb | NOT NULL | `'[]'` | 자격증 (아래 구조) |
| sns_links | jsonb | NOT NULL | `'{}'` | SNS 링크 (아래 구조) |
| show_contact | boolean | NOT NULL | false | 연락처 공개 여부 |
| is_public | boolean | NOT NULL | false | 프로필 공개 여부 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | 수정일시 (트리거) |

**트리거**: `member_profiles_updated_at`

**JSONB 구조**:
```json
// career_history
[{ "title": "수석 디자이너", "duration": "2020-2024", "description": "염색 전문" }]

// certifications
[{ "name": "미용사 1급", "issuer": "한국산업인력공단", "date": "2020-03" }]

// sns_links
{ "instagram": "https://instagram.com/...", "blog": "https://..." }
```

---

### 3.10 user_roles (관리자 권한)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 역할 ID |
| user_id | uuid | NOT NULL UNIQUE, FK → auth.users | -- | 대상 사용자 (CASCADE) |
| role | text | NOT NULL | `'user'` | `user` / `admin` / `super_admin` |
| granted_by | uuid | NULL, FK → auth.users | -- | 권한 부여자 |
| granted_at | timestamptz | NOT NULL | now() | 부여 시점 |
| notes | text | NULL | -- | 메모 |

**CHECK**: role IN ('user', 'admin', 'super_admin')
**RLS**: 활성화
- SELECT: 본인 역할 조회 + 관리자 전체 조회
- INSERT/UPDATE/DELETE: 관리자만

---

### 3.11 shop_invitations (매장 초대)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 초대 ID |
| shop_id | uuid | NOT NULL, FK → shops | -- | 대상 매장 (CASCADE) |
| token | varchar(64) | NOT NULL UNIQUE | -- | 초대 토큰 |
| role | text | NOT NULL | `'designer'` | `admin` / `designer` / `assistant` |
| created_by | uuid | NOT NULL, FK → auth.users | -- | 생성자 |
| expires_at | timestamptz | NOT NULL | -- | 만료 시점 |
| max_uses | integer | NOT NULL | 1 | 최대 사용 횟수 |
| use_count | integer | NOT NULL | 0 | 현재 사용 횟수 |
| is_active | boolean | NOT NULL | true | 활성 상태 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |

**CHECK**: role IN ('admin', 'designer', 'assistant') -- owner 초대 불가
**인덱스**: `idx_shop_invitations_token`, `idx_shop_invitations_shop_id`

---

### 3.12 ai_face_models (AI 페이스 모델)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 모델 ID |
| shop_id | uuid | NOT NULL, FK → shops | -- | 소속 매장 (CASCADE) |
| name | varchar(100) | NOT NULL | -- | 모델 이름 |
| gender | varchar(10) | NOT NULL | -- | 성별 |
| image_url | varchar(500) | NOT NULL | -- | 소스 이미지 URL |
| is_active | boolean | NOT NULL | true | 활성 상태 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |

**인덱스**: `idx_ai_face_models_shop_id`

---

### 3.13 face_swap_results (페이스 스왑 결과)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 결과 ID |
| treatment_photo_id | uuid | NOT NULL, FK → treatment_photos | -- | 원본 사진 (CASCADE) |
| face_model_id | uuid | NOT NULL, FK → ai_face_models | -- | 사용된 페이스 모델 |
| result_url | varchar(500) | NOT NULL | -- | 결과 이미지 URL |
| is_selected | boolean | NOT NULL | false | 선택 여부 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |

**인덱스**: `idx_face_swap_results_photo`

---

### 3.14 shop_service_categories (서비스 대분류)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 카테고리 ID |
| shop_id | uuid | NOT NULL, FK → shops | -- | 매장 (CASCADE) |
| name | varchar(100) | NOT NULL | -- | 카테고리명 |
| icon | varchar(10) | NULL | -- | 이모지 아이콘 |
| sort_order | integer | NOT NULL | 0 | 정렬 순서 |
| is_active | boolean | NOT NULL | true | 활성 상태 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | 수정일시 (트리거) |

**제약**: UNIQUE(shop_id, name)
**인덱스**: `idx_shop_service_categories_shop_id`
**트리거**: `shop_service_categories_updated_at`

---

### 3.15 shop_services (서비스 소분류)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 서비스 ID |
| category_id | uuid | NOT NULL, FK → shop_service_categories | -- | 소속 카테고리 (CASCADE) |
| shop_id | uuid | NOT NULL, FK → shops | -- | 매장 (CASCADE) |
| name | varchar(100) | NOT NULL | -- | 서비스명 |
| estimated_duration_minutes | integer | NULL | -- | 예상 소요시간 (분) |
| price | integer | NULL | -- | 가격 (원) |
| sort_order | integer | NOT NULL | 0 | 정렬 순서 |
| is_active | boolean | NOT NULL | true | 활성 상태 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | 수정일시 (트리거) |

**제약**: UNIQUE(category_id, name)
**인덱스**: `idx_shop_services_category_id`, `idx_shop_services_shop_id`
**트리거**: `shop_services_updated_at`

---

### 3.16 shop_audit_logs (감사 로그)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 로그 ID |
| shop_id | uuid | NOT NULL, FK → shops | -- | 매장 (CASCADE) |
| actor_id | uuid | NOT NULL, FK → auth.users | -- | 행위자 |
| action | text | NOT NULL | -- | 액션명 (아래 참조) |
| target_type | text | NULL | -- | 대상 테이블명 |
| target_id | uuid | NULL | -- | 대상 레코드 ID |
| details | jsonb | NULL | -- | 상세 내용 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |

**인덱스**: `idx_shop_audit_logs_shop_id`, `idx_shop_audit_logs_created_at`

**기록되는 액션**:
- `shop.created` -- 매장 생성
- `member.updated` -- 멤버 역할 변경
- `member.deactivated` -- 멤버 비활성화
- `member.joined` -- 초대 수락
- `invitation.created` -- 초대 생성
- `invitation.revoked` -- 초대 취소

---

### 3.17 app_settings (사이트 설정)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **key** | text | PK | -- | 설정 키 |
| value | jsonb | NOT NULL | `'{}'::jsonb` | 설정 값 |
| updated_at | timestamptz | NOT NULL | now() | 수정일시 (트리거) |

**RLS**: 활성화
- SELECT: 모든 사용자 (public)
- INSERT/UPDATE/DELETE: 관리자만 (`is_admin()`)

**트리거**: `app_settings_updated_at`

---

## 4. Helper Functions & RPC (7개)

### 4.1 update_updated_at() -- 트리거 함수

```sql
-- 9개 테이블에 적용: shops, customers, treatments, user_profiles,
-- shop_members, member_profiles, shop_service_categories, shop_services, reservations
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4.2 increment_visit_count(cid uuid)

```sql
-- 시술 생성 시 API에서 호출
-- 고객의 visit_count +1, last_visit = now()
CREATE OR REPLACE FUNCTION increment_visit_count(cid uuid) RETURNS void AS $$
BEGIN
  UPDATE customers SET visit_count = visit_count + 1, last_visit = now() WHERE id = cid;
END;
$$ LANGUAGE plpgsql;
```

### 4.3 is_admin(check_user_id uuid) -- SECURITY DEFINER

```sql
-- RLS 정책에서 사용 (user_roles, app_settings)
-- user_roles 테이블에서 admin/super_admin 확인
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = check_user_id AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### 4.4 is_shop_member(check_user_id uuid, check_shop_id uuid) -- SECURITY DEFINER

```sql
-- 활성 멤버십 확인
CREATE OR REPLACE FUNCTION is_shop_member(check_user_id UUID, check_shop_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shop_members WHERE user_id = check_user_id AND shop_id = check_shop_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### 4.5 get_shop_role(check_user_id uuid, check_shop_id uuid) -- SECURITY DEFINER

```sql
-- 사용자의 매장 내 역할 조회 (없으면 NULL)
CREATE OR REPLACE FUNCTION get_shop_role(check_user_id UUID, check_shop_id UUID) RETURNS TEXT AS $$
DECLARE member_role TEXT;
BEGIN
  SELECT role INTO member_role FROM shop_members
  WHERE user_id = check_user_id AND shop_id = check_shop_id AND is_active = true;
  RETURN member_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### 4.6 seed_default_services(p_shop_id uuid, p_shop_type text)

```sql
-- 매장 생성 시 기본 서비스 자동 생성
-- hair: 커트, 염색, 펌, 트리트먼트, 블리치, 두피관리
-- nail: 네일, 페디큐어, 기타
-- skin/scalp: 기본관리, 기타
-- Idempotent: 이미 카테고리가 있으면 건너뜀
```

### 4.7 update_app_settings_updated_at() -- 트리거 함수

```sql
-- app_settings 전용 updated_at 트리거
```

---

## 5. Supabase Storage 구조

```
treatment-photos/                    # 버킷명 (단일 버킷)
├── {treatment_id}/{filename}        # 시술 사진/영상
├── face-models/{model_id}/{fn}      # 페이스 모델 소스 이미지
└── members/{member_id}/{fn}         # 멤버 프로필 사진
```

- **최대 파일 크기**: 10MB (사진), 5MB (프로필 사진)
- **허용 타입**: image/jpeg, image/png, image/webp, image/heic, video/webm, video/mp4, video/quicktime
- **접근**: service_role 키 (API Routes), 공개 URL 제공
- **URL 형식**: `{SUPABASE_URL}/storage/v1/object/public/treatment-photos/{path}`

---

## 6. 마이그레이션 히스토리 (23개)

| 번호 | 파일 | 내용 |
|------|------|------|
| 001 | `initial_schema.sql` | shops, designers, customers, treatments, treatment_photos, portfolios + 인덱스 + 트리거 |
| 002 | `helper_functions.sql` | increment_visit_count RPC |
| 003 | `video_support.sql` | treatment_photos에 media_type, video_duration_seconds, thumbnail_url |
| 004 | `designers_specialty.sql` | designers.specialty 추가 |
| 005 | `treatments_updated_at.sql` | treatments.updated_at + 트리거 |
| 006 | `voice_memo_text.sql` | voice_memo_url → voice_memo_text (프라이버시) |
| 007 | `photo_type_check.sql` | treatment_photos.photo_type CHECK 제약 |
| 008 | `designer_id_index.sql` | treatments.designer_id 인덱스 |
| 009 | `face_swap_models.sql` | ai_face_models, face_swap_results 테이블 |
| 010 | `reservations.sql` | reservations 테이블 |
| 011 | `user_roles.sql` | user_roles + is_admin() + RLS |
| 012 | `user_profiles.sql` | user_profiles 테이블 |
| 013 | `drop_designers.sql` | designers 테이블 삭제, designer_id FK 제거 |
| 014 | `shop_members.sql` | shop_members 테이블, treatments/reservations에 member_id FK 추가 |
| 015 | `shop_invitations.sql` | shop_invitations 테이블 |
| 016 | `shop_audit_logs.sql` | shop_audit_logs 테이블 |
| 017 | `shop_helper_functions.sql` | is_shop_member(), get_shop_role() |
| 018 | `photo_annotations.sql` | treatment_photos.annotations JSONB |
| 019 | `shop_services.sql` | shop_service_categories, shop_services + seed_default_services() |
| 020 | `app_settings.sql` | app_settings + RLS |
| 021 | `member_profiles.sql` | member_profiles, portfolios.member_id |
| 022 | `customer_search_indexes.sql` | pg_trgm 확장, composite/GIN 인덱스 |
| 023 | `photo_soft_delete.sql` | treatment_photos.deleted_at + partial index |

### 진화 요약

| 단계 | 마이그레이션 | 주요 변화 |
|------|------------|----------|
| 초기 (Core) | 001-003 | 6개 핵심 테이블 + 비디오 지원 |
| 보완 | 004-008 | 필드/인덱스/제약 추가 |
| AI | 009 | 페이스 스왑 모델 + 결과 |
| 예약 | 010 | 예약 시스템 |
| 인증 전환 | 011-017 | Supabase Auth, designers → shop_members, 초대, 감사 로그 |
| 고도화 | 018-020 | 어노테이션, 서비스 메뉴, 사이트 설정 |
| 최적화 | 021-023 | 디자이너 프로필, 검색 인덱스, soft delete |

---

## 7. TypeScript 인터페이스 참조

> 정의 위치: `frontend/src/lib/api.ts`, `frontend/src/types/media.ts`, `frontend/src/contexts/`

```typescript
// 사용 제품 (DB jsonb 1:1 매핑)
interface ProductUsed {
  brand: string;
  code?: string | null;
  area?: string | null;
}

// 사진 어노테이션 (DB jsonb 1:1 매핑)
interface PhotoAnnotation {
  id: string;
  x: number;    // 0-100 (사진 내 상대 위치 %)
  y: number;    // 0-100
  text: string; // 최대 50자
}

// 매장 멤버십 (ShopContext)
interface ShopMembership {
  member_id: string;
  shop_id: string;
  shop_name: string;
  shop_type: string;
  role: "owner" | "admin" | "designer" | "assistant";
  display_name: string;
  specialty: string | null;
}

// 미디어 캡처 (카메라)
interface CapturedMedia {
  blob: Blob;
  type: "photo" | "video";
  thumbnailBlob?: Blob;
  durationSeconds?: number;
  previewUrl: string;
  photoType: string;
}
```

---

## 8. 비즈니스 로직 재점검 노트

### designers → shop_members 전환
- 역할 모델(owner/admin/designer/assistant) 4단계로 비즈니스 요구 충족
- `withShopAuth(roles)` 데코레이터로 역할별 접근 제어 구현
- owner만 다른 사용자에게 admin 이상 역할 부여 가능

### 예약 상태 머신
- `scheduled → confirmed → completed`, `scheduled → cancelled` 흐름
- `start-treatment` API에서 예약을 시술로 전환하며 상태를 `completed`로 변경
- `confirmed` 상태는 수동으로 설정 가능하나 실질적으로 `scheduled`와 동일하게 동작

### Soft delete 정책
- `treatment_photos`만 soft delete (7일 보관) -- 실수로 삭제한 사진 복원 가능
- 나머지 테이블은 hard delete -- 고객/시술/예약 삭제 시 즉시 삭제
- `shop_members`, `ai_face_models`, `shop_service_categories`, `shop_services`는 `is_active` 플래그로 비활성화 (soft deactivation, 다른 개념)

### RLS vs API 인증
- `user_roles`, `app_settings`만 RLS 활성화 (관리자 전용 테이블)
- 나머지 테이블은 `service_role` 키로 접근하므로 RLS가 아닌 API Routes의 `withShopAuth`/`requireAuth`로 인증/인가 처리
