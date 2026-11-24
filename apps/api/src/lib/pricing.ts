/**
 * Pris-, moms- och pantuppslag. Allt räknas i öre (heltal) för att undvika avrundningsfel.
 */
import { and, desc, eq, gte, inArray, isNull, lte, or, sql, type Column } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';

/** Dagens datum i svensk tid, "ÅÅÅÅ-MM-DD". */
export const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });

const activeOn = (from: Column, to: Column, date: string) =>
  and(lte(from, date), or(isNull(to), gte(to, date)));

/** Moms som ingår i ett belopp inklusive moms: 112 kr med 12 % → 12 kr. */
export const vatIncluded = (grossOre: number, rateBp: number) => Math.round((grossOre * rateBp) / (10000 + rateBp));

export async function vatRatesOn(db: Db, date: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ classId: s.vatRates.vatClassId, rateBp: s.vatRates.rateBp })
    .from(s.vatRates)
    .where(activeOn(s.vatRates.validFrom, s.vatRates.validTo, date));
  return new Map(rows.map((r) => [r.classId, r.rateBp]));
}

export async function depositRatesOn(db: Db, date: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ classId: s.depositRates.depositClassId, amountOre: s.depositRates.amountOre })
    .from(s.depositRates)
    .where(activeOn(s.depositRates.validFrom, s.depositRates.validTo, date));
  return new Map(rows.map((r) => [r.classId, r.amountOre]));
}

/** Gällande pris per variant på ett visst datum. */
export async function currentPrices(db: Db, variantIds: string[], date: string): Promise<Map<string, number>> {
  if (!variantIds.length) return new Map();
  const rows = await db
    .select({ variantId: s.prices.variantId, amountOre: s.prices.amountOre })
    .from(s.prices)
    .where(and(inArray(s.prices.variantId, variantIds), activeOn(s.prices.validFrom, s.prices.validTo, date)))
    .orderBy(desc(s.prices.validFrom));
  const out = new Map<string, number>();
  for (const r of rows) if (!out.has(r.variantId)) out.set(r.variantId, r.amountOre);
  return out;
}

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Prisinformationslagen: vid en prissänkning visas lägsta pris under de 30 dagarna
 * före sänkningen. Returnerar null om dagens pris inte är en sänkning de senaste 30 dagarna.
 */
export async function lowestPrice30Days(db: Db, variantId: string, date: string): Promise<number | null> {
  const rows = await db
    .select({ amountOre: s.prices.amountOre, validFrom: s.prices.validFrom })
    .from(s.prices)
    .where(and(eq(s.prices.variantId, variantId), lte(s.prices.validFrom, date)))
    .orderBy(s.prices.validFrom);
  // Varje rad gäller tills nästa rad börjar.
  const periods = rows.map((r, i) => ({ ...r, until: rows[i + 1]?.validFrom ?? null }));
  const current = periods.at(-1);
  const previous = periods.at(-2);
  if (!current || !previous) return null;
  if (current.validFrom < addDays(date, -30)) return null; // ingen sänkning nyligen
  if (current.amountOre >= previous.amountOre) return null; // inte en sänkning
  const windowStart = addDays(current.validFrom, -30);
  const before = periods.filter((p) => p !== current && (p.until === null || p.until > windowStart));
  return Math.min(...before.map((p) => p.amountOre));
}

/** Säljbart saldo per variant: summan över aktiva lager av (i lager − reserverat − spärrat). */
export async function availableStock(db: Db, variantIds: string[]): Promise<Map<string, number>> {
  if (!variantIds.length) return new Map();
  const rows = await db
    .select({
      variantId: s.stockLevels.variantId,
      available: sql<number>`sum(max(${s.stockLevels.onHand} - ${s.stockLevels.reserved} - ${s.stockLevels.blocked}, 0))`,
    })
    .from(s.stockLevels)
    .innerJoin(s.warehouses, eq(s.warehouses.id, s.stockLevels.warehouseId))
    .where(and(inArray(s.stockLevels.variantId, variantIds), eq(s.warehouses.status, 'active')))
    .groupBy(s.stockLevels.variantId);
  return new Map(rows.map((r) => [r.variantId, Number(r.available)]));
}
