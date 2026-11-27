import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { defaultSettings, type SiteSettings } from '../../../web/src/data/siteDefaults.ts';
import { defaultHome, defaultNavigation } from '../../../web/src/data/homeDefaults.ts';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { diff, logChange } from '../lib/audit.ts';

const text = (max = 200) => z.string().trim().max(max);
/** En länk: text och adress. Tom adress = bara text. */
const link = z.object({ label: text(80), href: text(300) });

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
          z.object({ kind: z.enum(['categories', 'pwo', 'services', 'instagram']) }),
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
} as const;

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
      return c.json({ error: 'Kontrollera fälten.', fields }, 400);
    }
    const before = (await readSettings(db))[key] as unknown as Record<string, unknown>;
    const now = new Date().toISOString();
    await db
      .insert(s.siteSettings)
      .values({ key, value: parsed.data, updatedAt: now })
      .onConflictDoUpdate({ target: s.siteSettings.key, set: { value: parsed.data, updatedAt: now } });
    const changes = diff(before, parsed.data as Record<string, unknown>);
    if (changes.length) {
      const names: Record<Key, string> = { company: 'Företagsuppgifter', policies: 'Villkor och avgifter', home: 'Startsida', navigation: 'Topprad och meny' };
      const labels: Record<string, string> = { hero: 'Startbild', quickLinks: 'Snabblänkar', sections: 'Ordning på startsidan', rows: 'Produktrader', categoriesTitle: 'Rubrik för kategorier', services: 'Fördelar', instagram: 'Instagram', topbar: 'Topprad', menuLinks: 'Menylänkar' };
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
