/**
 * Kampanjer: Admin skapar och ändrar. Butiken hämtar de kampanjer som pågår (banner och kampanjsida).
 * Själva kampanjpriset räknas i lib/campaigns.ts, så att butik och varukorg alltid visar samma pris.
 *
 * När en kampanj har börjat är den en del av prishistoriken (30-dagarsregeln). Då kan bara
 * slutdatum, texter och banner ändras. Vill man sluta tidigare används "Avsluta nu".
 */
import { randomBytes } from 'node:crypto';
import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { campaignMatches, campaignPrice, campaignState, CAMPAIGN_VALUE_LABELS } from '../../../web/src/data/campaigns.ts';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { logChange } from '../lib/audit.ts';
import { familyTargets, publicCampaigns } from '../lib/campaigns.ts';
import { currentPrices, today } from '../lib/pricing.ts';

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const slugRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const campaignInput = z
  .object({
    title: z.string().trim().min(1, 'Ge kampanjen ett namn.').max(80),
    slug: z.string().trim().toLowerCase().max(60),
    intro: z.string().trim().max(600).default(''),
    valueType: z.enum(['percent', 'amount', 'price']).default('percent'),
    /** Procent eller kronor. */
    value: z.number().min(0).default(0),
    appliesTo: z
      .object({
        type: z.enum(['all', 'categories', 'brands', 'products']),
        categories: z.array(z.string()).default([]),
        brands: z.array(z.string()).default([]),
        products: z.array(z.string()).default([]),
      })
      .default({ type: 'all', categories: [], brands: [], products: [] }),
    startsOn: z.string().regex(dateRe, 'Ange startdatum.'),
    endsOn: z.string().regex(dateRe).nullable().default(null),
    enabled: z.boolean().default(true),
    banner: z
      .object({ text: z.string().trim().max(120).default(''), placement: z.enum(['none', 'home', 'topbar', 'both']).default('none') })
      .default({ text: '', placement: 'none' }),
  })
  .superRefine((d, ctx) => {
    const issue = (message: string, path: string) => ctx.addIssue({ code: 'custom', message, path: [path] });
    if (!slugRe.test(d.slug)) issue('Adressen får bara innehålla a–z, siffror och bindestreck, t.ex. black-week.', 'slug');
    if (!(d.value > 0)) issue('Ange hur mycket priset ska sänkas.', 'value');
    if (d.valueType === 'percent' && d.value >= 100) issue('Procent måste vara mindre än 100.', 'value');
    if (d.valueType === 'price' && d.appliesTo.type !== 'products') issue('Fast kampanjpris går bara att använda på utvalda produkter.', 'valueType');
    if (d.appliesTo.type === 'categories' && !d.appliesTo.categories.length) issue('Välj minst en kategori.', 'appliesTo');
    if (d.appliesTo.type === 'brands' && !d.appliesTo.brands.length) issue('Välj minst ett varumärke.', 'appliesTo');
    if (d.appliesTo.type === 'products' && !d.appliesTo.products.length) issue('Välj minst en produkt.', 'appliesTo');
    if (d.endsOn && d.endsOn < d.startsOn) issue('Slutdatum kan inte vara före startdatum.', 'endsOn');
    if (d.banner.placement !== 'none' && !d.banner.text) issue('Skriv en text till bannern, eller välj att inte visa någon banner.', 'banner');
  });

type Row = typeof s.campaigns.$inferSelect;
type Input = z.infer<typeof campaignInput>;

const kr = (ore: number) => `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(ore / 100)} kr`;
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Kort text, t.ex. "20 % på utvalda varumärken". */
export function describeCampaign(c: Pick<Row, 'valueType' | 'value' | 'appliesTo'>) {
  const v = c.valueType === 'percent' ? `${c.value} %` : c.valueType === 'amount' ? `${kr(c.value)} av priset` : `Kampanjpris ${kr(c.value)}`;
  const on = { all: 'alla produkter', categories: 'utvalda kategorier', brands: 'utvalda varumärken', products: 'utvalda produkter' }[c.appliesTo.type];
  return `${v} på ${on}`;
}

const toRow = (d: Input) => ({
  title: d.title,
  slug: d.slug,
  intro: d.intro,
  valueType: d.valueType,
  value: d.valueType === 'percent' ? Math.round(d.value) : Math.round(d.value * 100),
  appliesTo: {
    type: d.appliesTo.type,
    categories: d.appliesTo.type === 'categories' ? d.appliesTo.categories : [],
    brands: d.appliesTo.type === 'brands' ? d.appliesTo.brands : [],
    products: d.appliesTo.type === 'products' ? d.appliesTo.products : [],
  },
  startsOn: d.startsOn,
  endsOn: d.endsOn,
  enabled: d.enabled,
  banner: d.banner.placement === 'none' ? { text: d.banner.text, placement: 'none' as const } : d.banner,
});

/** Vilka produkter kampanjen gäller och vad de kostar före och under kampanjen. */
async function affected(db: Db, c: Pick<Row, 'valueType' | 'value' | 'appliesTo'>) {
  const fams = await db
    .select({ id: s.productFamilies.id, slug: s.productFamilies.slug, name: s.productFamilies.name })
    .from(s.productFamilies)
    .where(ne(s.productFamilies.status, 'archived'))
    .orderBy(asc(s.productFamilies.name));
  const targets = await familyTargets(db, fams.map((f) => f.id));
  const hit = fams.filter((f) => {
    const t = targets.get(f.id);
    return t && campaignMatches(c, t);
  });
  if (!hit.length) return [];
  const vars = await db
    .select({ id: s.variants.id, familyId: s.variants.familyId })
    .from(s.variants)
    .where(and(inArray(s.variants.familyId, hit.map((f) => f.id)), eq(s.variants.status, 'active')));
  const prices = await currentPrices(db, vars.map((v) => v.id), today());
  return hit.map((f) => {
    const ordinary = vars.filter((v) => v.familyId === f.id).map((v) => prices.get(v.id)).filter((p): p is number => p !== undefined);
    const sale = ordinary.map((p) => campaignPrice(c, p) ?? p);
    return {
      slug: f.slug,
      name: f.name,
      variants: ordinary.length,
      ordinaryFrom: ordinary.length ? Math.min(...ordinary) / 100 : null,
      campaignFrom: sale.length ? Math.min(...sale) / 100 : null,
      /** Varianter där kampanjen inte sänker priset (t.ex. fast pris högre än ordinarie). */
      notLowered: ordinary.filter((p) => campaignPrice(c, p) === null).length,
    };
  });
}

/** Formatet Admin läser och skickar tillbaka (belopp i kronor). */
function adminView(c: Row, date = today()) {
  return {
    ...c,
    value: c.valueType === 'percent' ? c.value : c.value / 100,
    label: describeCampaign(c),
    state: campaignState(c, date),
    /** Har börjat före i dag: pris, produkter och start är låsta. */
    locked: c.startsOn < date,
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function campaignRoutes(db: Db) {
  const app = new Hono();

  const parse = async (c: { req: { json: () => Promise<unknown> } }) => {
    const parsed = campaignInput.safeParse(await c.req.json().catch(() => null));
    return parsed.success ? { data: parsed.data } : { error: parsed.error.issues[0]?.message ?? 'Kontrollera fälten.' };
  };
  const slugTaken = async (slug: string, except?: string) => {
    const [row] = await db.select({ id: s.campaigns.id }).from(s.campaigns).where(eq(s.campaigns.slug, slug));
    return Boolean(row && row.id !== except);
  };

  app.get('/admin/campaigns', async (c) => {
    const rows = await db.select().from(s.campaigns).orderBy(desc(s.campaigns.startsOn), desc(s.campaigns.createdAt));
    return c.json(rows.map((r) => adminView(r)));
  });

  app.get('/admin/campaigns/:id', async (c) => {
    const [row] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, c.req.param('id')));
    if (!row) return c.json({ error: 'Kampanjen finns inte.' }, 404);
    return c.json(adminView(row));
  });

  /** Förhandsvisning av vilka produkter som får kampanjpris (även för en osparad kampanj). */
  app.post('/admin/campaigns/preview', async (c) => {
    const body = z
      .object({
        valueType: z.enum(['percent', 'amount', 'price']),
        value: z.number().min(0),
        appliesTo: z.object({ type: z.enum(['all', 'categories', 'brands', 'products']), categories: z.array(z.string()).default([]), brands: z.array(z.string()).default([]), products: z.array(z.string()).default([]) }),
      })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'Kontrollera fälten.' }, 400);
    const d = body.data;
    return c.json(await affected(db, { ...d, value: d.valueType === 'percent' ? Math.round(d.value) : Math.round(d.value * 100) }));
  });

  app.post('/admin/campaigns', async (c) => {
    const p = await parse(c);
    if ('error' in p) return c.json({ error: p.error }, 400);
    if (await slugTaken(p.data.slug)) return c.json({ error: `Adressen /kampanj/${p.data.slug} används redan av en annan kampanj.` }, 409);
    const row = { id: `cp_${randomBytes(6).toString('hex')}`, ...toRow(p.data), updatedAt: new Date().toISOString() };
    await db.insert(s.campaigns).values(row);
    await logChange(db, { action: 'Kampanj skapad', object: `Kampanj: ${row.title}`, details: [{ field: 'Kampanj', from: '', to: `${describeCampaign(row)}, ${row.startsOn} – ${row.endsOn ?? 'tills vidare'}` }] });
    const [saved] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, row.id));
    return c.json(adminView(saved));
  });

  app.put('/admin/campaigns/:id', async (c) => {
    const [old] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, c.req.param('id')));
    if (!old) return c.json({ error: 'Kampanjen finns inte.' }, 404);
    const p = await parse(c);
    if ('error' in p) return c.json({ error: p.error }, 400);
    if (await slugTaken(p.data.slug, old.id)) return c.json({ error: `Adressen /kampanj/${p.data.slug} används redan av en annan kampanj.` }, 409);
    const next = toRow(p.data);
    const date = today();
    if (old.startsOn < date && old.enabled) {
      // Kampanjen har redan visats i butiken. Det som har hänt får inte skrivas om (prishistoriken).
      if (next.startsOn !== old.startsOn || next.valueType !== old.valueType || next.value !== old.value || !same(next.appliesTo, old.appliesTo))
        return c.json({ error: 'Kampanjen har redan börjat. Pris, produkter och startdatum kan inte ändras. Avsluta den och skapa en ny i stället.' }, 409);
      if (!next.enabled) return c.json({ error: 'Kampanjen har redan börjat. Använd "Avsluta nu" i stället för att stänga av den.' }, 409);
      if (next.endsOn !== null && next.endsOn < addDays(date, -1)) return c.json({ error: 'Slutdatumet kan inte vara längre bak i tiden än i går.' }, 409);
      if (old.endsOn !== null && old.endsOn < date && next.endsOn !== old.endsOn) return c.json({ error: 'Kampanjen är avslutad och kan inte förlängas. Skapa en ny kampanj i stället.' }, 409);
    }
    await db.update(s.campaigns).set({ ...next, updatedAt: new Date().toISOString() }).where(eq(s.campaigns.id, old.id));
    const details = [
      ['Namn', old.title, next.title],
      ['Adress', old.slug, next.slug],
      ['Kampanj', describeCampaign(old), describeCampaign(next)],
      ['Start', old.startsOn, next.startsOn],
      ['Slut', old.endsOn ?? 'tills vidare', next.endsOn ?? 'tills vidare'],
      ['På/av', String(old.enabled), String(next.enabled)],
      ['Banner', `${old.banner.placement}: ${old.banner.text}`, `${next.banner.placement}: ${next.banner.text}`],
    ]
      .filter(([, a, b]) => a !== b)
      .map(([field, from, to]) => ({ field, from, to }));
    if (!same(old.appliesTo, next.appliesTo) && describeCampaign(old) === describeCampaign(next)) details.push({ field: 'Produkter', from: 'tidigare urval', to: 'nytt urval' });
    if (details.length) await logChange(db, { action: 'Kampanj ändrad', object: `Kampanj: ${next.title}`, details });
    const [saved] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, old.id));
    return c.json(adminView(saved));
  });

  /** Avsluta en pågående kampanj nu. Kampanjpriset försvinner direkt, historiken finns kvar. */
  app.post('/admin/campaigns/:id/end', async (c) => {
    const [old] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, c.req.param('id')));
    if (!old) return c.json({ error: 'Kampanjen finns inte.' }, 404);
    const date = today();
    if (campaignState(old, date) !== 'active') return c.json({ error: 'Kampanjen pågår inte.' }, 409);
    // Började den i dag har den inte hunnit bli en del av historiken: stäng av den.
    const patch = old.startsOn >= date ? { enabled: false } : { endsOn: addDays(date, -1) };
    await db.update(s.campaigns).set({ ...patch, updatedAt: new Date().toISOString() }).where(eq(s.campaigns.id, old.id));
    await logChange(db, { action: 'Kampanj avslutad', object: `Kampanj: ${old.title}`, details: [{ field: 'Slut', from: old.endsOn ?? 'tills vidare', to: 'avslutad nu' }] });
    const [saved] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, old.id));
    return c.json(adminView(saved));
  });

  app.delete('/admin/campaigns/:id', async (c) => {
    const [row] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, c.req.param('id')));
    if (!row) return c.json({ error: 'Kampanjen finns inte.' }, 404);
    if (row.enabled && row.startsOn < today()) return c.json({ error: 'Kampanjen har redan visats i butiken och finns i prishistoriken. Den kan inte tas bort.' }, 409);
    await db.delete(s.campaigns).where(eq(s.campaigns.id, row.id));
    await logChange(db, { action: 'Kampanj borttagen', object: `Kampanj: ${row.title}` });
    return c.json({ ok: true });
  });

  app.get('/admin/campaign-value-labels', (c) => c.json(CAMPAIGN_VALUE_LABELS));

  // ---------------------------------------------------------------- Butiken

  app.get('/campaigns', async (c) => c.json(await publicCampaigns(db, today())));

  return app;
}
