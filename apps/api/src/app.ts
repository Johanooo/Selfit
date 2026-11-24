import { Hono } from 'hono';
import { logger } from 'hono/logger';
import type { Db } from './db/client.ts';
import { cartRoutes } from './routes/cart.ts';
import { catalogRoutes } from './routes/catalog.ts';

export function createApp(db: Db) {
  const app = new Hono().basePath('/api');
  if (process.env.NODE_ENV !== 'test') app.use(logger());
  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.route('/', catalogRoutes(db));
  app.route('/', cartRoutes(db));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'Något gick fel på servern.' }, 500);
  });
  return app;
}
