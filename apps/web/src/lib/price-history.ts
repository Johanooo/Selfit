import type { PricePoint } from '@/data/types';

/** Datum som "ÅÅÅÅ-MM-DD" i svensk tid. */
export const todayIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Priset som gällde ett visst datum. */
export function priceOn(history: PricePoint[], iso: string): number | undefined {
  let price: number | undefined;
  for (const p of history) {
    if (p.from <= iso) price = p.price;
    else break;
  }
  return price;
}

/**
 * Prisinformationslagen: vid en prissänkning visas lägsta pris under de 30 dagarna
 * före sänkningen. null om dagens pris inte är en sänkning de senaste 30 dagarna.
 * (Samma regel som servern använder.)
 */
export function lowestPrice30Days(history: PricePoint[] | undefined, today = todayIso()): number | null {
  if (!history || history.length < 2) return null;
  const past = history.filter((p) => p.from <= today);
  const current = past.at(-1);
  const previous = past.at(-2);
  if (!current || !previous) return null;
  if (current.from < addDays(today, -30)) return null;
  if (current.price >= previous.price) return null;
  const windowStart = addDays(current.from, -30);
  const before = past.slice(0, -1).filter((p, i) => {
    const until = past[i + 1]?.from;
    return until === undefined || until > windowStart;
  });
  return Math.min(...before.map((p) => p.price));
}

/** Ett pris per dag för perioden, för grafen. */
export function dailyPrices(history: PricePoint[], today = todayIso(), days = 365) {
  const out: { date: string; price: number }[] = [];
  for (let i = days; i >= 0; i--) {
    const date = addDays(today, -i);
    const price = priceOn(history, date);
    if (price !== undefined) out.push({ date, price });
  }
  return out;
}

/** Prisändringar inom perioden (för tabellen), nyast först. */
export function changesInPeriod(history: PricePoint[], today = todayIso(), days = 365) {
  const start = addDays(today, -days);
  const rows = history.filter((p) => p.from <= today);
  const firstInside = rows.findIndex((p) => p.from >= start);
  const from = firstInside <= 0 ? 0 : firstInside - 1; // ta med priset som gällde när perioden började
  return rows
    .slice(from)
    .map((p) => ({ ...p, from: p.from < start ? start : p.from }))
    .reverse();
}
