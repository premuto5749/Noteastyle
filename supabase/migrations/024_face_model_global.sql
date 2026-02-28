-- 024_face_model_global.sql
-- Face Swap 모델에 글로벌(기본 제공) 지원 추가

-- 1. shop_id를 nullable로 변경 (글로벌 모델은 shop_id = NULL)
ALTER TABLE ai_face_models ALTER COLUMN shop_id DROP NOT NULL;

-- 2. 새 컬럼 추가
ALTER TABLE ai_face_models ADD COLUMN is_global boolean NOT NULL DEFAULT false;
ALTER TABLE ai_face_models ADD COLUMN category text NOT NULL DEFAULT 'uncategorized';
ALTER TABLE ai_face_models ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- 3. 글로벌 모델 조회용 partial index
CREATE INDEX idx_face_models_global ON ai_face_models (is_global, sort_order) WHERE is_global = true;
