import { rmSync } from 'node:fs';
import { createDb } from './client.ts';
import { runMigrations } from './migrate.ts';
import { seed } from './seed.ts';

const url = process.env.DATABASE_URL ?? 'file:./data/selfit.db';
if (!url.startsWith('file:')) throw new Error('db:reset körs bara mot en lokal SQLite-fil.');
rmSync(url.slice('file:'.length), { force: true });
const db = createDb(url);
await runMigrations(db);
await seed(db);
console.log('Databasen är återställd med exempeldata.');
