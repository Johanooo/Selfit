/**
 * Kampanjpriser på servern. Reglerna finns i web/src/data/campaigns.ts (delas med butiken).
 * Butiken, varukorgen och produkt-API:t använder priserna härifrån, så att kunden alltid
 * betalar samma pris som visas. Admin visar och ändrar fortfarande det ordinarie priset.
 */
import { asc, eq, inArray } from 'drizzle-orm';
import { bestCampaign, campaignActiveOn, withCampaigns, type CampaignRule, type CampaignTarget, type PublicCampaign } from '../../../web/src/data/campaigns.ts';
import { products as codeProducts } from '../../../web/src/data/products.ts';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { currentPrices } from './pricing.ts';

type Row = typeof s.campaigns.$inferSelect;

export async function loadCampaigns(db: Db): Promise<Row[]> {
  return db.select().from(s.campaigns).where(eq(s.campaigns.enabled, true)).orderBy(asc(s.campaigns.startsOn));
}

/** Kampanjer som pågår, för banner och kampanjsida i butiken. */
export async function publicCampaigns(db: Db, date: string): Promise<PublicCampaign[]> {
  return (await loadCampaigns(db))
    .filter((c) => campaignActiveOn(c, date))
    .map((c) => ({ slug: c.slug, title: c.title, intro: c.intro, endsOn: c.endsOn, banner: c.banner }));
}

/** Produkt, varumärke och alla kategorier per produktfamilj (samma kategorier som butiken visar). */
export async function familyTargets(db: Db, familyIds: string[]): Promise<Map<string, CampaignTarget>> {
  const ids = [...new Set(familyIds)];
  if (!ids.length) return new Map();
  const [fams, cats] = await Promise.all([
    db
      .select({ id: s.productFamilies.id, slug: s.productFamilies.slug, display: s.productFamilies.display, brand: s.brands.slug })
      .from(s.productFamilies)
      .innerJoin(s.brands, eq(s.brands.id, s.productFamilies.brandId))
      .where(inArray(s.productFamilies.id, ids)),
    db
      .select({ familyId: s.productCategories.familyId, slug: s.categories.slug })
      .from(s.productCategories)
      .innerJoin(s.categories, eq(s.categories.id, s.productCategories.categoryId))
      .where(inArray(s.productCategories.familyId, ids)),
  ]);
  const code = new Map(codeProducts.map((p) => [p.slug, p]));
  return new Map(
    fams.map((f) => {
      const d = (f.display ?? {}) as { category?: string; subcategory?: string; alsoIn?: string[] };
      const base = code.get(f.slug);
      const all = [
        ...cats.filter((c) => c.familyId === f.id).map((c) => c.slug),
        d.category ?? base?.category,
        d.subcategory ?? base?.subcategory,
        ...(d.alsoIn ?? base?.alsoIn ?? []),
      ].filter((x): x is string => Boolean(x));
      return [f.id, { slug: f.slug, brand: f.brand, categories: [...new Set(all)] }];
    }),
  );
}

async function variantTargets(db: Db, variantIds: string[]) {
  const rows = variantIds.length ? await db.select({ id: s.variants.id, familyId: s.variants.familyId }).from(s.variants).where(inArray(s.variants.id, variantIds)) : [];
  const fams = await familyTargets(db, rows.map((r) => r.familyId));
  const out = new Map<string, CampaignTarget>();
  for (const r of rows) {
    const t = fams.get(r.familyId);
    if (t) out.set(r.id, t);
  }
  return out;
}

export interface ShopPrice {
  /** Priset kunden betalar (öre). */
  ore: number;
  /** Ordinarie pris (öre). */
  ordinaryOre: number;
  /** Kampanjens slug, eller null. */
  campaign: string | null;
}

/** Pris i butiken per variant: ordinarie pris, eller kampanjpris om en kampanj pågår. */
export async function shopPrices(db: Db, variantIds: string[], date: string, rules?: CampaignRule[]): Promise<Map<string, ShopPrice>> {
  const [base, targets, list] = await Promise.all([currentPrices(db, variantIds, date), variantTargets(db, variantIds), rules ?? loadCampaigns(db)]);
  const out = new Map<string, ShopPrice>();
  for (const [id, ordinaryOre] of base) {
    const t = targets.get(id);
    const best = t ? bestCampaign(list, t, ordinaryOre, date) : null;
    out.set(id, { ore: best?.ore ?? ordinaryOre, ordinaryOre, campaign: best?.campaign.slug ?? null });
  }
  return out;
}

/** Prishistorik per variant (öre, äldst först) med kampanjerna inräknade. */
export async function shopHistories(db: Db, variantIds: string[], date: string, rules?: CampaignRule[]): Promise<Map<string, { from: string; ore: number }[]>> {
  if (!variantIds.length) return new Map();
  const [rows, targets, list] = await Promise.all([
    db.select({ variantId: s.prices.variantId, from: s.prices.validFrom, ore: s.prices.amountOre }).from(s.prices).where(inArray(s.prices.variantId, variantIds)).orderBy(asc(s.prices.validFrom)),
    variantTargets(db, variantIds),
    rules ?? loadCampaigns(db),
  ]);
  const base = new Map<string, { from: string; ore: number }[]>();
  for (const r of rows) base.set(r.variantId, [...(base.get(r.variantId) ?? []), { from: r.from, ore: r.ore }]);
  const out = new Map<string, { from: string; ore: number }[]>();
  for (const [id, list0] of base) {
    const t = targets.get(id);
    out.set(id, t ? withCampaigns(list0, list, t, date) : list0.filter((p) => p.from <= date));
  }
  return out;
}
