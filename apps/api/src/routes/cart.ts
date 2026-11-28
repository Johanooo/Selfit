import { zValidator } from '@hono/zod-validator';
import { asc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { availableStock, depositRatesOn, today, vatIncluded, vatRatesOn } from '../lib/pricing.ts';
import { shopPrices } from '../lib/campaigns.ts';

export const quoteInput = z.object({
  lines: z.array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(99) })).max(50),
  shippingMethodId: z.string().optional(),
});

export type LineProblem = 'not_found' | 'not_offered' | 'no_price' | 'insufficient_stock';

/**
 * Räknar om varukorgen på servern: pris, pant, frakt och moms från databasen.
 * Kundens webbläsare skickar bara variant och antal. Belopp från klienten litar vi aldrig på.
 */
export async function quoteCart(db: Db, input: z.infer<typeof quoteInput>, date = today()) {
  const ids = [...new Set(input.lines.map((l) => l.variantId))];
  const vs = ids.length
    ? await db
        .select({ v: s.variants, name: s.productFamilies.name })
        .from(s.variants)
        .innerJoin(s.productFamilies, eq(s.productFamilies.id, s.variants.familyId))
        .where(inArray(s.variants.id, ids))
    : [];
  const byId = new Map(vs.map((r) => [r.v.id, r]));
  const [shop, stock, vat, deposits, depositClasses] = await Promise.all([
    shopPrices(db, ids, date),
    availableStock(db, ids),
    vatRatesOn(db, date),
    depositRatesOn(db, date),
    db.select().from(s.depositClasses),
  ]);
  const depositVatClass = new Map(depositClasses.map((d) => [d.id, d.vatClassId]));

  let goodsOre = 0;
  let depositOre = 0;
  let vatOre = 0;
  const lines = input.lines.map((l) => {
    const row = byId.get(l.variantId);
    // Kampanjpris om en kampanj pågår, annars ordinarie pris.
    const priceOre = shop.get(l.variantId)?.ore;
    const available = stock.get(l.variantId) ?? 0;
    let problem: LineProblem | null = null;
    if (!row) problem = 'not_found';
    else if (row.v.status !== 'active') problem = 'not_offered';
    else if (priceOre === undefined) problem = 'no_price';
    else if (available < l.quantity) problem = 'insufficient_stock';
    if (!row || priceOre === undefined || problem === 'not_found' || problem === 'not_offered') {
      return { ...l, problem, available };
    }
    const rateBp = vat.get(row.v.vatClassId) ?? 0;
    const lineOre = priceOre * l.quantity;
    let lineDepositOre = 0;
    let depositVatOre = 0;
    if (row.v.depositClassId && row.v.depositUnits > 0) {
      lineDepositOre = (deposits.get(row.v.depositClassId) ?? 0) * row.v.depositUnits * l.quantity;
      depositVatOre = vatIncluded(lineDepositOre, vat.get(depositVatClass.get(row.v.depositClassId) ?? '') ?? 0);
    }
    const lineVatOre = vatIncluded(lineOre, rateBp);
    goodsOre += lineOre;
    depositOre += lineDepositOre;
    vatOre += lineVatOre + depositVatOre;
    return {
      ...l,
      problem,
      available,
      sku: row.v.sku,
      name: row.name,
      unitPriceOre: priceOre,
      campaign: shop.get(l.variantId)?.campaign ?? null,
      lineTotalOre: lineOre,
      depositOre: lineDepositOre,
      vatRateBp: rateBp,
      vatOre: lineVatOre,
    };
  });

  const methods = await db.select().from(s.shippingMethods).where(eq(s.shippingMethods.active, true)).orderBy(asc(s.shippingMethods.sortOrder));
  const method = methods.find((m) => m.id === input.shippingMethodId) ?? methods[0];
  let shippingOre = 0;
  let remainingForFreeOre: number | null = null;
  if (method && goodsOre > 0) {
    const reached = method.freeThresholdOre !== null && goodsOre >= method.freeThresholdOre;
    shippingOre = reached ? method.priceOverThresholdOre : method.priceOre;
    remainingForFreeOre = method.freeThresholdOre === null ? null : Math.max(0, method.freeThresholdOre - goodsOre);
    vatOre += vatIncluded(shippingOre, vat.get(method.vatClassId) ?? 0);
  }

  return {
    lines,
    ok: lines.length > 0 && lines.every((l) => l.problem === null),
    shippingMethodId: method?.id ?? null,
    goodsOre,
    depositOre,
    shippingOre,
    vatOre,
    totalOre: goodsOre + depositOre + shippingOre,
    remainingForFreeOre,
  };
}

export function cartRoutes(db: Db) {
  const app = new Hono();
  app.get('/shipping-methods', async (c) =>
    c.json(await db.select().from(s.shippingMethods).where(eq(s.shippingMethods.active, true)).orderBy(asc(s.shippingMethods.sortOrder))),
  );
  app.post('/cart/quote', zValidator('json', quoteInput), async (c) => c.json(await quoteCart(db, c.req.valid('json'))));
  return app;
}
