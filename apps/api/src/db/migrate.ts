import { migrate } from 'drizzle-orm/libsql/migrator';
import { findDir, here } from '../lib/paths.ts';
import type { Db } from './client.ts';

const dir = here(import.meta.url);
// Fungerar både när koden körs direkt (src/db) och som byggd fil (dist).
export const migrationsFolder = findDir(`${dir}/../../migrations`, `${dir}/../migrations`, `${process.cwd()}/migrations`);

export async function runMigrations(db: Db) {
  if (!migrationsFolder) throw new Error('Hittar inte mappen migrations.');
  await migrate(db, { migrationsFolder });
}
