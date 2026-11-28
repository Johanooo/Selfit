/**
 * Bygger butikens produktlista (samma format som apps/web/src/data/types.ts) från databasen.
 * Butiken laddar listan när sidan öppnas, så det som ändras i Admin syns direkt.
 */
import { asc, eq, inArray } from 'drizzle-orm';
import type { Product, Variant } from '../../../web/src/data/types.ts';
import { products as codeProducts } from '../../../web/src/data/products.ts';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { availableStock, depositRatesOn, today, vatRatesOn } from './pricing.ts';
import { loadCampaigns, shopHistories, shopPrices } from './campaigns.ts';

/** Visningsdata som sparas i product_families.display. */
export interface ProductDisplay {
  category?: string;
  subcategory?: string;
  alsoIn?: string[];
  warnings?: string[];
  ingredientsByFlavour?: Record<string, string>;
  images?: { src: string; alt?: string }[];
  art?: Product['art'];
  artTone?: Product['artTone'];
  unitLabel?: string;
  sizeLabel?: string;
  primaryImage?: string;
  primaryImageAlt?: string;
  isNew?: boolean;
  allergenInfoKnown?: boolean;
  /** Storleksguide för kläder eller skor. */
  sizeGuide?: 'klader' | 'skor';
}

type Status = 'draft' | 'published' | 'archived';

/** Alla produkter med given status (butiken visar bara publicerade). */
export async function buildStorefrontProducts(db: Db, statuses: Status[] = ['published']): Promise<Product[]> {
  const date = today();
  const fams = await db
    .select({ f: s.productFamilies, brandName: s.brands.name, brandSlug: s.brands.slug })
    .from(s.productFamilies)
    .innerJoin(s.brands, eq(s.brands.id, s.productFamilies.brandId))
    .where(inArray(s.productFamilies.status, statuses));
  if (!fams.length) return [];
  const famIds = fams.map((r) => r.f.id);

  const [vars, cats, cols, rels, vat, deposit] = await Promise.all([
    db.select().from(s.variants).where(inArray(s.variants.familyId, famIds)).orderBy(asc(s.variants.sortOrder), asc(s.variants.id)),
    db
      .select({ familyId: s.productCategories.familyId, slug: s.categories.slug, isPrimary: s.productCategories.isPrimary })
      .from(s.productCategories)
      .innerJoin(s.categories, eq(s.categories.id, s.productCategories.categoryId))
      .where(inArray(s.productCategories.familyId, famIds)),
    db
      .select({ familyId: s.productCollections.familyId, slug: s.collections.slug })
      .from(s.productCollections)
      .innerJoin(s.collections, eq(s.collections.id, s.productCollections.collectionId))
      .where(inArray(s.productCollections.familyId, famIds)),
    db
      .select({ familyId: s.productRelations.familyId, kind: s.productRelations.kind, slug: s.productFamilies.slug })
      .from(s.productRelations)
      .innerJoin(s.productFamilies, eq(s.productFamilies.id, s.productRelations.relatedFamilyId))
      .where(inArray(s.productRelations.familyId, famIds))
      .orderBy(asc(s.productRelations.sortOrder)),
    vatRatesOn(db, date),
    depositRatesOn(db, date),
  ]);
  const varIds = vars.map((v) => v.id);
  // Kampanjpriset läggs ovanpå det ordinarie priset, även i prishistoriken (för 30-dagarsregeln).
  const rules = await loadCampaigns(db);
  const [price, stock, history] = await Promise.all([shopPrices(db, varIds, date, rules), availableStock(db, varIds), shopHistories(db, varIds, date, rules)]);
  const historyBy = new Map<string, { from: string; price: number }[]>();
  for (const [id, list] of history) historyBy.set(id, list.map((h) => ({ from: h.from, price: h.ore / 100 })));
  const code = new Map(codeProducts.map((p) => [p.slug, p]));

  return fams.map(({ f, brandName, brandSlug }) => {
    const d = (f.display ?? {}) as ProductDisplay;
    const base = code.get(f.slug);
    const fv = vars.filter((v) => v.familyId === f.id);
    const primaryCat = cats.find((c) => c.familyId === f.id && c.isPrimary)?.slug;
    const firstImage = d.images?.[0]?.src ?? d.primaryImage ?? base?.primaryImage;
    // En variant utan egen bild lånar bilden från en annan variant med samma smak.
    const sameFlavour = (v: (typeof fv)[number]) => (v.flavourSlug ? fv.find((o) => o.flavourSlug === v.flavourSlug && o.image)?.image : undefined);
    const variants: Variant[] = fv.map((v) => ({
      id: v.id,
      ...(v.flavourSlug ? { flavour: v.flavourSlug } : {}),
      ...(v.packSize ? { pack: v.packSize } : {}),
      ...(v.options && Object.keys(v.options).length ? { options: v.options } : {}),
      price: (price.get(v.id)?.ore ?? 0) / 100,
      ...(price.get(v.id)?.campaign ? { campaign: price.get(v.id)!.campaign! } : {}),
      depositPerUnit: v.depositClassId && v.depositUnits > 0 ? (deposit.get(v.depositClassId) ?? 0) / 100 : 0,
      stock: stock.get(v.id) ?? 0,
      offered: v.status !== 'not_offered',
      ean: v.gtin ?? '',
      image: v.image ?? sameFlavour(v) ?? (firstImage ? `photo:${firstImage}` : 'art'),
      ...(v.netAmount && v.netUnit ? { measure: { amount: v.netAmount / 1000, unit: v.netUnit } } : {}),
      priceHistory: historyBy.get(v.id) ?? [],
    }));
    const vatBp = fv[0] ? vat.get(fv[0].vatClassId) ?? 2500 : 2500;
    const p: Product = {
      ...(base ?? ({} as Product)),
      slug: f.slug,
      name: f.name,
      brand: brandName,
      brandSlug,
      category: d.category ?? base?.category ?? primaryCat ?? '',
      subcategory: d.subcategory ?? base?.subcategory,
      alsoIn: d.alsoIn ?? base?.alsoIn,
      kind: f.productType || base?.kind,
      sizeGuide: d.sizeGuide ?? base?.sizeGuide,
      warnings: d.warnings ?? base?.warnings,
      collections: cols.filter((c) => c.familyId === f.id).map((c) => c.slug),
      tagline: f.tagline ?? '',
      description: f.description ?? [],
      usage: f.usage ?? '',
      ingredients: f.ingredients ?? '',
      ingredientsByFlavour: d.ingredientsByFlavour ?? base?.ingredientsByFlavour,
      allergens: f.allergens ?? [],
      allergenInfoKnown: d.allergenInfoKnown ?? base?.allergenInfoKnown,
      nutrition: f.nutrition ?? undefined,
      facts: f.facts ?? [],
      primaryImage: firstImage,
      primaryImageAlt: d.images?.[0]?.alt ?? d.primaryImageAlt ?? base?.primaryImageAlt,
      images: d.images ?? base?.images,
      art: d.art ?? base?.art ?? 'box',
      artTone: d.artTone ?? base?.artTone ?? 'plum',
      unitLabel: d.unitLabel ?? base?.unitLabel ?? 'st',
      sizeLabel: d.sizeLabel ?? base?.sizeLabel ?? '',
      vatRate: vatBp / 10000,
      popularity: f.popularity,
      isNew: d.isNew ?? base?.isNew,
      related: rels.filter((r) => r.familyId === f.id && r.kind === 'similar').map((r) => r.slug),
      pairsWith: rels.filter((r) => r.familyId === f.id && r.kind === 'pairs_with').map((r) => r.slug),
      optionNames: f.optionNames ?? undefined,
      variants,
    };
    return p;
  });
}
