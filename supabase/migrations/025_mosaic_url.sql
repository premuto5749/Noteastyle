-- Add mosaic_url column to treatment_photos for client-side face mosaic results
ALTER TABLE treatment_photos ADD COLUMN mosaic_url text;
