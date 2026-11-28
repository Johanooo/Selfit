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
import { moveToTrash } from '../lib/trash.ts';

const dayBefore = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

const classInput = z.object({
  name: z.string().trim().min(1, 'Ge panten ett namn, t.ex. Burk 2 kr.').max(60, 'Namnet är för långt.'),
});
const newClassInput = classInput.extend({
  amount: z.number().min(0, 'Pant kan inte vara negativ.').max(20, 'Kontrollera beloppet.'),
});

/** Antal produkter (produktfamiljer) som använder varje pant. */
async function usageByClass(db: Db) {
  const rows = await db.select({ classId: s.variants.depositClassId, familyId: s.variants.familyId }).from(s.variants);
  const sets = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.classId) continue;
    if (!sets.has(r.classId)) sets.set(r.classId, new Set());
    sets.get(r.classId)!.add(r.familyId);
  }
  return new Map([...sets].map(([k, v]) => [k, v.size]));
}

const slug = (v: string) =>
  v
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'pant';

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
    const used = await usageByClass(db);
    return c.json({
      today: today(),
      vat: vatClasses.map((v) => ({ id: v.id, name: v.name, rates: vatRates.filter((r) => r.vatClassId === v.id).map((r) => ({ rateBp: r.rateBp, validFrom: r.validFrom, validTo: r.validTo })) })),
      deposits: depClasses.map((d) => ({ id: d.id, name: d.name, products: used.get(d.id) ?? 0, rates: depRates.filter((r) => r.depositClassId === d.id).map((r) => ({ amountOre: r.amountOre, validFrom: r.validFrom, validTo: r.validTo })) })),
    });
  });

  /** Ny pant, t.ex. "Burk 2 kr". Beloppet gäller från idag. */
  app.post('/admin/deposits', async (c) => {
    const parsed = newClassInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Kontrollera fälten.' }, 400);
    const { name, amount } = parsed.data;
    const all = await db.select().from(s.depositClasses);
    if (all.some((d) => d.name.toLowerCase() === name.toLowerCase())) return c.json({ error: 'Det finns redan en pant med det namnet.' }, 409);
    let id = `pant-${slug(name)}`;
    for (let n = 2; all.some((d) => d.id === id); n++) id = `pant-${slug(name)}-${n}`;
    const date = today();
    await db.transaction(async (tx) => {
      await tx.insert(s.depositClasses).values({ id, name, vatClassId: 'vat-standard' });
      await tx.insert(s.depositRates).values({ id: `dr_${id}_${date}`, depositClassId: id, amountOre: Math.round(amount * 100), validFrom: date, validTo: null });
    });
    await logChange(db, { action: 'Pant skapad', object: `Pant: ${name}`, details: [{ field: 'Belopp', from: '–', to: `${amount} kr` }] });
    return c.json({ ok: true, id });
  });

  app.patch('/admin/deposits/:id', async (c) => {
    const id = c.req.param('id');
    const parsed = classInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Kontrollera fälten.' }, 400);
    const [cls] = await db.select().from(s.depositClasses).where(eq(s.depositClasses.id, id));
    if (!cls) return c.json({ error: 'Panten finns inte.' }, 404);
    const all = await db.select().from(s.depositClasses);
    if (all.some((d) => d.id !== id && d.name.toLowerCase() === parsed.data.name.toLowerCase())) return c.json({ error: 'Det finns redan en pant med det namnet.' }, 409);
    await db.update(s.depositClasses).set({ name: parsed.data.name }).where(eq(s.depositClasses.id, id));
    if (cls.name !== parsed.data.name) await logChange(db, { action: 'Pant ändrad', object: `Pant: ${parsed.data.name}`, details: [{ field: 'Namn', from: cls.name, to: parsed.data.name }] });
    return c.json({ ok: true });
  });

  /** Tar bara bort en pant som ingen produkt använder. Gamla ordrar har beloppet sparat på orderraden. */
  app.delete('/admin/deposits/:id', async (c) => {
    const id = c.req.param('id');
    const [cls] = await db.select().from(s.depositClasses).where(eq(s.depositClasses.id, id));
    if (!cls) return c.json({ error: 'Panten finns inte.' }, 404);
    const n = (await usageByClass(db)).get(id) ?? 0;
    if (n) return c.json({ error: `${n} ${n === 1 ? 'produkt använder' : 'produkter använder'} den här panten. Byt pant på ${n === 1 ? 'den' : 'dem'} först.` }, 409);
    await db.transaction(async (tx) => {
      const rates = await tx.select().from(s.depositRates).where(eq(s.depositRates.depositClassId, id));
      await moveToTrash(tx as unknown as Db, { kind: 'deposit', objectId: id, label: cls.name, parts: [['depositClasses', [cls]], ['depositRates', rates]] });
      await tx.delete(s.depositRates).where(eq(s.depositRates.depositClassId, id));
      await tx.delete(s.depositClasses).where(eq(s.depositClasses.id, id));
    });
    await logChange(db, { action: 'Pant borttagen', object: `Pant: ${cls.name}` });
    return c.json({ ok: true });
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
