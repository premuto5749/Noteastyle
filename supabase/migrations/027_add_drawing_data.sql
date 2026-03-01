-- 027: treatment_photos에 drawing_data 컬럼 추가
-- react-konva 기반 드로잉 데이터 저장 (JSONB)

ALTER TABLE treatment_photos
ADD COLUMN drawing_data JSONB DEFAULT NULL;

COMMENT ON COLUMN treatment_photos.drawing_data IS
  'react-konva 드로잉 데이터. { version: 1, shapes: DrawingShape[] }';
