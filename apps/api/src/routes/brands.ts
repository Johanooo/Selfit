/**
 * Admin → Varumärken. Ett varumärke måste skapas här innan det kan väljas på en produkt.
 */
import { asc, count, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { logChange } from '../lib/audit.ts';
import { moveToTrash } from '../lib/trash.ts';

const brandInput = z.object({
  name: z.string().trim().min(1, 'Ange namn på varumärket.').max(60),
  intro: z.string().trim().max(400).default(''),
});

const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/é/g, 'e')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export function brandRoutes(db: Db) {
  const app = new Hono();

  app.get('/admin/brands', async (c) => {
    const [rows, counts] = await Promise.all([
      db.select().from(s.brands).orderBy(asc(s.brands.name)),
      db.select({ brandId: s.productFamilies.brandId, n: count() }).from(s.productFamilies).groupBy(s.productFamilies.brandId),
    ]);
    const byBrand = new Map(counts.map((r) => [r.brandId, Number(r.n)]));
    return c.json(rows.map((b) => ({ ...b, products: byBrand.get(b.id) ?? 0 })));
  });

  app.post('/admin/brands', async (c) => {
    const parsed = brandInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Kontrollera fälten.' }, 400);
    const slug = slugify(parsed.data.name);
    if (!slug) return c.json({ error: 'Namnet måste innehålla bokstäver eller siffror.' }, 400);
    const [taken] = await db.select({ id: s.brands.id }).from(s.brands).where(eq(s.brands.slug, slug));
    if (taken) return c.json({ error: `Varumärket ${parsed.data.name} finns redan.` }, 409);
    const row = { id: `br_${slug}`, slug, name: parsed.data.name, intro: parsed.data.intro };
    await db.insert(s.brands).values(row);
    await logChange(db, { action: 'Varumärke skapat', object: `Varumärke: ${row.name}` });
    return c.json({ ...row, products: 0 });
  });

  app.put('/admin/brands/:id', async (c) => {
    const parsed = brandInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Kontrollera fälten.' }, 400);
    const [row] = await db.select().from(s.brands).where(eq(s.brands.id, c.req.param('id')));
    if (!row) return c.json({ error: 'Varumärket finns inte.' }, 404);
    await db.update(s.brands).set({ name: parsed.data.name, intro: parsed.data.intro }).where(eq(s.brands.id, row.id));
    if (row.name !== parsed.data.name || (row.intro ?? '') !== parsed.data.intro) {
      await logChange(db, {
        action: 'Varumärke ändrat',
        object: `Varumärke: ${parsed.data.name}`,
        details: [
          ...(row.name !== parsed.data.name ? [{ field: 'Namn', from: row.name, to: parsed.data.name }] : []),
          ...((row.intro ?? '') !== parsed.data.intro ? [{ field: 'Beskrivning', from: row.intro ?? '', to: parsed.data.intro }] : []),
        ],
      });
    }
    return c.json({ ...row, ...parsed.data });
  });

  app.delete('/admin/brands/:id', async (c) => {
    const [row] = await db.select().from(s.brands).where(eq(s.brands.id, c.req.param('id')));
    if (!row) return c.json({ error: 'Varumärket finns inte.' }, 404);
    const [used] = await db.select({ n: count() }).from(s.productFamilies).where(eq(s.productFamilies.brandId, row.id));
    if (Number(used?.n ?? 0) > 0) return c.json({ error: `${row.name} används av ${used.n} produkter och kan inte tas bort.` }, 409);
    await moveToTrash(db, { kind: 'brand', objectId: row.id, label: row.name, parts: [['brands', [row]]] });
    await db.delete(s.brands).where(eq(s.brands.id, row.id));
    await logChange(db, { action: 'Varumärke borttaget', object: `Varumärke: ${row.name}`, details: [{ field: 'Till', from: '', to: 'Papperskorgen' }] });
    return c.json({ ok: true });
  });

  return app;
}
