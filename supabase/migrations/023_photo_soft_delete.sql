-- Add soft delete support to treatment_photos
ALTER TABLE treatment_photos ADD COLUMN deleted_at timestamptz;

-- Partial index for efficient trash queries
CREATE INDEX idx_treatment_photos_deleted_at
  ON treatment_photos(deleted_at) WHERE deleted_at IS NOT NULL;
