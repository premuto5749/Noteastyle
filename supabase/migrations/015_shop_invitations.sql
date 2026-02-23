-- Shop Invitations: invite links for joining a shop
CREATE TABLE shop_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'designer'
    CHECK (role IN ('admin', 'designer', 'assistant')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  use_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_invitations_token ON shop_invitations(token);
CREATE INDEX idx_shop_invitations_shop_id ON shop_invitations(shop_id);
