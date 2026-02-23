-- Shop Audit Logs: track membership changes and shop actions
CREATE TABLE shop_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_audit_logs_shop_id ON shop_audit_logs(shop_id);
CREATE INDEX idx_shop_audit_logs_created_at ON shop_audit_logs(created_at);
