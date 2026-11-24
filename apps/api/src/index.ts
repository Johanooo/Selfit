import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { createDb } from './db/client.ts';
import { runMigrations } from './db/migrate.ts';

const db = createDb();
await runMigrations(db);
const port = Number(process.env.PORT ?? 3001);
serve({ fetch: createApp(db).fetch, port }, () => console.log(`SELFIT API kör på http://localhost:${port}/api`));
