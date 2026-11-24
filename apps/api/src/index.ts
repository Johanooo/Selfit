/**
 * Startar SELFITs server. I produktion visar den även butikens byggda sidor,
 * så att allt körs som en enda app (t.ex. hos Hostinger).
 *
 * Miljövariabler:
 *   PORT           port att lyssna på (standard 3001)
 *   DATABASE_URL   databas (standard file:./data/selfit.db)
 *   SEED_IF_EMPTY  "true" fyller en tom databas med exempeldata
 *   SITE_PASSWORD  om satt krävs lösenord för hela sajten (användarnamn: SITE_USER, standard "selfit")
 */
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { createApp } from './app.ts';
import { createDb } from './db/client.ts';
import { runMigrations } from './db/migrate.ts';
import { isEmpty, seed } from './db/seed.ts';
import { findDir, here } from './lib/paths.ts';

const db = createDb();
await runMigrations(db);
if (process.env.SEED_IF_EMPTY === 'true' && (await isEmpty(db))) {
  await seed(db);
  console.log('Tom databas fylld med exempeldata.');
}

const root = new Hono();

const password = process.env.SITE_PASSWORD;
if (password) {
  root.use('*', basicAuth({ username: process.env.SITE_USER ?? 'selfit', password, realm: 'SELFIT test' }));
}

root.route('/', createApp(db));

// Butikens byggda sidor (apps/web/dist/public), om de finns.
const dir = here(import.meta.url);
const webDir = findDir(`${dir}/../../web/dist/public`);
if (webDir) {
  const indexHtml = readFileSync(`${webDir}/index.html`, 'utf8');
  root.use('*', serveStatic({ root: relative(process.cwd(), webDir) }));
  // Alla andra adresser (t.ex. /produkt/pwo-plus) visar butikens startfil.
  root.get('*', (c) => (c.req.path.startsWith('/api/') ? c.notFound() : c.html(indexHtml)));
}

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: root.fetch, port }, () => {
  console.log(`SELFIT kör på http://localhost:${port}${webDir ? '' : ' (endast API)'}`);
});
