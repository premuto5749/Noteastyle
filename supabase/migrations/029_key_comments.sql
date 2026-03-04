ALTER TABLE treatments ADD COLUMN IF NOT EXISTS key_comments jsonb;
COMMENT ON COLUMN treatments.key_comments IS 'AI 음성 분석 핵심 코멘트 [{text, category}]';
