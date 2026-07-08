export function uuid(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}

// Western zodiac sign from an ISO yyyy-mm-dd birthday.
export function zodiac(birthday?: string | null): string | null {
  if (!birthday) return null;
  const parts = birthday.split('-');
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!m || !d) return null;
  // [last-day-belonging-to-the-later-sign, later-sign] per month
  const cut: [number, string][] = [
    [20, 'Aquarius'], [19, 'Pisces'], [21, 'Aries'], [20, 'Taurus'],
    [21, 'Gemini'], [21, 'Cancer'], [23, 'Leo'], [23, 'Virgo'],
    [23, 'Libra'], [23, 'Scorpio'], [22, 'Sagittarius'], [22, 'Capricorn'],
  ];
  const prev = [
    'Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini',
    'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius',
  ];
  const [cutDay, sign] = cut[m - 1];
  return d < cutDay ? prev[m - 1] : sign;
}

export function clampRating(v: unknown): number {
  const n = Number(v);
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n * 2) / 2));
}
