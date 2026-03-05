-- 030: Community Talent Pool
-- portfolio_likes, portfolio_bookmarks, talent_proposals,
-- shop_proposal_credits, notifications, push_subscriptions,
-- member_profiles columns, app_settings seeds

-- ============================================================
-- 1. portfolio_likes
-- ============================================================
CREATE TABLE portfolio_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, user_id)
);

CREATE INDEX idx_portfolio_likes_portfolio ON portfolio_likes(portfolio_id);
CREATE INDEX idx_portfolio_likes_user ON portfolio_likes(user_id);

-- ============================================================
-- 2. portfolio_bookmarks
-- ============================================================
CREATE TABLE portfolio_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, shop_id)
);

CREATE INDEX idx_portfolio_bookmarks_shop ON portfolio_bookmarks(shop_id);

-- ============================================================
-- 3. talent_proposals
-- ============================================================
CREATE TABLE talent_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_member_id UUID NOT NULL REFERENCES shop_members(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  position TEXT NOT NULL,
  salary_range TEXT NOT NULL,
  benefits TEXT,
  shop_intro TEXT,
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_talent_proposals_from_shop ON talent_proposals(from_shop_id);
CREATE INDEX idx_talent_proposals_to_member ON talent_proposals(to_member_id);
CREATE INDEX idx_talent_proposals_status ON talent_proposals(status);

CREATE TRIGGER talent_proposals_updated_at
  BEFORE UPDATE ON talent_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. shop_proposal_credits
-- ============================================================
CREATE TABLE shop_proposal_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  total_credits INT NOT NULL DEFAULT 0,
  monthly_free INT NOT NULL DEFAULT 5,
  last_monthly_reset DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER shop_proposal_credits_updated_at
  BEFORE UPDATE ON shop_proposal_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. notifications
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = false;

-- ============================================================
-- 6. push_subscriptions
-- ============================================================
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- ============================================================
-- 7. ALTER member_profiles: talent pool columns
-- ============================================================
ALTER TABLE member_profiles
  ADD COLUMN open_to_proposals BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN blocked_shop_ids UUID[] NOT NULL DEFAULT '{}';

-- ============================================================
-- 8. Seed app_settings for proposal credits
-- ============================================================
INSERT INTO app_settings (key, value)
VALUES
  ('proposal_initial_credits', '5'),
  ('proposal_monthly_credits', '5')
ON CONFLICT DO NOTHING;
