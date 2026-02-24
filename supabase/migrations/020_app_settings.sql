-- app_settings 테이블: 사이트 설정 (key-value JSONB 패턴)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();

-- RLS 활성화
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 누구나 설정 조회 가능 (공개 API용)
CREATE POLICY "Anyone can read app_settings"
  ON app_settings FOR SELECT
  USING (true);

-- 관리자만 설정 변경 가능
CREATE POLICY "Admins can insert app_settings"
  ON app_settings FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update app_settings"
  ON app_settings FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete app_settings"
  ON app_settings FOR DELETE
  USING (is_admin(auth.uid()));
