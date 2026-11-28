/**
 * Kampanjer: Admin skapar och ändrar. Butiken hämtar de kampanjer som pågår (banner och kampanjsida).
 * Själva kampanjpriset räknas i lib/campaigns.ts, så att butik och varukorg alltid visar samma pris.
 *
 * En kampanj har en eller flera rader (t.ex. PWO+ 20 %, Träningskläder 30 %), som delar datum,
 * banner och kampanjsida. Matchar flera rader gäller den mest specifika: produkt före varumärke före kategori.
 * Pågår två kampanjer för samma produkt gäller lägsta priset, och Admin varnar.
 *
 * När en kampanj har börjat är den en del av prishistoriken (30-dagarsregeln). Då kan bara
 * slutdatum, texter och banner ändras. Vill man sluta tidigare används "Avsluta nu".
 */
import { randomBytes } from 'node:crypto';
import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { campaignMatches, campaignState, lineFor, periodsOverlap, type CampaignTarget } from '../../../web/src/data/campaigns.ts';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { logChange } from '../lib/audit.ts';
import { familyTargets, publicCampaigns } from '../lib/campaigns.ts';
import { currentPrices, today } from '../lib/pricing.ts';
import { moveToTrash } from '../lib/trash.ts';

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const slugRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const appliesTo = z
  .object({
    type: z.enum(['all', 'categories', 'brands', 'products']),
    categories: z.array(z.string()).default([]),
    brands: z.array(z.string()).default([]),
    products: z.array(z.string()).default([]),
  })
  .default({ type: 'all', categories: [], brands: [], products: [] });

const lineInput = z.object({
  id: z.string().max(40).optional(),
  valueType: z.enum(['percent', 'amount', 'price']).default('percent'),
  /** Procent eller kronor. */
  value: z.number().min(0).default(0),
  appliesTo,
});

const campaignInput = z
  .object({
    title: z.string().trim().min(1, 'Ge kampanjen ett namn.').max(80),
    slug: z.string().trim().toLowerCase().max(60),
    intro: z.string().trim().max(600).default(''),
    lines: z.array(lineInput).min(1, 'Lägg till minst en rad.').max(30, 'En kampanj kan ha högst 30 rader.'),
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
    d.lines.forEach((l, i) => {
      const row = d.lines.length > 1 ? `Rad ${i + 1}: ` : '';
      if (!(l.value > 0)) issue(`${row}Ange hur mycket priset ska sänkas.`, 'lines');
      if (l.valueType === 'percent' && l.value >= 100) issue(`${row}Procent måste vara mindre än 100.`, 'lines');
      if (l.valueType === 'price' && l.appliesTo.type !== 'products') issue(`${row}Fast kampanjpris går bara att använda på utvalda produkter.`, 'lines');
      if (l.appliesTo.type === 'categories' && !l.appliesTo.categories.length) issue(`${row}Välj minst en kategori.`, 'lines');
      if (l.appliesTo.type === 'brands' && !l.appliesTo.brands.length) issue(`${row}Välj minst ett varumärke.`, 'lines');
      if (l.appliesTo.type === 'products' && !l.appliesTo.products.length) issue(`${row}Välj minst en produkt.`, 'lines');
    });
    if (d.endsOn && d.endsOn < d.startsOn) issue('Slutdatum kan inte vara före startdatum.', 'endsOn');
    if (d.banner.placement !== 'none' && !d.banner.text) issue('Skriv en text till bannern, eller välj att inte visa någon banner.', 'banner');
  });

type Row = typeof s.campaigns.$inferSelect;
type Line = s.CampaignLineRow;
type Input = z.infer<typeof campaignInput>;

const kr = (ore: number) => `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(ore / 100)} kr`;
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Kort text för en rad, t.ex. "20 % på utvalda varumärken". */
export function describeLine(l: Pick<Line, 'valueType' | 'value' | 'appliesTo'>) {
  const v = l.valueType === 'percent' ? `${l.value} %` : l.valueType === 'amount' ? `${kr(l.value)} av priset` : `Kampanjpris ${kr(l.value)}`;
  const on = { all: 'alla produkter', categories: 'utvalda kategorier', brands: 'utvalda varumärken', products: 'utvalda produkter' }[l.appliesTo.type];
  return `${v} på ${on}`;
}

/** Kort text för hela kampanjen: raden, eller "3 rader". */
export const describeCampaign = (c: Pick<Row, 'lines'>) => (c.lines.length === 1 ? describeLine(c.lines[0]) : `${c.lines.length} rader med olika rabatt`);

/** Kronor → öre för fasta belopp. Varje rad får ett id, så att Admin kan peka ut den. */
const toLines = (lines: Input['lines']): Line[] =>
  lines.map((l, i) => ({
    id: l.id || `r${i + 1}_${randomBytes(3).toString('hex')}`,
    valueType: l.valueType,
    value: l.valueType === 'percent' ? Math.round(l.value) : Math.round(l.value * 100),
    appliesTo: {
      type: l.appliesTo.type,
      categories: l.appliesTo.type === 'categories' ? l.appliesTo.categories : [],
      brands: l.appliesTo.type === 'brands' ? l.appliesTo.brands : [],
      products: l.appliesTo.type === 'products' ? l.appliesTo.products : [],
    },
  }));

const toRow = (d: Input) => ({
  title: d.title,
  slug: d.slug,
  intro: d.intro,
  lines: toLines(d.lines),
  startsOn: d.startsOn,
  endsOn: d.endsOn,
  enabled: d.enabled,
  banner: d.banner.placement === 'none' ? { text: d.banner.text, placement: 'none' as const } : d.banner,
});

/** Alla produkter som inte är arkiverade, med det som avgör vilka kampanjrader som gäller dem. */
async function catalog(db: Db) {
  const fams = await db
    .select({ id: s.productFamilies.id, slug: s.productFamilies.slug, name: s.productFamilies.name })
    .from(s.productFamilies)
    .where(ne(s.productFamilies.status, 'archived'))
    .orderBy(asc(s.productFamilies.name));
  const targets = await familyTargets(db, fams.map((f) => f.id));
  return fams.flatMap((f) => {
    const t = targets.get(f.id);
    return t ? [{ ...f, target: t as CampaignTarget }] : [];
  });
}
type Catalog = Awaited<ReturnType<typeof catalog>>;

/** Vilka produkter kampanjen gäller, vilken rad som gäller dem och vad de kostar före och under kampanjen. */
async function affected(db: Db, lines: Line[], cat?: Catalog) {
  const all = cat ?? (await catalog(db));
  const hit = all.filter((f) => campaignMatches({ lines }, f.target));
  if (!hit.length) return [];
  const vars = await db
    .select({ id: s.variants.id, familyId: s.variants.familyId })
    .from(s.variants)
    .where(and(inArray(s.variants.familyId, hit.map((f) => f.id)), eq(s.variants.status, 'active')));
  const prices = await currentPrices(db, vars.map((v) => v.id), today());
  return hit.map((f) => {
    const ordinary = vars.filter((v) => v.familyId === f.id).map((v) => prices.get(v.id)).filter((p): p is number => p !== undefined);
    const results = ordinary.map((p) => lineFor(lines, f.target, p));
    const sale = ordinary.map((p, i) => results[i]?.ore ?? p);
    const line = lineFor(lines, f.target, ordinary[0] ?? 0)?.line;
    return {
      slug: f.slug,
      name: f.name,
      variants: ordinary.length,
      ordinaryFrom: ordinary.length ? Math.min(...ordinary) / 100 : null,
      campaignFrom: sale.length ? Math.min(...sale) / 100 : null,
      /** Raden som gäller produkten (1 = första raden). */
      line: line ? lines.indexOf(line) + 1 : null,
      /** Antal rader som matchar. Fler än 1 = den mest specifika gäller. */
      matchingLines: lines.filter((l) => campaignMatches({ lines: [l] }, f.target)).length,
      /** Varianter där raden inte sänker priset (t.ex. fast pris högre än ordinarie). */
      notLowered: results.filter((r) => r?.ore == null).length,
    };
  });
}

/**
 * Andra kampanjer som pågår samtidigt och gäller samma produkter. Då gäller det lägsta priset,
 * men det är oftast ett misstag, så Admin varnar.
 */
async function overlaps(db: Db, c: Pick<Row, 'lines' | 'startsOn' | 'endsOn'> & { id?: string }, cat?: Catalog, rows?: Row[]) {
  const others = (rows ?? (await db.select().from(s.campaigns))).filter((o) => o.id !== c.id && o.enabled && periodsOverlap(o, c) && campaignState(o, today()) !== 'expired');
  if (!others.length) return [];
  const all = cat ?? (await catalog(db));
  const mine = all.filter((f) => campaignMatches(c, f.target));
  return others.flatMap((o) => {
    const both = mine.filter((f) => campaignMatches(o, f.target));
    if (!both.length) return [];
    return [{ id: o.id, title: o.title, startsOn: o.startsOn, endsOn: o.endsOn, count: both.length, products: both.slice(0, 5).map((f) => f.name) }];
  });
}

/** Formatet Admin läser och skickar tillbaka (belopp i kronor). */
function adminView(c: Row, extra: { overlaps?: Awaited<ReturnType<typeof overlaps>> } = {}, date = today()) {
  return {
    ...c,
    lines: c.lines.map((l) => ({ ...l, value: l.valueType === 'percent' ? l.value : l.value / 100 })),
    label: describeCampaign(c),
    state: campaignState(c, date),
    /** Har börjat före i dag: rader och start är låsta. */
    locked: c.enabled && c.startsOn < date,
    overlaps: extra.overlaps ?? [],
  };
}

/** Samma rader (pris och urval), oavsett id. */
const sameLines = (a: Line[], b: Line[]) => JSON.stringify(a.map(({ id: _id, ...l }) => l)) === JSON.stringify(b.map(({ id: _id, ...l }) => l));

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
  const view = async (row: Row) => adminView(row, { overlaps: await overlaps(db, row) });

  app.get('/admin/campaigns', async (c) => {
    const rows = await db.select().from(s.campaigns).orderBy(desc(s.campaigns.startsOn), desc(s.campaigns.createdAt));
    const cat = rows.length ? await catalog(db) : [];
    return c.json(await Promise.all(rows.map(async (r) => adminView(r, { overlaps: r.enabled && campaignState(r, today()) !== 'expired' ? await overlaps(db, r, cat, rows) : [] }))));
  });

  app.get('/admin/campaigns/:id', async (c) => {
    const [row] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, c.req.param('id')));
    if (!row) return c.json({ error: 'Kampanjen finns inte.' }, 404);
    return c.json(await view(row));
  });

  /** Förhandsvisning för en (även osparad) kampanj: produkter, vilken rad som gäller och krockar med andra kampanjer. */
  app.post('/admin/campaigns/preview', async (c) => {
    const body = z
      .object({
        id: z.string().optional(),
        lines: z.array(lineInput).max(30),
        startsOn: z.string().regex(dateRe).default(today()),
        endsOn: z.string().regex(dateRe).nullable().default(null),
      })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'Kontrollera fälten.' }, 400);
    const lines = toLines(body.data.lines);
    const cat = await catalog(db);
    return c.json({
      products: await affected(db, lines, cat),
      overlaps: await overlaps(db, { id: body.data.id, lines, startsOn: body.data.startsOn, endsOn: body.data.endsOn }, cat),
    });
  });

  app.post('/admin/campaigns', async (c) => {
    const p = await parse(c);
    if ('error' in p) return c.json({ error: p.error }, 400);
    if (await slugTaken(p.data.slug)) return c.json({ error: `Adressen /kampanj/${p.data.slug} används redan av en annan kampanj.` }, 409);
    const row = { id: `cp_${randomBytes(6).toString('hex')}`, ...toRow(p.data), updatedAt: new Date().toISOString() };
    await db.insert(s.campaigns).values(row);
    await logChange(db, {
      action: 'Kampanj skapad',
      object: `Kampanj: ${row.title}`,
      details: [{ field: 'Kampanj', from: '', to: `${row.lines.map(describeLine).join('; ')}, ${row.startsOn} – ${row.endsOn ?? 'tills vidare'}` }],
    });
    const [saved] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, row.id));
    return c.json(await view(saved));
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
      if (next.startsOn !== old.startsOn || !sameLines(next.lines, old.lines))
        return c.json({ error: 'Kampanjen har redan börjat. Rader och startdatum kan inte ändras. Avsluta den och skapa en ny i stället.' }, 409);
      next.lines = old.lines; // behåll radernas id
      if (!next.enabled) return c.json({ error: 'Kampanjen har redan börjat. Använd "Avsluta nu" i stället för att stänga av den.' }, 409);
      if (next.endsOn !== null && next.endsOn < addDays(date, -1)) return c.json({ error: 'Slutdatumet kan inte vara längre bak i tiden än i går.' }, 409);
      if (old.endsOn !== null && old.endsOn < date && next.endsOn !== old.endsOn) return c.json({ error: 'Kampanjen är avslutad och kan inte förlängas. Skapa en ny kampanj i stället.' }, 409);
    }
    await db.update(s.campaigns).set({ ...next, updatedAt: new Date().toISOString() }).where(eq(s.campaigns.id, old.id));
    const details = [
      ['Namn', old.title, next.title],
      ['Adress', old.slug, next.slug],
      ['Rader', old.lines.map(describeLine).join('; '), next.lines.map(describeLine).join('; ')],
      ['Start', old.startsOn, next.startsOn],
      ['Slut', old.endsOn ?? 'tills vidare', next.endsOn ?? 'tills vidare'],
      ['På/av', String(old.enabled), String(next.enabled)],
      ['Banner', `${old.banner.placement}: ${old.banner.text}`, `${next.banner.placement}: ${next.banner.text}`],
    ]
      .filter(([, a, b]) => a !== b)
      .map(([field, from, to]) => ({ field, from, to }));
    if (!sameLines(old.lines, next.lines) && !details.some((d) => d.field === 'Rader')) details.push({ field: 'Urval', from: 'tidigare urval', to: 'nytt urval' });
    if (details.length) await logChange(db, { action: 'Kampanj ändrad', object: `Kampanj: ${next.title}`, details });
    const [saved] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, old.id));
    return c.json(await view(saved));
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
    return c.json(await view(saved));
  });

  app.delete('/admin/campaigns/:id', async (c) => {
    const [row] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, c.req.param('id')));
    if (!row) return c.json({ error: 'Kampanjen finns inte.' }, 404);
    if (row.enabled && row.startsOn < today()) return c.json({ error: 'Kampanjen har redan visats i butiken och finns i prishistoriken. Den kan inte tas bort.' }, 409);
    await moveToTrash(db, { kind: 'campaign', objectId: row.id, label: row.title, detail: describeCampaign(row), parts: [['campaigns', [row]]] });
    await db.delete(s.campaigns).where(eq(s.campaigns.id, row.id));
    await logChange(db, { action: 'Kampanj borttagen', object: `Kampanj: ${row.title}`, details: [{ field: 'Till', from: '', to: 'Papperskorgen' }] });
    return c.json({ ok: true });
  });

  // ---------------------------------------------------------------- Butiken

  app.get('/campaigns', async (c) => c.json(await publicCampaigns(db, today())));

  return app;
}
