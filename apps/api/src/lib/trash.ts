/**
 * Papperskorg för Admin. Det som tas bort sparas som en kopia av alla rader som hörde till,
 * och kan läggas tillbaka i 30 dagar. Sedan töms det automatiskt.
 */
import { randomBytes } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { eq, inArray, lt } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { uploadsDir } from './paths-data.ts';

export const TRASH_DAYS = 30;

/** Tabeller som kan sparas i papperskorgen (namnet sparas i kopian). */
const TABLES = {
  productFamilies: s.productFamilies,
  variants: s.variants,
  prices: s.prices,
  purchaseCosts: s.purchaseCosts,
  stockLevels: s.stockLevels,
  stockLedger: s.stockLedger,
  batches: s.batches,
  warehouseItemRefs: s.warehouseItemRefs,
  productCategories: s.productCategories,
  productCollections: s.productCollections,
  productRelations: s.productRelations,
  brands: s.brands,
  categories: s.categories,
  productTypes: s.productTypes,
  discounts: s.discounts,
  campaigns: s.campaigns,
  media: s.media,
  depositClasses: s.depositClasses,
  depositRates: s.depositRates,
} as const;
export type TrashTable = keyof typeof TABLES;

export type TrashKind = 'product' | 'brand' | 'category' | 'productType' | 'discount' | 'campaign' | 'media' | 'deposit';

export const KIND_NAMES: Record<TrashKind, string> = {
  product: 'Produkt',
  brand: 'Varumärke',
  category: 'Kategori',
  productType: 'Produkttyp',
  discount: 'Rabatt',
  campaign: 'Kampanj',
  media: 'Bild',
  deposit: 'Pant',
};

/** Sparar en kopia i papperskorgen. Anroparen tar sedan bort raderna som vanligt. parts: förälder först. */
export async function moveToTrash(db: Db, entry: { kind: TrashKind; objectId: string; label: string; detail?: string; parts: [TrashTable, Record<string, unknown>[]][] }) {
  await db.insert(s.trash).values({
    id: `tr_${randomBytes(6).toString('hex')}`,
    kind: entry.kind,
    objectId: entry.objectId,
    label: entry.label,
    detail: entry.detail ?? '',
    payload: entry.parts.filter(([, rows]) => rows.length),
    deletedAt: new Date().toISOString(),
  });
}

export const expiresAt = (deletedAt: string) => new Date(new Date(deletedAt).getTime() + TRASH_DAYS * 864e5).toISOString();

/** Uppladdade bildfiler ligger kvar medan bilden är i papperskorgen och tas bort först när den töms. */
async function removeFiles(entries: (typeof s.trash.$inferSelect)[]) {
  for (const e of entries) {
    if (e.kind !== 'media') continue;
    for (const [table, rows] of e.payload) {
      if (table !== 'media') continue;
      for (const r of rows) {
        const src = String(r.src ?? '');
        if (src.startsWith('/uploads/')) await unlink(join(uploadsDir(), src.replace('/uploads/', ''))).catch(() => undefined);
      }
    }
  }
}

/** Tömmer det som legat längre än 30 dagar. */
export async function purgeExpired(db: Db, now = new Date()) {
  const cutoff = new Date(now.getTime() - TRASH_DAYS * 864e5).toISOString();
  const old = await db.select().from(s.trash).where(lt(s.trash.deletedAt, cutoff));
  if (!old.length) return 0;
  await removeFiles(old);
  await db.delete(s.trash).where(inArray(s.trash.id, old.map((e) => e.id)));
  return old.length;
}

/** Raderar för gott (knappen "Radera för gott" eller "Töm papperskorgen"). */
export async function deleteForGood(db: Db, ids: string[]) {
  if (!ids.length) return;
  const rows = await db.select().from(s.trash).where(inArray(s.trash.id, ids));
  await removeFiles(rows);
  await db.delete(s.trash).where(inArray(s.trash.id, ids));
}

export class RestoreError extends Error {}

/** Lägger tillbaka raderna, i samma ordning som de sparades. Kastar RestoreError med en förklaring om det inte går. */
export async function restoreRows(db: Db, payload: [string, Record<string, unknown>[]][]) {
  await db.transaction(async (tx) => {
    for (const [name, rows] of payload) {
      const table = TABLES[name as TrashTable];
      if (!table || !rows.length) continue;
      // Lite i taget: SQLite har en gräns för hur många värden ett anrop får ha.
      for (let i = 0; i < rows.length; i += 50) {
        await (tx as unknown as Db).insert(table).values(rows.slice(i, i + 50) as never);
      }
    }
  });
}

export async function getTrashEntry(db: Db, id: string) {
  const [row] = await db.select().from(s.trash).where(eq(s.trash.id, id));
  return row;
}
