import type { Db } from './client.ts';
import * as s from './schema.ts';

/** Sparar när databasen skapades första gången. Visas på /api/health. */
export async function markDatabaseCreated(db: Db) {
  await db
    .insert(s.siteSettings)
    .values({ key: '_meta', value: { createdAt: new Date().toISOString() }, updatedAt: new Date().toISOString() })
    .onConflictDoNothing();
}
