import { rmSync } from 'node:fs';
import { createDb } from '../db/client.ts';
import { runMigrations } from '../db/migrate.ts';
import { seed } from '../db/seed.ts';

const url = process.env.DATABASE_URL ?? 'file:./data/selfit.db';
if (!url.startsWith('file:')) throw new Error('db:reset körs bara mot en lokal SQLite-fil.');
rmSync(url.slice('file:'.length), { force: true });
const db = createDb(url);
await runMigrations(db);
await seed(db);
console.log('Databasen är återställd med exempeldata.');
