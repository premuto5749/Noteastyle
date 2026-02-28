/**
 * 근무기간 자동 계산
 * @param start "YYYY-MM" format
 * @param end "YYYY-MM" format or null (현재 재직중)
 * @returns "2년 3개월" 형태의 문자열
 */
export function calcDuration(start: string, end: string | null): string {
  const [sy, sm] = start.split('-').map(Number);
  if (!sy || !sm) return '';

  let ey: number, em: number;
  if (end) {
    [ey, em] = end.split('-').map(Number);
  } else {
    const now = new Date();
    ey = now.getFullYear();
    em = now.getMonth() + 1;
  }

  const totalMonths = (ey * 12 + em) - (sy * 12 + sm);
  if (totalMonths <= 0) return '';

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years > 0 && months > 0) return `${years}년 ${months}개월`;
  if (years > 0) return `${years}년`;
  return `${months}개월`;
}

/**
 * 주소 마스킹 — 공개 프로필에서 시/구까지만 표시
 * "서울시 강남구 역삼동 123-45" → "서울시 강남구"
 * "경기도 성남시 분당구 정자동" → "경기도 성남시 분당구"
 */
export function maskAddress(addr: string): string {
  if (!addr) return '';

  // 시/도 + 시/군/구 매칭
  const match = addr.match(
    /^(.+?(?:특별시|광역시|특별자치시|특별자치도|[시도]))\s+(.+?[시군구])/
  );
  if (match) return `${match[1]} ${match[2]}`;

  // fallback: 처음 2단어
  const words = addr.trim().split(/\s+/);
  return words.slice(0, 2).join(' ');
}

/**
 * 구 형식 CareerEntry → 신 형식 마이그레이션
 * { role, start_year, end_year } → { position, start_date, end_date, duties }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateCareerEntry(old: any): {
  company: string;
  position: string;
  start_date: string;
  end_date: string | null;
  duties: string;
} {
  // 이미 신 형식이면 그대로 반환
  if ('start_date' in old && typeof old.start_date === 'string') {
    return old as {
      company: string;
      position: string;
      start_date: string;
      end_date: string | null;
      duties: string;
    };
  }

  // 구 형식 (start_year/end_year) → 신 형식 (start_date/end_date)
  const startYear = (old.start_year as number) || new Date().getFullYear();
  const endYear = old.end_year as number | null;

  return {
    company: (old.company as string) || '',
    position: (old.role as string) || '',
    start_date: `${startYear}-01`,
    end_date: endYear ? `${endYear}-01` : null,
    duties: '',
  };
}

/**
 * 구 형식 CertificationEntry → 신 형식 마이그레이션
 * { year } → { date, license_number }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateCertEntry(old: any): {
  name: string;
  issuer: string;
  date: string;
  license_number: string;
} {
  // 이미 신 형식이면 그대로 반환
  if ('date' in old && typeof old.date === 'string') {
    return old as {
      name: string;
      issuer: string;
      date: string;
      license_number: string;
    };
  }

  const year = (old.year as number) || new Date().getFullYear();

  return {
    name: (old.name as string) || '',
    issuer: (old.issuer as string) || '',
    date: `${year}-01`,
    license_number: '',
  };
}
