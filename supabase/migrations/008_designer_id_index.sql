-- Add index on treatments.designer_id for faster designer-based queries
CREATE INDEX IF NOT EXISTS idx_treatments_designer_id ON treatments(designer_id);
