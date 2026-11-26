import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.ts';

export type Db = ReturnType<typeof createDb>;

/**
 * Var databasen ligger:
 * - DATABASE_URL om den är satt.
 * - I produktion: i hemmappen (~/selfit-data/selfit.db). Hemmappen skrivs inte över när
 *   Hostinger installerar en ny version, så det som sparas i Admin finns kvar.
 * - Lokalt: apps/api/data/selfit.db.
 */
export function defaultDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.NODE_ENV === 'production' && process.env.HOME) return `file:${process.env.HOME}/selfit-data/selfit.db`;
  return 'file:./data/selfit.db';
}

export function createDb(url = defaultDatabaseUrl()) {
  if (url.startsWith('file:') && !url.includes(':memory:')) {
    mkdirSync(dirname(url.slice('file:'.length)), { recursive: true });
  }
  const client = createClient({ url });
  // WAL gör att läsning och skrivning inte blockerar varandra.
  if (url.startsWith('file:') && !url.includes(':memory:')) void client.execute('PRAGMA journal_mode = WAL').catch(() => undefined);
  return drizzle(client, { schema });
}
