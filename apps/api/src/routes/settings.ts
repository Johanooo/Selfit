import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { defaultSettings, type SiteSettings } from '../../../web/src/data/siteDefaults.ts';
import { defaultHome, defaultNavigation } from '../../../web/src/data/homeDefaults.ts';
import { normalizeShipping, replaceShipping, SHIPPING_METHOD_IDS, type ShippingSettings } from '../../../web/src/data/shipping.ts';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { diff, logChange } from '../lib/audit.ts';

const text = (max = 200) => z.string().trim().max(max);
/** En länk: text och adress. Tom adress = bara text. */
const link = z.object({ label: text(80), href: text(300) });

const shippingMethod = z.object({
  name: text(60).min(1, 'Varje fraktsätt behöver ett namn.'),
  text: text(200),
  price: z.number().min(0, 'Priset kan inte vara negativt.').max(1000),
  priceOverFree: z.number().min(0, 'Priset kan inte vara negativt.').max(1000),
  active: z.boolean(),
});

/** Regler för vad som får sparas. Felmeddelanden visas i Admin. */
export const settingsSchemas = {
  company: z.object({
    brand: text(60).min(1, 'Ange varumärke.'),
    legalName: text().min(1, 'Ange bolagsnamn.'),
    orgNr: text(30),
    vatNr: text(30),
    address: text(),
    email: text(),
    phone: text(40),
    hours: text(),
    emailProvider: text(),
  }),
  policies: z.object({
    openPurchaseDays: z.number().int().min(14, 'Öppet köp kan inte vara kortare än lagens 14 dagar.').max(365),
    returnFee: z.number().int().min(0).max(1000),
    uncollectedFee: z.number().int().min(0).max(2000),
    ageLimit: z.number().int().min(0).max(25),
    dispatchDays: text(40).min(1, 'Ange leveranstid.'),
    orderCutoff: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Ange klockslag som TT:MM, t.ex. 14:00.').default('14:00'),
    termsUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ange datum som ÅÅÅÅ-MM-DD.'),
  }),
  home: z.object({
    hero: z.object({
      tag: text(60),
      title: text(120).min(1, 'Startbilden behöver en rubrik.'),
      lead: text(300),
      image: text(400).min(1, 'Välj en bild.'),
      primary: link,
      secondary: link,
    }),
    quickLinks: z.array(link).max(12),
    sections: z
      .array(
        z.union([
          z.object({ kind: z.literal('row'), id: z.string().min(1).max(40) }),
          z.object({ kind: z.enum(['categories', 'pwo', 'services', 'instagram', 'tiles']) }),
        ]),
      )
      .max(20),
    rows: z
      .array(
        z.object({
          id: z.string().min(1).max(40),
          title: text(80).min(1, 'Varje produktrad behöver en rubrik.'),
          source: z.string().regex(/^(sale|popular|new|category:[\w-]+|collection:[\w-]+)$/, 'Välj vilka produkter raden ska visa.'),
          limit: z.number().int().min(4).max(20),
          moreLabel: text(60),
          moreHref: text(200),
          visible: z.boolean(),
        }),
      )
      .max(10),
    categoriesTitle: text(80),
    services: z.array(z.object({ icon: z.enum(['truck', 'zap', 'rotate', 'chat', 'shield', 'gift', 'heart', 'star']), title: text(60).min(1), text: text(160) })).max(4),
    tiles: z.array(z.object({ image: text(400).min(1, 'Varje bildruta behöver en bild.'), title: text(60), buttonLabel: text(40), href: text(300) })).max(4),
    instagram: z.object({
      handle: text(40),
      url: text(300),
      images: z.array(z.object({ src: text(400).min(1), href: text(400) })).max(16),
    }),
  }),
  navigation: z.object({
    topbar: z.array(link).max(5),
    menuLinks: z.array(link.extend({ position: z.enum(['before', 'after']), highlight: z.boolean() })).max(8),
  }),
  shipping: z
    .object({
      freeFrom: z.number().min(0, 'Gränsen kan inte vara negativ.').max(100000),
      methods: z.object({ ombud: shippingMethod, hem: shippingMethod }),
    })
    .refine((v) => SHIPPING_METHOD_IDS.some((id) => v.methods[id].active), {
      message: 'Minst ett fraktsätt måste vara på, annars kan ingen handla.',
      path: ['methods'],
    })
    .refine((v) => SHIPPING_METHOD_IDS.every((id) => v.methods[id].priceOverFree <= v.methods[id].price), {
      message: 'Priset över gränsen för fri frakt kan inte vara högre än det vanliga priset.',
      path: ['methods'],
    }),
} as const;

/** Fraktsätten i databasen (används av serverns kassa) hålls i takt med inställningarna. */
export async function syncShipping(db: Db, value?: ShippingSettings) {
  const sh = value ?? (await readSettings(db)).shipping;
  replaceShipping(sh);
  for (const id of SHIPPING_METHOD_IDS) {
    const m = sh.methods[id];
    await db
      .update(s.shippingMethods)
      .set({ name: m.name, priceOre: Math.round(m.price * 100), priceOverThresholdOre: Math.round(m.priceOverFree * 100), freeThresholdOre: Math.round(sh.freeFrom * 100), active: m.active })
      .where(eq(s.shippingMethods.id, `ship_${id}`));
  }
}

type Key = keyof typeof settingsSchemas;
const isKey = (k: string): k is Key => k in settingsSchemas;

export async function readSettings(db: Db): Promise<SiteSettings> {
  const rows = await db.select().from(s.siteSettings);
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    company: { ...defaultSettings.company, ...(byKey.company ?? {}) },
    policies: { ...defaultSettings.policies, ...(byKey.policies ?? {}) },
    home: { ...defaultHome, ...(byKey.home ?? {}) },
    navigation: { ...defaultNavigation, ...(byKey.navigation ?? {}) },
    shipping: normalizeShipping(byKey.shipping),
  };
}

export function settingsRoutes(db: Db) {
  const app = new Hono();

  /** Butiken hämtar företagsuppgifter och villkor här. */
  app.get('/settings', async (c) => c.json(await readSettings(db)));

  /** Admin sparar en del av inställningarna, t.ex. PUT /admin/settings/company. */
  app.put('/admin/settings/:key', async (c) => {
    const key = c.req.param('key');
    if (!isKey(key)) return c.json({ error: 'Okänd inställning.' }, 404);
    const parsed = settingsSchemas[key].safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      const fields = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? ''), i.message]));
      // Fel som gäller hela formuläret (t.ex. inget fraktsätt på) visas som huvudmeddelande.
      const first = parsed.error.issues[0];
      if (key === 'shipping' && first) return c.json({ error: first.message, fields }, 400);
      return c.json({ error: 'Kontrollera fälten.', fields }, 400);
    }
    const before = (await readSettings(db))[key] as unknown as Record<string, unknown>;
    const now = new Date().toISOString();
    await db
      .insert(s.siteSettings)
      .values({ key, value: parsed.data, updatedAt: now })
      .onConflictDoUpdate({ target: s.siteSettings.key, set: { value: parsed.data, updatedAt: now } });
    if (key === 'shipping') await syncShipping(db, normalizeShipping(parsed.data));
    const changes = diff(before, parsed.data as Record<string, unknown>);
    if (changes.length) {
      const names: Record<Key, string> = { company: 'Företagsuppgifter', policies: 'Villkor och avgifter', home: 'Startsida', navigation: 'Topprad och meny', shipping: 'Frakt' };
      const labels: Record<string, string> = { hero: 'Startbild', quickLinks: 'Snabblänkar', sections: 'Ordning på startsidan', rows: 'Produktrader', categoriesTitle: 'Rubrik för kategorier', services: 'Fördelar', instagram: 'Instagram', tiles: 'Bildrutor', topbar: 'Topprad', menuLinks: 'Menylänkar', freeFrom: 'Fri frakt från (kr)', methods: 'Fraktsätt' };
      // Listor och block loggas som "ändrad" i stället för hela innehållet, så att loggen går att läsa.
      const readable = changes.map((ch) =>
        typeof ch.from === 'object' || typeof ch.to === 'object' ? { field: labels[ch.field] ?? ch.field, from: 'tidigare version', to: 'ny version' } : ch,
      );
      await logChange(db, { action: 'Inställning ändrad', object: names[key], details: readable });
    }
    const [row] = await db.select().from(s.siteSettings).where(eq(s.siteSettings.key, key));
    return c.json({ key, value: row.value, updatedAt: row.updatedAt });
  });

  return app;
}

export type { Key as SettingsKey };
