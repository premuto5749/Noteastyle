-- Shop Service Categories (대분류: 커트, 염색, 펌 등)
CREATE TABLE shop_service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, name)
);

CREATE INDEX idx_shop_service_categories_shop_id ON shop_service_categories(shop_id);

CREATE TRIGGER shop_service_categories_updated_at
  BEFORE UPDATE ON shop_service_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Shop Services (소분류: 여성커트, 남성커트, 전체염색 등)
CREATE TABLE shop_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES shop_service_categories(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  estimated_duration_minutes INTEGER,
  price INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, name)
);

CREATE INDEX idx_shop_services_category_id ON shop_services(category_id);
CREATE INDEX idx_shop_services_shop_id ON shop_services(shop_id);

CREATE TRIGGER shop_services_updated_at
  BEFORE UPDATE ON shop_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default services based on shop_type
CREATE OR REPLACE FUNCTION seed_default_services(p_shop_id UUID, p_shop_type TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  cat_id UUID;
BEGIN
  -- Skip if shop already has categories
  IF EXISTS (SELECT 1 FROM shop_service_categories WHERE shop_id = p_shop_id) THEN
    RETURN;
  END IF;

  IF p_shop_type = 'hair' THEN
    -- 커트
    INSERT INTO shop_service_categories (shop_id, name, icon, sort_order)
    VALUES (p_shop_id, '커트', '✂️', 0) RETURNING id INTO cat_id;
    INSERT INTO shop_services (category_id, shop_id, name, sort_order) VALUES
      (cat_id, p_shop_id, '여성 커트', 0),
      (cat_id, p_shop_id, '남성 커트', 1);

    -- 염색
    INSERT INTO shop_service_categories (shop_id, name, icon, sort_order)
    VALUES (p_shop_id, '염색', '🎨', 1) RETURNING id INTO cat_id;
    INSERT INTO shop_services (category_id, shop_id, name, sort_order) VALUES
      (cat_id, p_shop_id, '전체 염색', 0),
      (cat_id, p_shop_id, '뿌리 염색', 1);

    -- 펌
    INSERT INTO shop_service_categories (shop_id, name, icon, sort_order)
    VALUES (p_shop_id, '펌', '💫', 2) RETURNING id INTO cat_id;
    INSERT INTO shop_services (category_id, shop_id, name, sort_order) VALUES
      (cat_id, p_shop_id, '일반 펌', 0),
      (cat_id, p_shop_id, '디지털 펌', 1);

    -- 트리트먼트
    INSERT INTO shop_service_categories (shop_id, name, icon, sort_order)
    VALUES (p_shop_id, '트리트먼트', '✨', 3) RETURNING id INTO cat_id;

    -- 블리치
    INSERT INTO shop_service_categories (shop_id, name, icon, sort_order)
    VALUES (p_shop_id, '블리치', '⚡', 4) RETURNING id INTO cat_id;

    -- 두피관리
    INSERT INTO shop_service_categories (shop_id, name, icon, sort_order)
    VALUES (p_shop_id, '두피관리', '🌿', 5) RETURNING id INTO cat_id;

  ELSIF p_shop_type = 'nail' THEN
    -- 네일
    INSERT INTO shop_service_categories (shop_id, name, icon, sort_order)
    VALUES (p_shop_id, '네일', '💅', 0) RETURNING id INTO cat_id;
    INSERT INTO shop_services (category_id, shop_id, name, sort_order) VALUES
      (cat_id, p_shop_id, '젤 네일', 0),
      (cat_id, p_shop_id, '네일 아트', 1);

    -- 페디큐어
    INSERT INTO shop_service_categories (shop_id, name, icon, sort_order)
    VALUES (p_shop_id, '페디큐어', '🦶', 1) RETURNING id INTO cat_id;

    -- 기타
    INSERT INTO shop_service_categories (shop_id, name, icon, sort_order)
    VALUES (p_shop_id, '기타', '✨', 2) RETURNING id INTO cat_id;

  ELSE
    -- skin / scalp / default
    INSERT INTO shop_service_categories (shop_id, name, icon, sort_order)
    VALUES (p_shop_id, '기본 관리', '💆', 0) RETURNING id INTO cat_id;

    INSERT INTO shop_service_categories (shop_id, name, icon, sort_order)
    VALUES (p_shop_id, '기타', '✨', 1) RETURNING id INTO cat_id;
  END IF;
END;
$$;
