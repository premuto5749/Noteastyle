-- Drop designers table and all references
-- Pre-launch: no existing data to migrate

-- Remove designer_id FK from treatments
ALTER TABLE treatments DROP CONSTRAINT IF EXISTS treatments_designer_id_fkey;
ALTER TABLE treatments DROP COLUMN IF EXISTS designer_id;
DROP INDEX IF EXISTS idx_treatments_designer_id;

-- Remove designer_id FK from reservations
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_designer_id_fkey;
ALTER TABLE reservations DROP COLUMN IF EXISTS designer_id;

-- Drop designers table
DROP INDEX IF EXISTS idx_designers_shop_id;
DROP TABLE IF EXISTS designers;
