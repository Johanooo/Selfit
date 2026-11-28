/**
 * Admin → Mediebibliotek: alla uppladdade bilder, plus butikens egna bilder (t.ex. PWO+-burkarna).
 */
import { randomBytes } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { logChange } from '../lib/audit.ts';
import { uploadsDir } from '../lib/paths-data.ts';
import { findDir, here } from '../lib/paths.ts';
import type { ProductDisplay } from '../lib/storefront.ts';
import { moveToTrash } from '../lib/trash.ts';

const TYPES: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

/** Butikens egna bilder (public/images), bara WebP. */
function siteImages(): { src: string; name: string }[] {
  const dir = here(import.meta.url);
  const root = findDir(`${dir}/../../web/dist/public/images`, `${dir}/../../../web/dist/public/images`, `${dir}/../../../web/public/images`, `${process.cwd()}/../web/public/images`);
  if (!root) return [];
  const out: { src: string; name: string }[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const full = join(d, f);
      if (statSync(full).isDirectory()) walk(full);
      else if (f.endsWith('.webp') && !/-\d{3}\.webp$/.test(f)) out.push({ src: `/images/${relative(root, full).split('\\').join('/')}`, name: f });
    }
  };
  walk(root);
  return out.sort((a, b) => a.src.localeCompare(b.src));
}

/** Vilka produkter som använder en bild. */
async function usage(db: Db) {
  const fams = await db.select({ name: s.productFamilies.name, display: s.productFamilies.display }).from(s.productFamilies);
  const map = new Map<string, string[]>();
  for (const f of fams) {
    const d = (f.display ?? {}) as ProductDisplay;
    const srcs = new Set([...(d.images ?? []).map((i) => i.src), d.primaryImage].filter(Boolean) as string[]);
    for (const src of srcs) map.set(src, [...(map.get(src) ?? []), f.name]);
  }
  return map;
}

/** Sparar en uppladdad fil och lägger den i mediebiblioteket. */
export async function saveUpload(db: Db, file: File, alt = '') {
  const ext = TYPES[file.type];
  if (!ext) throw new Error('Bilden måste vara WebP, JPEG eller PNG.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Bilden är större än 5 MB.');
  const fileName = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}.${ext}`;
  await writeFile(join(uploadsDir(), fileName), Buffer.from(await file.arrayBuffer()));
  const row = {
    id: `m_${randomBytes(6).toString('hex')}`,
    src: `/uploads/${fileName}`,
    name: file.name.replace(/\.\w+$/, '') || fileName,
    alt,
    bytes: file.size,
  };
  await db.insert(s.media).values(row);
  return row;
}

export function mediaRoutes(db: Db) {
  const app = new Hono();

  app.get('/admin/media', async (c) => {
    const [rows, used] = await Promise.all([db.select().from(s.media).orderBy(desc(s.media.createdAt)), usage(db)]);
    return c.json({
      uploads: rows.map((r) => ({ ...r, usedBy: used.get(r.src) ?? [] })),
      site: siteImages().map((i) => ({ ...i, usedBy: used.get(i.src) ?? [] })),
    });
  });

  app.post('/admin/media', async (c) => {
    const form = await c.req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) return c.json({ error: 'Ingen bild skickades.' }, 400);
    try {
      const row = await saveUpload(db, file, String(form?.get('alt') ?? ''));
      return c.json({ ...row, usedBy: [] });
    } catch (e) {
      return c.json({ error: (e as Error).message }, 400);
    }
  });

  app.put('/admin/media/:id', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { alt?: string; name?: string };
    const [row] = await db.select().from(s.media).where(eq(s.media.id, c.req.param('id')));
    if (!row) return c.json({ error: 'Bilden finns inte.' }, 404);
    const next = { alt: String(body.alt ?? row.alt).slice(0, 200), name: String(body.name ?? row.name).slice(0, 120) || row.name };
    await db.update(s.media).set(next).where(eq(s.media.id, row.id));
    return c.json({ ...row, ...next });
  });

  app.delete('/admin/media/:id', async (c) => {
    const [row] = await db.select().from(s.media).where(eq(s.media.id, c.req.param('id')));
    if (!row) return c.json({ error: 'Bilden finns inte.' }, 404);
    const usedBy = (await usage(db)).get(row.src) ?? [];
    if (usedBy.length) return c.json({ error: `Bilden används av ${usedBy.join(', ')}. Ta bort den från produkten först.` }, 409);
    // Filen ligger kvar så att bilden kan läggas tillbaka. Den tas bort när papperskorgen töms.
    await moveToTrash(db, { kind: 'media', objectId: row.id, label: row.name, parts: [['media', [row]]] });
    await db.delete(s.media).where(eq(s.media.id, row.id));
    await logChange(db, { action: 'Bild borttagen', object: `Mediebibliotek: ${row.name}`, details: [{ field: 'Till', from: '', to: 'Papperskorgen' }] });
    return c.json({ ok: true });
  });

  return app;
}
