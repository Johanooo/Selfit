import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { getDefaultPage, type PageContent } from '../../../web/src/data/pageTemplates.ts';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { logChange } from '../lib/audit.ts';

export const pageSchema = z.object({
  title: z.string().trim().min(1, 'Sidan behöver en rubrik.').max(120),
  summary: z.string().trim().max(400),
  sections: z
    .array(z.object({ heading: z.string().trim().max(160), body: z.string().max(20000) }))
    .max(60),
  faq: z
    .array(
      z.object({
        q: z.string().trim().min(1, 'Varje fråga behöver en fråga.').max(300),
        a: z.string().trim().min(1, 'Varje fråga behöver ett svar.').max(4000),
        category: z.string().trim().max(60).optional(),
        hidden: z.boolean().optional(),
      }),
    )
    .max(200)
    .optional(),
});

const toContent = (r: typeof s.pages.$inferSelect): PageContent & { updatedAt: string } => ({
  slug: r.slug,
  title: r.title,
  summary: r.summary,
  sections: r.sections,
  ...(r.faq ? { faq: r.faq } : {}),
  updatedAt: r.updatedAt,
});

export function pageRoutes(db: Db) {
  const app = new Hono();

  /** Sidor som har ändrats i Admin. Övriga visas med standardtexten. */
  app.get('/pages', async (c) => {
    const rows = await db.select().from(s.pages).orderBy(asc(s.pages.slug));
    return c.json(rows.map(toContent));
  });

  /** Spara en omskriven sida. */
  app.put('/admin/pages/:slug', async (c) => {
    const slug = c.req.param('slug');
    const original = getDefaultPage(slug);
    if (!original) return c.json({ error: 'Sidan finns inte.' }, 404);
    const parsed = pageSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? 'Kontrollera fälten.' }, 400);
    }
    const [prev] = await db.select().from(s.pages).where(eq(s.pages.slug, slug));
    const old = prev ?? original;
    const changed = (['title', 'summary', 'sections', 'faq'] as const).filter(
      (k) => parsed.data[k] !== undefined && JSON.stringify(old[k] ?? null) !== JSON.stringify(parsed.data[k]),
    );
    const now = new Date().toISOString();
    const v = { ...parsed.data, faq: parsed.data.faq ?? original.faq ?? null, updatedAt: now };
    await db
      .insert(s.pages)
      .values({ slug, ...v })
      .onConflictDoUpdate({ target: s.pages.slug, set: v });
    if (changed.length) {
      const names = { title: 'Rubrik', summary: 'Ingress', sections: 'Text', faq: 'Frågor' } as const;
      const describe = (k: (typeof changed)[number], src: { title: string; summary: string; sections: unknown[]; faq?: unknown[] | null }) =>
        k === 'sections' ? `${src.sections.length} avsnitt` : k === 'faq' ? `${src.faq?.length ?? 0} frågor` : src[k];
      await logChange(db, {
        action: 'Sida ändrad',
        object: `Sida: ${original.title}`,
        details: changed.map((k) => ({ field: names[k], from: describe(k, old), to: describe(k, parsed.data) })),
      });
    }
    const [row] = await db.select().from(s.pages).where(eq(s.pages.slug, slug));
    return c.json(toContent(row));
  });

  /** Återställ originaltexten. */
  app.delete('/admin/pages/:slug', async (c) => {
    const slug = c.req.param('slug');
    const deleted = await db.delete(s.pages).where(eq(s.pages.slug, slug)).returning();
    if (deleted.length) await logChange(db, { action: 'Originaltext återställd', object: `Sida: ${getDefaultPage(slug)?.title ?? slug}` });
    return c.json({ ok: true });
  });

  return app;
}
