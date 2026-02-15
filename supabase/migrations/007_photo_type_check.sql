-- Add CHECK constraint for photo_type valid values
ALTER TABLE treatment_photos
  ADD CONSTRAINT check_photo_type
  CHECK (photo_type IN ('before', 'during', 'after', 'source'));
