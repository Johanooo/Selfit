import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createDb, type Db } from './client.ts';

export const migrationsFolder = fileURLToPath(new URL('../../migrations', import.meta.url));

export async function runMigrations(db: Db) {
  await migrate(db, { migrationsFolder });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runMigrations(createDb());
  console.log('Databasen är uppdaterad.');
}
