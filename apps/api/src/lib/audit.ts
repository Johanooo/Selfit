import { desc } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';

export type Change = { field: string; from: unknown; to: unknown };

/** Vilka fält som skiljer sig mellan två objekt. */
export function diff(before: Record<string, unknown>, after: Record<string, unknown>): Change[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((k) => ({ field: k, from: before[k], to: after[k] }));
}

/**
 * Skriver en rad i ändringsloggen. Tills Admin har inloggning står "Admin" som utförare.
 * Det finns medvetet ingen funktion för att ändra eller ta bort rader.
 */
export async function logChange(db: Db, entry: { action: string; object: string; details?: Change[]; actor?: string }) {
  await db.insert(s.auditLog).values({
    at: new Date().toISOString(),
    actor: entry.actor ?? 'Admin',
    action: entry.action,
    object: entry.object,
    details: entry.details?.length ? entry.details : null,
  });
}

export async function readLog(db: Db, limit = 200) {
  return db.select().from(s.auditLog).orderBy(desc(s.auditLog.id)).limit(limit);
}
