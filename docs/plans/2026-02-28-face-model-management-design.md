# Design: Face Swap 모델 관리 고도화

> Date: 2026-02-28
> Approach: 기존 ai_face_models 테이블 확장 (is_global 플래그)
> Scope: 슈퍼 어드민 기본 모델 관리 + FaceSwapFlow 통합

---

## 배경

현재 Face Swap 모델(소스 얼굴 이미지)은 매장별로만 관리됨. FaceSwapFlow 인라인에서만 추가/삭제 가능하고, 전용 관리 페이지 없음. 슈퍼 어드민이 기본 제공 모델을 등록하는 기능이 필요.

## 결정 사항

- **기본 모델** = 슈퍼 어드민이 등록한 소스 얼굴 이미지. 모든 매장이 기본 사용 가능.
- **저장 방식**: 기존 `ai_face_models` 테이블에 `is_global` 플래그 추가 (별도 테이블 아님)
- **모델 표시**: 기본 모델 + 매장 모델 합쳐서 표시, 기본 모델에 배지
- **모자이크**: 별도 기능, 이번 스코프 제외 (별도 PR)
- **매장 모델 관리 페이지**: 이번 스코프 제외 (기존 인라인 방식 유지)

---

## 1. DB 스키마 변경

### ai_face_models 테이블 수정

```sql
-- 마이그레이션 024_face_model_global.sql
ALTER TABLE ai_face_models
  ALTER COLUMN shop_id DROP NOT NULL,
  ADD COLUMN is_global BOOLEAN DEFAULT false,
  ADD COLUMN category TEXT DEFAULT 'uncategorized',
  ADD COLUMN sort_order INTEGER DEFAULT 0;

CREATE INDEX idx_face_models_global
  ON ai_face_models (is_global) WHERE is_global = true;
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| is_global | BOOLEAN DEFAULT false | true = 슈퍼 어드민 기본 모델 |
| category | TEXT DEFAULT 'uncategorized' | 모델 분류 (예: "여성-20대") |
| sort_order | INTEGER DEFAULT 0 | 관리자 정렬 순서 |
| shop_id | UUID (nullable) | 글로벌 모델은 NULL |

### 모델 구분

| 유형 | shop_id | is_global | 생성 권한 |
|------|---------|-----------|----------|
| 글로벌 (기본) | NULL | true | super_admin만 |
| 매장 커스텀 | UUID | false | 매장 멤버 |

---

## 2. API 변경

### 신규 (4개) — 관리자 전용

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | `/admin/face-models` | requireAdmin | 글로벌 모델 생성 (FormData) |
| GET | `/admin/face-models` | requireAdmin | 글로벌 모델 목록 (비활성 포함) |
| PUT | `/admin/face-models/{id}` | requireAdmin | 글로벌 모델 수정 |
| DELETE | `/admin/face-models/{id}` | requireAdmin | 글로벌 모델 비활성화 |

### 수정 (1개)

| Method | Path | 변경 내용 |
|--------|------|----------|
| GET | `/shops/{id}/face-models` | 글로벌 모델 포함 반환 (`OR is_global = true`), 정렬: 글로벌 먼저 |

---

## 3. UI 변경

### 신규: `/admin/face-models` 페이지

- 기본 모델 목록 (카드 그리드)
- 추가 폼: 이름, 성별, 카테고리, 이미지 업로드
- 수정: 이름, 성별, 카테고리, sort_order, is_active
- 비활성화 토글

### 수정: FaceSwapFlow 모델 선택 단계

- 기존 모델 목록에 글로벌 모델 합쳐서 표시
- 글로벌 모델에 "기본" 배지
- 정렬: 글로벌 모델(sort_order) → 매장 모델(created_at)

---

## 4. Storage

```
treatment-photos/
├── face-models/global/{uuid}.ext        # 글로벌 모델 이미지 (신규)
├── face-models/{shopId}/{uuid}.ext      # 매장 모델 이미지 (기존)
└── ...
```

---

## 5. 데이터 흐름

```
슈퍼 어드민 → /admin/face-models
  → POST /admin/face-models (FormData: name, gender, category, file)
  → Storage: face-models/global/{uuid}.ext
  → DB: ai_face_models (shop_id=NULL, is_global=true)

매장 디자이너 → FaceSwapFlow
  → GET /shops/{id}/face-models
  → 응답: [글로벌 모델(기본 배지) + 매장 모델] 합쳐서
  → 선택 후 기존 face swap 흐름 동일
```
