import { createDb } from '../db/client.ts';
import { runMigrations } from '../db/migrate.ts';
import { seed } from '../db/seed.ts';

const db = createDb();
await runMigrations(db);
await seed(db);
console.log('Exempeldata inlagd.');
