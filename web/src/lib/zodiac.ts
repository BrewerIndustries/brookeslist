const SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

export function zodiacSymbol(sign?: string | null): string | null {
  if (!sign) return null;
  return SYMBOLS[sign] ?? null;
}

// Colour the glyph by element: fire=orange, earth=emerald, air=sky, water=violet.
const ELEMENT: Record<string, string> = {
  Aries: 'text-orange-400', Leo: 'text-orange-400', Sagittarius: 'text-orange-400',
  Taurus: 'text-emerald-400', Virgo: 'text-emerald-400', Capricorn: 'text-emerald-400',
  Gemini: 'text-sky-400', Libra: 'text-sky-400', Aquarius: 'text-sky-400',
  Cancer: 'text-violet-400', Scorpio: 'text-violet-400', Pisces: 'text-violet-400',
};

export function zodiacColor(sign?: string | null): string {
  if (!sign) return 'text-rose-300';
  return ELEMENT[sign] ?? 'text-rose-300';
}
