-- Add specialty column to designers table
-- Referenced in CLAUDE.md data model but missing from initial schema
ALTER TABLE designers ADD COLUMN IF NOT EXISTS specialty varchar(100);
