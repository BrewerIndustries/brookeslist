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

export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const BODY_TYPES = ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'Plus-size', 'Petite', 'Tall'];
