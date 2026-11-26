import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { defaultSettings, type SiteSettings } from '../../../web/src/data/siteDefaults.ts';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { diff, logChange } from '../lib/audit.ts';

const text = (max = 200) => z.string().trim().max(max);

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
} as const;

type Key = keyof typeof settingsSchemas;
const isKey = (k: string): k is Key => k in settingsSchemas;

export async function readSettings(db: Db): Promise<SiteSettings> {
  const rows = await db.select().from(s.siteSettings);
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    company: { ...defaultSettings.company, ...(byKey.company ?? {}) },
    policies: { ...defaultSettings.policies, ...(byKey.policies ?? {}) },
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
      await logChange(db, { action: 'Inställning ändrad', object: key === 'company' ? 'Företagsuppgifter' : 'Villkor och avgifter', details: changes });
    }
    const [row] = await db.select().from(s.siteSettings).where(eq(s.siteSettings.key, key));
    return c.json({ key, value: row.value, updatedAt: row.updatedAt });
  });

  return app;
}

export type { Key as SettingsKey };
