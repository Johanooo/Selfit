import { createDb } from '../db/client.ts';
import { runMigrations } from '../db/migrate.ts';

await runMigrations(createDb());
console.log('Databasen är uppdaterad.');
