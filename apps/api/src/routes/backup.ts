/**
 * Admin → Inställningar → Backup. Laddar ner databasen och bilderna som en fil.
 */
import { desc, eq } from 'drizzle-orm';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Hono } from 'hono';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { logChange } from '../lib/audit.ts';
import { createBackup } from '../lib/backup.ts';
import { uploadsDir } from '../lib/paths-data.ts';

const ACTION = 'Backup nedladdad';
const mb = (bytes: number) => `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`;

export function backupRoutes(db: Db) {
  const app = new Hono();

  /** Hur stor backupen blir och när den senast laddades ner. */
  app.get('/admin/backup/info', async (c) => {
    const [last] = await db.select({ at: s.auditLog.at }).from(s.auditLog).where(eq(s.auditLog.action, ACTION)).orderBy(desc(s.auditLog.id)).limit(1);
    const dir = uploadsDir();
    let images = 0;
    let imageBytes = 0;
    for (const name of await readdir(dir)) {
      const st = await stat(join(dir, name));
      if (st.isFile()) {
        images++;
        imageBytes += st.size;
      }
    }
    const [{ page_count: pages, page_size: size }] = (await db.$client.execute('SELECT page_count, page_size FROM pragma_page_count(), pragma_page_size()')).rows as unknown as { page_count: number; page_size: number }[];
    return c.json({ lastBackup: last?.at ?? null, databaseBytes: Number(pages) * Number(size), images, imageBytes });
  });

  /** Själva filen. ?bilder=0 ger bara databasen. */
  app.get('/admin/backup', async (c) => {
    const images = c.req.query('bilder') !== '0';
    const b = await createBackup(db, { images });
    await logChange(db, {
      action: ACTION,
      object: 'Backup',
      details: [{ field: 'Innehåll', from: '', to: images ? `Databas (${mb(b.databaseBytes)}) och ${b.images} bilder` : `Databas (${mb(b.databaseBytes)})` }],
    });
    return c.body(new Uint8Array(b.data), 200, {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${b.fileName}"`,
      'Content-Length': String(b.data.length),
      'Cache-Control': 'no-store',
    });
  });

  return app;
}
