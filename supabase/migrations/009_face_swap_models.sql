-- AI 얼굴 모델 (매장별 사전 등록된 소스 얼굴)
create table ai_face_models (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name varchar(100) not null,
  gender varchar(10) not null,
  image_url varchar(500) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_ai_face_models_shop_id on ai_face_models(shop_id);

-- 페이스 스왑 결과 (1회 요청에 복수 결과 저장)
create table face_swap_results (
  id uuid primary key default gen_random_uuid(),
  treatment_photo_id uuid not null references treatment_photos(id) on delete cascade,
  face_model_id uuid not null references ai_face_models(id),
  result_url varchar(500) not null,
  is_selected boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_face_swap_results_photo on face_swap_results(treatment_photo_id);
