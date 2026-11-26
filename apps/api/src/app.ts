import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { eq } from 'drizzle-orm';
import type { Db } from './db/client.ts';
import * as s from './db/schema.ts';

const STARTED_AT = new Date().toISOString();
import { cartRoutes } from './routes/cart.ts';
import { catalogRoutes } from './routes/catalog.ts';
import { adminProductRoutes } from './routes/adminProducts.ts';
import { auditRoutes } from './routes/audit.ts';
import { pageRoutes } from './routes/pages.ts';
import { settingsRoutes } from './routes/settings.ts';

export function createApp(db: Db) {
  const app = new Hono().basePath('/api');
  if (process.env.NODE_ENV !== 'test') app.use(logger());
  /** Visar att servern lever och sedan när databasen funnits (för att se att den överlever uppdateringar). */
  app.get('/health', async (c) => {
    const [row] = await db.select().from(s.siteSettings).where(eq(s.siteSettings.key, '_meta'));
    return c.json({ status: 'ok', databaseCreated: (row?.value as { createdAt?: string } | undefined)?.createdAt ?? null, startedAt: STARTED_AT });
  });
  app.route('/', catalogRoutes(db));
  app.route('/', cartRoutes(db));
  app.route('/', settingsRoutes(db));
  app.route('/', pageRoutes(db));
  app.route('/', auditRoutes(db));
  app.route('/', adminProductRoutes(db));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'Något gick fel på servern.' }, 500);
  });
  return app;
}
