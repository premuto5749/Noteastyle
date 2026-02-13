-- 003: 영상 지원을 위한 treatment_photos 테이블 확장
-- media_type: 'photo' | 'video' (기존 데이터는 기본값 'photo')
-- video_duration_seconds: 영상 길이 (초)
-- thumbnail_url: 영상 썸네일 URL

ALTER TABLE treatment_photos
  ADD COLUMN media_type varchar(10) NOT NULL DEFAULT 'photo',
  ADD COLUMN video_duration_seconds integer,
  ADD COLUMN thumbnail_url varchar(500);

ALTER TABLE treatment_photos
  ADD CONSTRAINT check_media_type CHECK (media_type IN ('photo', 'video'));
