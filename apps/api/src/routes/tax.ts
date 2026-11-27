/**
 * Admin → Inställningar → Moms & pant.
 * Momssatserna följer lagen och visas bara (livsmedel 6 % t.o.m. 2027, sedan 12 %; övrigt 25 %).
 * Pantbeloppet kan ändras från ett datum. Gamla belopp sparas, så att gamla ordrar räknas rätt.
 */
import { and, asc, eq, gt, isNull, or, gte } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { logChange } from '../lib/audit.ts';
import { today } from '../lib/pricing.ts';

const dayBefore = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

const depositInput = z.object({
  amount: z.number().min(0, 'Pant kan inte vara negativ.').max(20, 'Kontrollera beloppet.'),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ange datum som ÅÅÅÅ-MM-DD.'),
});

export function taxRoutes(db: Db) {
  const app = new Hono();

  app.get('/admin/tax', async (c) => {
    const [vatClasses, vatRates, depClasses, depRates] = await Promise.all([
      db.select().from(s.vatClasses),
      db.select().from(s.vatRates).orderBy(asc(s.vatRates.validFrom)),
      db.select().from(s.depositClasses),
      db.select().from(s.depositRates).orderBy(asc(s.depositRates.validFrom)),
    ]);
    return c.json({
      today: today(),
      vat: vatClasses.map((v) => ({ id: v.id, name: v.name, rates: vatRates.filter((r) => r.vatClassId === v.id).map((r) => ({ rateBp: r.rateBp, validFrom: r.validFrom, validTo: r.validTo })) })),
      deposits: depClasses.map((d) => ({ id: d.id, name: d.name, rates: depRates.filter((r) => r.depositClassId === d.id).map((r) => ({ amountOre: r.amountOre, validFrom: r.validFrom, validTo: r.validTo })) })),
    });
  });

  /** Nytt pantbelopp från ett datum. Tidigare belopp gäller fram till dagen innan. */
  app.post('/admin/deposits/:id/rates', async (c) => {
    const id = c.req.param('id');
    const parsed = depositInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Kontrollera fälten.' }, 400);
    const { amount, validFrom } = parsed.data;
    if (validFrom < today()) return c.json({ error: 'Datumet kan inte vara bakåt i tiden. Gamla ordrar ska behålla sin pant.' }, 400);
    const [cls] = await db.select().from(s.depositClasses).where(eq(s.depositClasses.id, id));
    if (!cls) return c.json({ error: 'Pantklassen finns inte.' }, 404);
    const amountOre = Math.round(amount * 100);
    const [prev] = await db
      .select()
      .from(s.depositRates)
      .where(and(eq(s.depositRates.depositClassId, id), or(isNull(s.depositRates.validTo), gte(s.depositRates.validTo, validFrom))))
      .orderBy(asc(s.depositRates.validFrom));
    await db.transaction(async (tx) => {
      // Planerade belopp efter det nya datumet ersätts.
      await tx.delete(s.depositRates).where(and(eq(s.depositRates.depositClassId, id), gt(s.depositRates.validFrom, validFrom)));
      const [sameDay] = await tx.select().from(s.depositRates).where(and(eq(s.depositRates.depositClassId, id), eq(s.depositRates.validFrom, validFrom)));
      if (sameDay) {
        await tx.update(s.depositRates).set({ amountOre, validTo: null }).where(eq(s.depositRates.id, sameDay.id));
      } else {
        await tx
          .update(s.depositRates)
          .set({ validTo: dayBefore(validFrom) })
          .where(and(eq(s.depositRates.depositClassId, id), or(isNull(s.depositRates.validTo), gte(s.depositRates.validTo, validFrom))));
        await tx.insert(s.depositRates).values({ id: `dr_${id}_${validFrom}`, depositClassId: id, amountOre, validFrom, validTo: null });
      }
    });
    await logChange(db, {
      action: 'Pant ändrad',
      object: `Pant: ${cls.name}`,
      details: [{ field: `Från ${validFrom}`, from: prev ? `${prev.amountOre / 100} kr` : '–', to: `${amount} kr` }],
    });
    return c.json({ ok: true });
  });

  return app;
}
