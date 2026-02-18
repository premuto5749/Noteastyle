-- Reservations table for booking management
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  designer_id uuid REFERENCES designers(id),
  treatment_id uuid REFERENCES treatments(id),

  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  estimated_duration_minutes integer DEFAULT 60,

  service_type varchar(50),
  service_detail varchar(200),
  notes text,
  source varchar(20) NOT NULL DEFAULT 'manual',

  status varchar(20) NOT NULL DEFAULT 'scheduled',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservations_shop_date ON reservations(shop_id, scheduled_date);
CREATE INDEX idx_reservations_customer ON reservations(customer_id);
CREATE INDEX idx_reservations_status ON reservations(status);

CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
