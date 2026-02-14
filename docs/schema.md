# Database Schema -- Note-a-Style (노터스타일)

> 최종 업데이트: 2026-02-14
> 정의 위치: `supabase/migrations/`

---

## 1. 개요

- **DBMS**: PostgreSQL (Supabase)
- **Primary Key**: 모든 테이블 UUID (`gen_random_uuid()`)
- **Timestamps**: `created_at` (필수), `updated_at` (shops, customers만 트리거 적용)
- **Storage**: Supabase Storage (`treatment-photos` 버킷)

---

## 2. ER 다이어그램

```
┌──────────┐     ┌────────────┐     ┌─────────────┐
│  shops   │────<│ designers  │     │  customers  │
│          │     │            │     │             │
│          │────<│            │     │             │
└────┬─────┘     └─────┬──────┘     └──────┬──────┘
     │                 │                    │
     │    ┌────────────┼────────────────────┘
     │    │            │
     ▼    ▼            ▼
┌──────────────────────────┐
│      treatments          │  ← 핵심 엔티티
│                          │
└────────────┬─────────────┘
             │
     ┌───────┴───────┐
     ▼               ▼
┌──────────────┐  ┌─────────────┐
│treatment_    │  │ portfolios  │
│photos        │──>│             │
└──────────────┘  └─────────────┘
```

**관계 요약**:
- Shop 1:N → Designer, Customer, Treatment, Portfolio
- Customer 1:N → Treatment
- Designer 1:N → Treatment (optional)
- Treatment 1:N → TreatmentPhoto
- TreatmentPhoto 1:N → Portfolio (via photo_id FK)

---

## 3. 테이블 상세

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
| updated_at | timestamptz | NOT NULL | now() | 수정일시 (트리거 자동 갱신) |

**트리거**: `shops_updated_at` -- UPDATE 시 `updated_at` 자동 갱신

---

### 3.2 designers (디자이너)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 디자이너 고유 ID |
| shop_id | uuid | NOT NULL, FK → shops | -- | 소속 매장 |
| name | varchar(100) | NOT NULL | -- | 이름 |
| role | varchar(50) | NOT NULL | `'designer'` | `owner` / `designer` / `assistant` |
| phone | varchar(20) | NULL | -- | 전화번호 |
| is_active | boolean | NOT NULL | true | 활성 상태 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |

**인덱스**: `idx_designers_shop_id` on (shop_id)
**FK**: shop_id → shops(id) ON DELETE CASCADE

> **참고**: CLAUDE.md 데이터 모델에 `specialty` 필드가 명시되어 있으나 현재 마이그레이션에는 미포함. 추후 마이그레이션 필요.

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
| visit_count | integer | NOT NULL | 0 | 방문 횟수 (RPC로 증가) |
| last_visit | timestamptz | NULL | -- | 최근 방문일 (RPC로 갱신) |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |
| updated_at | timestamptz | NOT NULL | now() | 수정일시 (트리거 자동 갱신) |

**인덱스**: `idx_customers_shop_id` on (shop_id), `idx_customers_name` on (name)
**FK**: shop_id → shops(id) ON DELETE CASCADE
**트리거**: `customers_updated_at` -- UPDATE 시 `updated_at` 자동 갱신

---

### 3.4 treatments (시술 기록) -- 핵심 엔티티

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 시술 고유 ID |
| customer_id | uuid | NOT NULL, FK → customers | -- | 고객 |
| designer_id | uuid | NULL, FK → designers | -- | 담당 디자이너 |
| shop_id | uuid | NOT NULL, FK → shops | -- | 매장 |
| service_type | varchar(50) | NOT NULL | -- | `cut`/`color`/`perm`/`treatment`/`bleach`/`scalp` |
| service_detail | varchar(200) | NULL | -- | 상세 시술 내용 |
| products_used | jsonb | NULL | -- | `[{"brand":"로레알","code":"7.1","area":"뿌리"}]` |
| area | varchar(100) | NULL | -- | 시술 부위 |
| duration_minutes | integer | NULL | -- | 소요 시간 (분) |
| price | integer | NULL | -- | 가격 (원) |
| satisfaction | varchar(20) | NULL | -- | 만족도 (`high`/`medium`/`low`) |
| customer_notes | text | NULL | -- | 고객/시술 메모 |
| voice_memo_url | varchar(500) | NULL | -- | 음성 메모 URL (변환 후 삭제) |
| ai_summary | text | NULL | -- | AI 생성 요약 |
| next_visit_recommendation | varchar(100) | NULL | -- | 다음 방문 추천 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |

**인덱스**: `idx_treatments_shop_id`, `idx_treatments_customer_id`, `idx_treatments_created_at` (DESC)

> **주의사항**:
> - `products_used`의 JSON 구조는 `{ brand, code, area }` (코드 구현 기준). CLAUDE.md 문서의 `{ product_name, amount, color_code }`와 다름 -- **코드 구현이 실제 스키마**.
> - `satisfaction`은 DB에서 varchar로 `high/medium/low` 값을 저장. 프론트엔드에서는 숫자 1-5로 표시 후 변환.
> - `updated_at` 컬럼 없음 (생성 후 수정이 드문 엔티티이므로)
> - `voice_memo_url` 대신 `voice_memo_text` (변환된 텍스트)를 저장하는 것이 프라이버시 정책에 부합 -- 추후 마이그레이션 검토

---

### 3.5 treatment_photos (시술 사진/영상)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 사진 고유 ID |
| treatment_id | uuid | NOT NULL, FK → treatments | -- | 시술 |
| photo_url | varchar(500) | NOT NULL | -- | 사진/영상 URL (Supabase Storage) |
| photo_type | varchar(20) | NOT NULL | -- | `before`/`during`/`after`/`source` |
| face_swapped_url | varchar(500) | NULL | -- | AI 페이스 스왑 결과 URL |
| is_portfolio | boolean | NOT NULL | false | 포트폴리오 등록 여부 |
| caption | varchar(300) | NULL | -- | 설명 |
| taken_at | timestamptz | NOT NULL | now() | 촬영 시점 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |
| media_type | varchar(10) | NOT NULL | `'photo'` | `photo` / `video` (migration 003) |
| video_duration_seconds | integer | NULL | -- | 영상 길이 초 (migration 003) |
| thumbnail_url | varchar(500) | NULL | -- | 영상 썸네일 URL (migration 003) |

**인덱스**: `idx_treatment_photos_treatment_id` on (treatment_id)
**FK**: treatment_id → treatments(id) ON DELETE CASCADE
**CHECK**: `check_media_type` -- media_type IN ('photo', 'video')

---

### 3.6 portfolios (포트폴리오)

| 컬럼 | 타입 | Nullable | Default | 설명 |
|------|------|----------|---------|------|
| **id** | uuid | PK | gen_random_uuid() | 포트폴리오 고유 ID |
| shop_id | uuid | NOT NULL, FK → shops | -- | 매장 |
| photo_id | uuid | NOT NULL, FK → treatment_photos | -- | 원본 사진 |
| title | varchar(200) | NULL | -- | 제목 |
| description | text | NULL | -- | 설명 |
| tags | jsonb | NULL | -- | `["염색","로레알","뿌리"]` |
| is_published | boolean | NOT NULL | false | 공개 여부 |
| created_at | timestamptz | NOT NULL | now() | 생성일시 |

**인덱스**: `idx_portfolios_shop_id` on (shop_id)

---

## 4. Helper Functions

### 4.1 update_updated_at()

```sql
-- 트리거 함수: UPDATE 시 updated_at 자동 갱신
-- 적용 대상: shops, customers
-- 미적용: treatments, treatment_photos, portfolios (추후 필요시 추가)
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
```

### 4.2 increment_visit_count(cid uuid)

```sql
-- 시술 기록 생성 시 호출 (treatments API route)
-- 고객의 visit_count + 1, last_visit = now()
create or replace function increment_visit_count(cid uuid)
returns void as $$
begin
  update customers
  set visit_count = visit_count + 1,
      last_visit = now()
  where id = cid;
end;
$$ language plpgsql;
```

---

## 5. 마이그레이션 히스토리

| 파일 | 내용 |
|------|------|
| `001_initial_schema.sql` | 전체 테이블 생성 (shops, designers, customers, treatments, treatment_photos, portfolios) + 인덱스 + 트리거 |
| `002_helper_functions.sql` | `increment_visit_count` RPC 함수 |
| `003_video_support.sql` | treatment_photos에 media_type, video_duration_seconds, thumbnail_url 추가 |

---

## 6. 코드 내 TypeScript 인터페이스 (참조)

> 정의 위치: `frontend/src/lib/api.ts`

```typescript
// 실제 코드의 ProductUsed (DB jsonb와 1:1 매핑)
interface ProductUsed {
  brand: string;    // 제품 브랜드 (예: "로레알")
  code?: string;    // 제품 코드 (예: "7.1")
  area?: string;    // 시술 부위 (예: "뿌리")
}

// FaceSwapJob (Replicate API 응답 매핑)
interface FaceSwapJob {
  _id: string;      // Replicate prediction ID
  status: number;   // 1=processing, 2=succeeded, 3=failed
  url?: string;     // 완료 시 결과 이미지 URL
}
```

---

## 7. Supabase Storage 구조

```
treatment-photos/                 # 버킷명
├── {uuid}.{ext}                  # 시술 사진 원본 (jpg, png, webm)
├── {uuid}_thumb.{ext}            # 영상 썸네일
└── source_{uuid}.{ext}           # 페이스 스왑 소스 이미지
```

- **최대 파일 크기**: 10MB
- **접근 방식**: service_role 키로 업로드 (API Routes)
- **URL 형식**: `{SUPABASE_URL}/storage/v1/object/public/treatment-photos/{filename}`

---

## 8. 알려진 스키마 이슈 및 개선 계획

| 우선순위 | 이슈 | 영향 | 계획 |
|---------|------|------|------|
| HIGH | `treatments.updated_at` 트리거 없음 | 시술 수정 시점 추적 불가 | 마이그레이션 추가 예정 |
| HIGH | `designers.specialty` 컬럼 누락 | CLAUDE.md 명세와 불일치 | 마이그레이션 추가 예정 |
| MEDIUM | `photo_type` CHECK 제약 없음 | 잘못된 값 입력 가능 | CHECK 추가 예정 |
| MEDIUM | `treatments.voice_memo_url` → `voice_memo_text`로 변경 필요 | 프라이버시 정책과 불일치 | 컬럼 변경 예정 |
| LOW | `idx_treatments_designer_id` 인덱스 없음 | 디자이너별 시술 조회 성능 | 인덱스 추가 예정 |
| LOW | `portfolios.updated_at` 없음 | 포트폴리오 수정 추적 불가 | 향후 검토 |
