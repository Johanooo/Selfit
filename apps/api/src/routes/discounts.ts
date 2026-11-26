/**
 * Rabatter: Admin skapar och ändrar, butiken kontrollerar koder och hämtar automatiska rabatter.
 * Själva beloppet räknas ut i varukorgen utifrån reglerna som skickas hit. Servern avgör om koden får användas.
 */
import { randomBytes } from 'node:crypto';
import { and, asc, count, desc, eq, inArray, like, ne, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { logChange } from '../lib/audit.ts';

const codeRe = /^[A-Z0-9ÅÄÖ_-]{3,32}$/;

const discountInput = z
  .object({
    method: z.enum(['code', 'automatic']),
    code: z.string().trim().toUpperCase().default(''),
    title: z.string().trim().max(80).default(''),
    kind: z.enum(['products', 'order', 'shipping']),
    valueType: z.enum(['percent', 'fixed']).default('percent'),
    /** Procent (1–100) eller kronor. */
    value: z.number().min(0).default(0),
    appliesTo: z
      .object({
        type: z.enum(['all', 'categories', 'products']),
        categories: z.array(z.string()).default([]),
        products: z.array(z.string()).default([]),
      })
      .default({ type: 'all', categories: [], products: [] }),
    eligibility: z
      .object({ type: z.enum(['all', 'new', 'returning', 'specific']), customerIds: z.array(z.string()).default([]) })
      .default({ type: 'all', customerIds: [] }),
    minType: z.enum(['none', 'amount', 'quantity']).default('none'),
    /** Kronor eller antal artiklar. */
    minValue: z.number().min(0).default(0),
    usageLimit: z.number().int().min(1).nullable().default(null),
    oncePerCustomer: z.boolean().default(false),
    startsAt: z.string().min(10),
    endsAt: z.string().nullable().default(null),
    enabled: z.boolean().default(true),
  })
  .superRefine((d, ctx) => {
    const issue = (message: string, path: string) => ctx.addIssue({ code: 'custom', message, path: [path] });
    if (d.method === 'code' && !codeRe.test(d.code)) issue('Rabattkoden ska vara 3–32 tecken: bokstäver, siffror, - eller _.', 'code');
    if (d.method === 'automatic' && !d.title) issue('Ge den automatiska rabatten en titel. Kunden ser den i varukorgen.', 'title');
    if (d.method === 'automatic' && d.eligibility.type !== 'all') issue('Automatiska rabatter gäller alla kunder. Använd en rabattkod för utvalda kunder.', 'eligibility');
    if (d.kind !== 'shipping') {
      if (!(d.value > 0)) issue('Ange hur stor rabatten är.', 'value');
      if (d.valueType === 'percent' && d.value > 100) issue('Procent kan vara högst 100.', 'value');
    }
    if (d.kind === 'products' && d.appliesTo.type === 'categories' && !d.appliesTo.categories.length) issue('Välj minst en kategori.', 'appliesTo');
    if (d.kind === 'products' && d.appliesTo.type === 'products' && !d.appliesTo.products.length) issue('Välj minst en produkt.', 'appliesTo');
    if (d.eligibility.type === 'specific' && !d.eligibility.customerIds.length) issue('Välj minst en kund.', 'eligibility');
    if (d.minType !== 'none' && !(d.minValue > 0)) issue('Ange minsta köpkrav.', 'minValue');
    if (d.endsAt && d.endsAt <= d.startsAt) issue('Slutdatum måste vara efter startdatum.', 'endsAt');
  });

type Row = typeof s.discounts.$inferSelect;
type Input = z.infer<typeof discountInput>;

const kr = (ore: number) => `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(ore / 100)} kr`;

/** Kort text som beskriver rabatten, t.ex. "10 % på hela ordern". */
export function describe(d: Pick<Row, 'kind' | 'valueType' | 'value' | 'appliesTo'>) {
  if (d.kind === 'shipping') return 'Fri frakt';
  const v = d.valueType === 'percent' ? `${d.value} %` : kr(d.value);
  if (d.kind === 'order') return `${v} på hela ordern`;
  if (d.appliesTo.type === 'all') return `${v} på alla produkter`;
  return `${v} på utvalda produkter`;
}

/** Nuvarande läge: aktiv, schemalagd, avslutad eller avstängd. */
export function stateOf(d: Pick<Row, 'enabled' | 'startsAt' | 'endsAt' | 'usageLimit'>, used: number, now = new Date().toISOString()) {
  if (!d.enabled) return 'disabled' as const;
  if (d.endsAt && d.endsAt <= now) return 'expired' as const;
  if (d.usageLimit !== null && used >= d.usageLimit) return 'expired' as const;
  if (d.startsAt > now) return 'scheduled' as const;
  return 'active' as const;
}

const toRow = (d: Input) => ({
  method: d.method,
  code: d.method === 'code' ? d.code : null,
  title: d.method === 'automatic' ? d.title : d.code,
  kind: d.kind,
  valueType: d.kind === 'shipping' ? ('percent' as const) : d.valueType,
  value: d.kind === 'shipping' ? 0 : d.valueType === 'fixed' ? Math.round(d.value * 100) : Math.round(d.value),
  appliesTo: d.kind === 'products' ? d.appliesTo : { type: 'all' as const, categories: [], products: [] },
  eligibility: d.eligibility.type === 'specific' ? d.eligibility : { type: d.eligibility.type, customerIds: [] },
  minType: d.minType,
  minValue: d.minType === 'amount' ? Math.round(d.minValue * 100) : d.minType === 'quantity' ? Math.round(d.minValue) : 0,
  usageLimit: d.usageLimit,
  oncePerCustomer: d.oncePerCustomer,
  startsAt: d.startsAt,
  endsAt: d.endsAt,
  enabled: d.enabled,
});

/** Det butiken behöver för att räkna ut rabatten. Belopp i kronor. */
function publicRule(d: Row, needsEmail = false) {
  return {
    code: d.code,
    title: d.method === 'automatic' ? d.title : d.code,
    label: describe(d),
    method: d.method,
    kind: d.kind,
    valueType: d.valueType,
    value: d.valueType === 'fixed' ? d.value / 100 : d.value,
    appliesTo: d.appliesTo,
    minType: d.minType,
    minValue: d.minType === 'amount' ? d.minValue / 100 : d.minValue,
    needsEmail,
  };
}

async function usage(db: Db, codes: string[]) {
  if (!codes.length) return new Map<string, number>();
  const rows = await db
    .select({ code: sql<string>`upper(${s.orders.discountCode})`, n: count() })
    .from(s.orders)
    .where(and(inArray(sql`upper(${s.orders.discountCode})`, codes), ne(s.orders.paymentStatus, 'cancelled')))
    .groupBy(sql`upper(${s.orders.discountCode})`);
  return new Map(rows.map((r) => [r.code, Number(r.n)]));
}

/** Formatet Admin läser och skickar tillbaka (belopp i kronor). */
async function adminView(db: Db, d: Row, used?: number) {
  const n = used ?? (d.code ? ((await usage(db, [d.code])).get(d.code) ?? 0) : 0);
  const customers = d.eligibility.customerIds.length
    ? await db.select({ id: s.customers.id, name: s.customers.name, email: s.customers.email }).from(s.customers).where(inArray(s.customers.id, d.eligibility.customerIds))
    : [];
  return {
    ...d,
    value: d.valueType === 'fixed' ? d.value / 100 : d.value,
    minValue: d.minType === 'amount' ? d.minValue / 100 : d.minValue,
    code: d.code ?? '',
    label: describe(d),
    used: n,
    state: stateOf(d, n),
    customers,
  };
}

const LABELS: Partial<Record<keyof Input, string>> = {
  code: 'Kod',
  title: 'Titel',
  value: 'Värde',
  valueType: 'Värdetyp',
  minValue: 'Minsta köpkrav',
  usageLimit: 'Max användningar',
  startsAt: 'Start',
  endsAt: 'Slut',
  enabled: 'På/av',
};

export function discountRoutes(db: Db) {
  const app = new Hono();

  const parse = async (c: { req: { json: () => Promise<unknown> } }) => {
    const parsed = discountInput.safeParse(await c.req.json().catch(() => null));
    return parsed.success ? { data: parsed.data } : { error: parsed.error.issues[0]?.message ?? 'Kontrollera fälten.' };
  };

  app.get('/admin/discounts', async (c) => {
    const rows = await db.select().from(s.discounts).orderBy(desc(s.discounts.createdAt));
    const used = await usage(db, rows.flatMap((r) => (r.code ? [r.code] : [])));
    return c.json(await Promise.all(rows.map((r) => adminView(db, r, r.code ? (used.get(r.code) ?? 0) : 0))));
  });

  app.get('/admin/discounts/:id', async (c) => {
    const [row] = await db.select().from(s.discounts).where(eq(s.discounts.id, c.req.param('id')));
    if (!row) return c.json({ error: 'Rabatten finns inte.' }, 404);
    return c.json(await adminView(db, row));
  });

  app.post('/admin/discounts', async (c) => {
    const p = await parse(c);
    if ('error' in p) return c.json({ error: p.error }, 400);
    if (p.data.code) {
      const [taken] = await db.select({ id: s.discounts.id }).from(s.discounts).where(eq(s.discounts.code, p.data.code));
      if (taken) return c.json({ error: `Koden ${p.data.code} finns redan.` }, 409);
    }
    const row = { id: `dc_${randomBytes(6).toString('hex')}`, ...toRow(p.data), updatedAt: new Date().toISOString() };
    await db.insert(s.discounts).values(row);
    await logChange(db, { action: 'Rabatt skapad', object: `Rabatt: ${row.title}`, details: [{ field: 'Rabatt', from: '', to: describe(row) }] });
    const [saved] = await db.select().from(s.discounts).where(eq(s.discounts.id, row.id));
    return c.json(await adminView(db, saved));
  });

  app.put('/admin/discounts/:id', async (c) => {
    const [old] = await db.select().from(s.discounts).where(eq(s.discounts.id, c.req.param('id')));
    if (!old) return c.json({ error: 'Rabatten finns inte.' }, 404);
    const p = await parse(c);
    if ('error' in p) return c.json({ error: p.error }, 400);
    if (p.data.code && p.data.code !== old.code) {
      const [taken] = await db.select({ id: s.discounts.id }).from(s.discounts).where(eq(s.discounts.code, p.data.code));
      if (taken) return c.json({ error: `Koden ${p.data.code} finns redan.` }, 409);
      const n = old.code ? ((await usage(db, [old.code])).get(old.code) ?? 0) : 0;
      if (n > 0) return c.json({ error: 'Koden har redan använts på ordrar och kan inte bytas. Skapa en ny rabatt i stället.' }, 409);
    }
    const next = toRow(p.data);
    await db.update(s.discounts).set({ ...next, updatedAt: new Date().toISOString() }).where(eq(s.discounts.id, old.id));
    const details = (Object.keys(LABELS) as (keyof typeof next & keyof typeof LABELS)[])
      .filter((k) => k in next && String(old[k as keyof Row] ?? '') !== String(next[k as keyof typeof next] ?? ''))
      .map((k) => ({ field: LABELS[k]!, from: String(old[k as keyof Row] ?? ''), to: String(next[k as keyof typeof next] ?? '') }));
    if (describe(old) !== describe(next)) details.push({ field: 'Rabatt', from: describe(old), to: describe(next) });
    if (details.length) await logChange(db, { action: 'Rabatt ändrad', object: `Rabatt: ${next.title}`, details });
    const [saved] = await db.select().from(s.discounts).where(eq(s.discounts.id, old.id));
    return c.json(await adminView(db, saved));
  });

  app.delete('/admin/discounts/:id', async (c) => {
    const [row] = await db.select().from(s.discounts).where(eq(s.discounts.id, c.req.param('id')));
    if (!row) return c.json({ error: 'Rabatten finns inte.' }, 404);
    const n = row.code ? ((await usage(db, [row.code])).get(row.code) ?? 0) : 0;
    if (n > 0) return c.json({ error: 'Rabatten har använts på ordrar. Stäng av den i stället, så finns historiken kvar.' }, 409);
    await db.delete(s.discounts).where(eq(s.discounts.id, row.id));
    await logChange(db, { action: 'Rabatt borttagen', object: `Rabatt: ${row.title}` });
    return c.json({ ok: true });
  });

  /** Kundsökning för "Specifika kunder". */
  app.get('/admin/discount-customers', async (c) => {
    const q = (c.req.query('q') ?? '').trim();
    const where = q ? or(like(s.customers.email, `%${q}%`), like(s.customers.name, `%${q}%`)) : undefined;
    const rows = await db
      .select({ id: s.customers.id, name: s.customers.name, email: s.customers.email, orders: count(s.orders.id) })
      .from(s.customers)
      .leftJoin(s.orders, eq(s.orders.customerId, s.customers.id))
      .where(where)
      .groupBy(s.customers.id)
      .orderBy(asc(s.customers.name), asc(s.customers.email))
      .limit(20);
    return c.json(rows.map((r) => ({ ...r, orders: Number(r.orders) })));
  });

  // ---------------------------------------------------------------- Butiken

  app.get('/discounts/automatic', async (c) => {
    const rows = await db.select().from(s.discounts).where(eq(s.discounts.method, 'automatic'));
    return c.json(rows.filter((r) => stateOf(r, 0) === 'active' && r.eligibility.type === 'all').map((r) => publicRule(r)));
  });

  app.post('/discounts/check', async (c) => {
    const body = z
      .object({ code: z.string().trim().toUpperCase().min(1).max(40), email: z.string().trim().toLowerCase().email().optional() })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ ok: false, error: 'Skriv in en rabattkod.' }, 400);
    const { code, email } = body.data;
    const [d] = await db.select().from(s.discounts).where(eq(s.discounts.code, code));
    const fail = (error: string) => c.json({ ok: false, error });
    if (!d || d.method !== 'code' || !d.enabled) return fail(`Koden ”${code}” finns inte.`);
    const used = (await usage(db, [code])).get(code) ?? 0;
    const state = stateOf(d, used);
    if (state === 'scheduled') return fail(`Koden ${code} gäller från ${d.startsAt.slice(0, 10)}.`);
    if (state === 'expired') return fail(d.endsAt && d.endsAt <= new Date().toISOString() ? `Koden ${code} har gått ut.` : `Koden ${code} är förbrukad.`);

    const needsCustomer = d.eligibility.type !== 'all' || d.oncePerCustomer;
    if (!needsCustomer) return c.json({ ok: true, discount: publicRule(d) });
    if (!email) return c.json({ ok: true, discount: publicRule(d, true) });

    const placed = await db
      .select({ code: s.orders.discountCode })
      .from(s.orders)
      .where(and(eq(sql`lower(${s.orders.email})`, email), ne(s.orders.paymentStatus, 'cancelled')));
    if (d.eligibility.type === 'new' && placed.length > 0) return fail(`Koden ${code} gäller bara dig som handlar för första gången.`);
    if (d.eligibility.type === 'returning' && placed.length === 0) return fail(`Koden ${code} gäller bara kunder som handlat hos oss tidigare.`);
    if (d.eligibility.type === 'specific') {
      const allowed = d.eligibility.customerIds.length
        ? await db.select({ email: s.customers.email }).from(s.customers).where(inArray(s.customers.id, d.eligibility.customerIds))
        : [];
      if (!allowed.some((a) => a.email.toLowerCase() === email)) return fail(`Koden ${code} är personlig och gäller inte för ${email}.`);
    }
    if (d.oncePerCustomer && placed.some((p) => p.code?.toUpperCase() === code)) return fail(`Du har redan använt koden ${code}.`);
    return c.json({ ok: true, discount: publicRule(d) });
  });

  return app;
}
