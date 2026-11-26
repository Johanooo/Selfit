/**
 * Startar SELFITs server. I produktion visar den även butikens byggda sidor,
 * så att allt körs som en enda app (t.ex. hos Hostinger).
 *
 * Miljövariabler:
 *   PORT           port att lyssna på (standard 3001)
 *   DATABASE_URL   databas (standard: ~/selfit-data/selfit.db i produktion, ./data/selfit.db lokalt)
 *   SEED_IF_EMPTY  "true" fyller en tom databas med exempeldata
 *   SITE_PASSWORD  om satt krävs lösenord för hela sajten (användarnamn: SITE_USER, standard "selfit")
 */
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { compress } from 'hono/compress';
import { createApp } from './app.ts';
import { createDb, defaultDatabaseUrl } from './db/client.ts';
import { buildStorefrontProducts } from './lib/storefront.ts';
import { markDatabaseCreated } from './db/meta.ts';
import { runMigrations } from './db/migrate.ts';
import { isEmpty, seed } from './db/seed.ts';
import { findDir, here } from './lib/paths.ts';

const db = createDb();
await runMigrations(db);
await markDatabaseCreated(db);
console.log(`Databas: ${defaultDatabaseUrl().replace(/^file:/, '')}`);
if (process.env.SEED_IF_EMPTY === 'true' && (await isEmpty(db))) {
  await seed(db);
  console.log('Tom databas fylld med exempeldata.');
}

const root = new Hono();

// Komprimera svar (gzip) – koden blir ungefär en tredjedel så stor att ladda ner.
root.use('*', compress());

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
  // Startsidans toppbild börjar laddas direkt, innan JavaScript har körts.
  const homeHtml = indexHtml.replace(
    '</head>',
    '    <link rel="preload" as="image" href="/images/hero.webp" imagesrcset="/images/hero-480.webp 480w, /images/hero-720.webp 720w, /images/hero.webp 900w" imagesizes="(min-width: 1024px) 440px, (min-width: 900px) 45vw, 92vw" fetchpriority="high" />\n  </head>',
  );

  // Cache: filer i /assets har versionsnummer i namnet och kan sparas ett år.
  // Bilder sparas en vecka. HTML kontrolleras alltid så att nya versioner syns direkt.
  root.use('*', async (c, next) => {
    await next();
    if (c.res.status !== 200 || c.res.headers.has('Cache-Control')) return;
    const path = c.req.path;
    if (path.startsWith('/assets/')) c.header('Cache-Control', 'public, max-age=31536000, immutable');
    else if (path.startsWith('/images/') || path === '/favicon.svg') c.header('Cache-Control', 'public, max-age=604800');
    else if (!path.startsWith('/api/')) c.header('Cache-Control', 'no-cache');
  });

  const statics = serveStatic({ root: relative(process.cwd(), webDir) });
  // "/" hanteras nedan (med förladdad toppbild), allt annat som filer om de finns.
  root.use('*', (c, next) => (c.req.path === '/' || c.req.path === '/index.html' ? next() : statics(c, next)));
  // Alla andra adresser (t.ex. /produkt/pwo-plus) visar butikens startfil.
  // Produktlistan bäddas in i sidan, så att butiken kan visas direkt utan ett extra anrop.
  root.get('*', async (c) => {
    if (c.req.path.startsWith('/api/')) return c.notFound();
    const html = c.req.path === '/' ? homeHtml : indexHtml;
    if (c.req.path.startsWith('/admin')) return c.html(html);
    const json = JSON.stringify(await buildStorefrontProducts(db)).replace(/</g, '\\u003c');
    return c.html(html.replace('</head>', `<script id="catalog-data" type="application/json">${json}</script>\n  </head>`));
  });
}

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: root.fetch, port }, () => {
  console.log(`SELFIT kör på http://localhost:${port}${webDir ? '' : ' (endast API)'}`);
});
