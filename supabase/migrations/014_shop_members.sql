-- Shop Members: user-shop N:M relationship with roles
CREATE TABLE shop_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'designer'
    CHECK (role IN ('owner', 'admin', 'designer', 'assistant')),
  display_name VARCHAR(100) NOT NULL,
  specialty VARCHAR(100),
  phone VARCHAR(20),
  invited_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

CREATE INDEX idx_shop_members_user_id ON shop_members(user_id);
CREATE INDEX idx_shop_members_shop_id ON shop_members(shop_id);

CREATE TRIGGER shop_members_updated_at
  BEFORE UPDATE ON shop_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add member_id to treatments and reservations
ALTER TABLE treatments ADD COLUMN member_id UUID REFERENCES shop_members(id);
CREATE INDEX idx_treatments_member_id ON treatments(member_id);

ALTER TABLE reservations ADD COLUMN member_id UUID REFERENCES shop_members(id);
CREATE INDEX idx_reservations_member_id ON reservations(member_id);
