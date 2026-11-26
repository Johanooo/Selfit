import { Hono } from 'hono';
import type { Db } from '../db/client.ts';
import { readLog } from '../lib/audit.ts';

/** Ändringsloggen kan bara läsas. Det finns ingen PUT/DELETE med flit. */
export function auditRoutes(db: Db) {
  const app = new Hono();
  app.get('/admin/audit', async (c) => {
    const limit = Math.min(1000, Math.max(1, Number(c.req.query('limit')) || 200));
    return c.json(await readLog(db, limit));
  });
  return app;
}
