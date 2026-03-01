-- 028: 매장별 전문 용어 테이블 + UPSERT RPC
-- 음성 인식(Whisper) 정확도 향상을 위한 용어 자동 학습

CREATE TABLE shop_terminology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  category TEXT CHECK (category IN ('service', 'product', 'area', 'tool', 'other')),
  frequency INTEGER NOT NULL DEFAULT 1,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.50,
  aliases TEXT[] DEFAULT '{}',
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, term)
);

CREATE INDEX idx_shop_terminology_shop ON shop_terminology(shop_id);
CREATE INDEX idx_shop_terminology_freq ON shop_terminology(shop_id, frequency DESC);

-- RPC: 용어 UPSERT (있으면 frequency +1, 없으면 INSERT)
CREATE OR REPLACE FUNCTION upsert_terminology(
  p_shop_id UUID,
  p_term TEXT,
  p_category TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO shop_terminology (shop_id, term, category, frequency, last_used_at)
  VALUES (p_shop_id, p_term, p_category, 1, now())
  ON CONFLICT (shop_id, term)
  DO UPDATE SET
    frequency = shop_terminology.frequency + 1,
    confidence = LEAST(0.95, 0.40 + (shop_terminology.frequency + 1) * 0.05),
    last_used_at = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql;
