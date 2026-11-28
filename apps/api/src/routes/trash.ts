/**
 * Admin → Papperskorg. Det som tagits bort kan läggas tillbaka i 30 dagar.
 */
import { desc, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { logChange } from '../lib/audit.ts';
import { deleteForGood, expiresAt, getTrashEntry, KIND_NAMES, purgeExpired, restoreRows, type TrashKind } from '../lib/trash.ts';

type Payload = [string, Record<string, unknown>[]][];

const COLUMN_NAMES: Record<string, string> = { slug: 'adress', code: 'kod', sku: 'artikelnummer (SKU)', gtin: 'EAN-kod', name: 'namn', id: 'id' };

/** "UNIQUE constraint failed: categories.slug" → en förklaring på svenska. */
function explain(err: unknown, label: string) {
  // Databasens förklaring ligger ibland i err.cause.
  const e = err as { message?: string; cause?: { message?: string } };
  const msg = `${e?.message ?? err} ${e?.cause?.message ?? ''}`;
  const m = msg.match(/UNIQUE constraint failed: \w+\.(\w+)/);
  if (m) return `Det finns redan något med samma ${COLUMN_NAMES[m[1]] ?? m[1]} som ${label}. Byt namn på det eller ta bort det först, och försök igen.`;
  return `${label} kunde inte läggas tillbaka.`;
}

const rowsOf = (p: Payload, table: string) => p.find(([t]) => t === table)?.[1] ?? [];

/**
 * Kontroller före tillbakaläggning, och kopplingar till sådant som inte finns längre tas bort
 * (t.ex. en kategori som raderats under tiden). Returnerar ett felmeddelande eller den justerade kopian.
 */
async function prepare(db: Db, kind: TrashKind, payload: Payload): Promise<{ error: string } | { payload: Payload; note?: string }> {
  if (kind === 'product') {
    const fam = rowsOf(payload, 'productFamilies')[0];
    const brandId = String(fam?.brandId ?? '');
    const [brand] = brandId ? await db.select({ id: s.brands.id }).from(s.brands).where(inArray(s.brands.id, [brandId])) : [];
    if (!brand) return { error: 'Produktens varumärke finns inte längre. Lägg tillbaka varumärket först (det ligger kanske också i papperskorgen).' };
    const [cats, cols, fams] = await Promise.all([
      db.select({ id: s.categories.id }).from(s.categories),
      db.select({ id: s.collections.id }).from(s.collections),
      db.select({ id: s.productFamilies.id }).from(s.productFamilies),
    ]);
    const catIds = new Set(cats.map((c) => c.id));
    const colIds = new Set(cols.map((c) => c.id));
    const famIds = new Set([...fams.map((f) => f.id), String(fam?.id)]);
    let dropped = 0;
    const next = payload.map(([table, rows]): [string, Record<string, unknown>[]] => {
      const keep =
        table === 'productCategories' ? rows.filter((r) => catIds.has(String(r.categoryId)))
        : table === 'productCollections' ? rows.filter((r) => colIds.has(String(r.collectionId)))
        : table === 'productRelations' ? rows.filter((r) => famIds.has(String(r.familyId)) && famIds.has(String(r.relatedFamilyId)))
        : rows;
      if (table === 'productCategories') dropped += rows.length - keep.length;
      return [table, keep];
    });
    return { payload: next, note: dropped ? `${dropped} ${dropped === 1 ? 'kategori' : 'kategorier'} fanns inte längre och kopplades bort.` : undefined };
  }
  if (kind === 'category') {
    const cat = rowsOf(payload, 'categories')[0];
    if (cat?.parentId) {
      const [parent] = await db.select({ id: s.categories.id }).from(s.categories).where(inArray(s.categories.id, [String(cat.parentId)]));
      if (!parent) return { error: 'Huvudkategorin finns inte längre. Lägg tillbaka den först.' };
    }
  }
  return { payload };
}

export function trashRoutes(db: Db, changed: () => Promise<unknown> = async () => undefined) {
  const app = new Hono();

  app.get('/admin/trash', async (c) => {
    await purgeExpired(db);
    const rows = await db.select().from(s.trash).orderBy(desc(s.trash.deletedAt));
    return c.json(
      rows.map(({ payload: _payload, ...r }) => ({
        ...r,
        kindName: KIND_NAMES[r.kind as TrashKind] ?? r.kind,
        expiresAt: expiresAt(r.deletedAt),
      })),
    );
  });

  app.post('/admin/trash/:id/restore', async (c) => {
    const entry = await getTrashEntry(db, c.req.param('id'));
    if (!entry) return c.json({ error: 'Finns inte i papperskorgen längre.' }, 404);
    const kind = entry.kind as TrashKind;
    const prep = await prepare(db, kind, entry.payload);
    if ('error' in prep) return c.json({ error: prep.error }, 409);
    try {
      await restoreRows(db, prep.payload);
    } catch (err) {
      return c.json({ error: explain(err, entry.label) }, 409);
    }
    await db.delete(s.trash).where(inArray(s.trash.id, [entry.id]));
    await logChange(db, { action: `${KIND_NAMES[kind]} tillbakalagd`, object: `${KIND_NAMES[kind]}: ${entry.label}`, details: [{ field: 'Från', from: 'Papperskorgen', to: 'Admin' }] });
    if (kind === 'category' || kind === 'productType') await changed();
    return c.json({ ok: true, kind, objectId: entry.objectId, note: prep.note ?? null });
  });

  app.delete('/admin/trash/:id', async (c) => {
    const entry = await getTrashEntry(db, c.req.param('id'));
    if (!entry) return c.json({ error: 'Finns inte i papperskorgen längre.' }, 404);
    await deleteForGood(db, [entry.id]);
    await logChange(db, { action: 'Raderad för gott', object: `${KIND_NAMES[entry.kind as TrashKind] ?? entry.kind}: ${entry.label}` });
    return c.json({ ok: true });
  });

  /** Töm papperskorgen. */
  app.delete('/admin/trash', async (c) => {
    const rows = await db.select({ id: s.trash.id }).from(s.trash);
    await deleteForGood(db, rows.map((r) => r.id));
    if (rows.length) await logChange(db, { action: 'Papperskorgen tömd', object: 'Papperskorg', details: [{ field: 'Antal', from: rows.length, to: 0 }] });
    return c.json({ ok: true, deleted: rows.length });
  });

  return app;
}
