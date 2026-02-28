/** 뷰티 업계 직급 체계 */
export const POSITION_PRESETS = [
  '인턴',
  '스텝',
  '디자이너',
  '수석 디자이너',
  '실장',
  '원장',
  '기타',
] as const;

/** 미용 국가자격증 프리셋 (한국산업인력공단 Q-net) */
export const CERT_PRESETS = [
  { name: '미용사(일반)', issuer: '한국산업인력공단' },
  { name: '미용사(피부)', issuer: '한국산업인력공단' },
  { name: '미용사(네일)', issuer: '한국산업인력공단' },
  { name: '미용사(메이크업)', issuer: '한국산업인력공단' },
  { name: '이용사', issuer: '한국산업인력공단' },
] as const;

/** 졸업 상태 */
export const GRADUATION_STATUS = [
  '졸업',
  '재학중',
  '졸업예정',
  '중퇴',
  '수료',
] as const;

/** 월 목록 (select 드롭다운용) */
export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
