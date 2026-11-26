import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { getDefaultPage, type PageContent } from '../../../web/src/data/pageTemplates.ts';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';

export const pageSchema = z.object({
  title: z.string().trim().min(1, 'Sidan behöver en rubrik.').max(120),
  summary: z.string().trim().max(400),
  sections: z
    .array(z.object({ heading: z.string().trim().max(160), body: z.string().max(20000) }))
    .max(60),
  faq: z.array(z.object({ q: z.string().trim().min(1).max(300), a: z.string().trim().min(1).max(4000) })).max(100).optional(),
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
    const now = new Date().toISOString();
    const v = { ...parsed.data, faq: parsed.data.faq ?? original.faq ?? null, updatedAt: now };
    await db
      .insert(s.pages)
      .values({ slug, ...v })
      .onConflictDoUpdate({ target: s.pages.slug, set: v });
    const [row] = await db.select().from(s.pages).where(eq(s.pages.slug, slug));
    return c.json(toContent(row));
  });

  /** Återställ originaltexten. */
  app.delete('/admin/pages/:slug', async (c) => {
    await db.delete(s.pages).where(eq(s.pages.slug, c.req.param('slug')));
    return c.json({ ok: true });
  });

  return app;
}
