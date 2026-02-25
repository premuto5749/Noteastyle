-- Member Profiles: designer career/certification/SNS profile
CREATE TABLE member_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES shop_members(id) ON DELETE CASCADE,
  profile_photo_url TEXT,
  bio TEXT,
  career_history JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  sns_links JSONB DEFAULT '{}',
  show_contact BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER member_profiles_updated_at
  BEFORE UPDATE ON member_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Link portfolios to the member who created them
ALTER TABLE portfolios ADD COLUMN member_id UUID REFERENCES shop_members(id);
