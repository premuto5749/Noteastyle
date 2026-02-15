-- Rename voice_memo_url to voice_memo_text and change type
-- Privacy policy: store transcribed text only, not audio file URL
ALTER TABLE treatments RENAME COLUMN voice_memo_url TO voice_memo_text;
ALTER TABLE treatments ALTER COLUMN voice_memo_text TYPE text;
