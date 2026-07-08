export function cmToFtIn(cm?: number | null): string | null {
  if (!cm) return null;
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  let inch = Math.round(totalIn - ft * 12);
  let feet = ft;
  if (inch === 12) { feet += 1; inch = 0; }
  return `${feet}'${inch}"`;
}

export function ftInToCm(ft: number, inch: number): number {
  return Math.round((ft * 12 + inch) * 2.54);
}

export function cmToFt(cm: number): { ft: number; inch: number } {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  let inch = Math.round(totalIn - ft * 12);
  let feet = ft;
  if (inch === 12) { feet += 1; inch = 0; }
  return { ft: feet, inch };
}

export function kgToLb(kg?: number | null): number | null {
  if (kg == null) return null;
  return Math.round(kg * 2.2046226218);
}

export function lbToKg(lb: number): number {
  return Math.round((lb / 2.2046226218) * 10) / 10;
}

export function formatHeight(cm: number | null | undefined, units: 'us' | 'metric'): string | null {
  if (!cm) return null;
  return units === 'metric' ? `${cm} cm` : cmToFtIn(cm);
}

export function formatWeight(kg: number | null | undefined, units: 'us' | 'metric'): string | null {
  if (kg == null) return null;
  return units === 'metric' ? `${Math.round(kg)} kg` : `${kgToLb(kg)} lb`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const BODY_TYPES = ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'Plus-size', 'Petite', 'Tall'];
