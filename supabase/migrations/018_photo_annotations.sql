-- Add annotations JSONB column to treatment_photos
-- Structure: [{ id: string, x: number(0-100), y: number(0-100), text: string }]
ALTER TABLE treatment_photos
  ADD COLUMN annotations jsonb DEFAULT '[]'::jsonb;
