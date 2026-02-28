-- Profile resume enhancement: add education and address fields
ALTER TABLE member_profiles ADD COLUMN education JSONB DEFAULT '[]';
ALTER TABLE member_profiles ADD COLUMN address TEXT;
