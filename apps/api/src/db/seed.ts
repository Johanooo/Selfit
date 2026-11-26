/**
 * Fyller databasen med prototypens exempeldata (apps/web/src/data).
 * Belopp räknas om till öre och lagersaldo läggs in via lagerhistoriken.
 */
import { brands as webBrands, categories as webCategories, collections as webCollections, getSubcategory } from '../../../web/src/data/categories.ts';
import { products as webProducts, pwoFlavours } from '../../../web/src/data/products.ts';
import type { Db } from './client.ts';
import * as s from './schema.ts';

const PRICE_FROM = '2026-10-01';
const NOW = new Date().toISOString();

const PRODUCT_TYPES: Record<string, string> = {
  'pwo-plus': 'dryck',
  'protein-pannkakor': 'livsmedel',
  'proteinbar-kakao': 'livsmedel',
  'elektrolyt-brus': 'kosttillskott',
  'shaker-600': 'redskap',
  'traningsband-set': 'redskap',
};
const typeFor = (slug: string, category: string) =>
  PRODUCT_TYPES[slug] ?? (category === 'kroppsvard' ? 'kroppsvard' : 'kosttillskott');

export async function seed(db: Db) {
  await db.transaction(async (tx) => {
    // Moms: livsmedel har tillfälligt 6 % 2026-04-01 – 2027-12-31.
    await tx.insert(s.vatClasses).values([
      { id: 'vat-standard', name: 'Normalmoms' },
      { id: 'vat-food', name: 'Livsmedel' },
    ]);
    await tx.insert(s.vatRates).values([
      { id: 'vr-standard', vatClassId: 'vat-standard', rateBp: 2500, validFrom: '1990-01-01' },
      { id: 'vr-food-12', vatClassId: 'vat-food', rateBp: 1200, validFrom: '1996-01-01', validTo: '2026-03-31' },
      { id: 'vr-food-6', vatClassId: 'vat-food', rateBp: 600, validFrom: '2026-04-01', validTo: '2027-12-31' },
      { id: 'vr-food-12b', vatClassId: 'vat-food', rateBp: 1200, validFrom: '2028-01-01' },
    ]);
    // Pantens momsklass är en öppen fråga till revisor. Prototypen använder 25 %.
    await tx.insert(s.depositClasses).values({ id: 'pant-burk', name: 'Pant burk', vatClassId: 'vat-standard' });
    await tx.insert(s.depositRates).values({ id: 'dr-burk', depositClassId: 'pant-burk', amountOre: 100, validFrom: '2020-01-01' });

    await tx.insert(s.brands).values(webBrands.map((b) => ({ id: `br_${b.slug}`, ...b }))).onConflictDoNothing();
    await tx.insert(s.categories).values(
      webCategories.map((c, i) => ({ id: `cat_${c.slug}`, ...c, sortOrder: i })),
    ).onConflictDoNothing();
    await tx.insert(s.collections).values(webCollections.map((c) => ({ id: `col_${c.slug}`, ...c })));
    await tx.insert(s.flavours).values(pwoFlavours);

    // Lagerplatser. Butikens kod refererar bara till ID, aldrig till leverantörsnamn.
    await tx.insert(s.warehouses).values([
      { id: 'wh_own', name: 'Eget lager', kind: 'own', adapter: 'manual', status: 'active', isDefault: true },
      { id: 'wh_dsv', name: 'DSV', kind: '3pl', adapter: 'dsv', status: 'paused', isDefault: false },
    ]);

    await tx.insert(s.shippingMethods).values([
      { id: 'ship_ombud', name: 'Hämta hos ombud', priceOre: 4900, priceOverThresholdOre: 0, freeThresholdOre: 49900, vatClassId: 'vat-standard', estimatedDays: '1–3', sortOrder: 0 },
      { id: 'ship_hem', name: 'Hemleverans', priceOre: 7900, priceOverThresholdOre: 3900, freeThresholdOre: 49900, vatClassId: 'vat-standard', estimatedDays: '1–3', sortOrder: 1 },
    ]);

    for (const p of webProducts) {
      const familyId = `pf_${p.slug}`;
      await tx.insert(s.productFamilies).values({
        id: familyId,
        slug: p.slug,
        name: p.name,
        brandId: `br_${p.brandSlug}`,
        productType: typeFor(p.slug, p.category),
        status: 'published',
        tagline: p.tagline,
        description: p.description,
        usage: p.usage,
        ingredients: p.ingredients,
        allergens: p.allergens,
        nutrition: p.nutrition,
        facts: p.facts,
        display: {
          category: p.category,
          subcategory: p.subcategory,
          alsoIn: p.alsoIn,
          warnings: p.warnings,
          ingredientsByFlavour: p.ingredientsByFlavour,
          art: p.art,
          artTone: p.artTone,
          unitLabel: p.unitLabel,
          sizeLabel: p.sizeLabel,
          primaryImage: p.primaryImage,
          primaryImageAlt: p.primaryImageAlt,
          isNew: p.isNew ?? false,
          allergenInfoKnown: p.allergenInfoKnown,
        },
        popularity: p.popularity,
      });
      await tx.insert(s.productCategories).values({ familyId, categoryId: `cat_${p.category}`, isPrimary: true });
      const extraCats = [...new Set((p.alsoIn ?? []).map((sc) => getSubcategory(sc)?.parent).filter((c): c is string => !!c && c !== p.category))];
      if (extraCats.length) {
        await tx.insert(s.productCategories).values(extraCats.map((c) => ({ familyId, categoryId: `cat_${c}`, isPrimary: false })));
      }
      if (p.collections.length) {
        await tx.insert(s.productCollections).values(p.collections.map((c) => ({ familyId, collectionId: `col_${c}` })));
      }

      for (const v of p.variants) {
        await tx.insert(s.variants).values({
          id: v.id,
          familyId,
          sku: v.id.toUpperCase(),
          gtin: v.ean,
          flavourSlug: v.flavour ?? null,
          packSize: v.pack ?? null,
          sizeLabel: v.pack ? null : p.sizeLabel,
          image: v.image,
          netAmount: v.measure ? Math.round(v.measure.amount * 1000) : null,
          netUnit: v.measure?.unit ?? null,
          status: v.offered ? 'active' : 'not_offered',
          vatClassId: p.vatRate === 0.25 ? 'vat-standard' : 'vat-food',
          depositClassId: v.depositPerUnit > 0 ? 'pant-burk' : null,
          depositUnits: v.depositPerUnit > 0 ? (v.pack ?? 1) : 0,
        });
        // Prishistorik från exempeldatan, annars ett startpris.
        const history = v.priceHistory?.length ? v.priceHistory : [{ from: PRICE_FROM, price: v.price }];
        await tx.insert(s.prices).values(
          history.map((h, i) => ({
            id: `pr_${v.id}_${i}`,
            variantId: v.id,
            amountOre: Math.round(h.price * 100),
            validFrom: h.from,
            createdBy: 'seed',
          })),
        );
        if (v.offered) {
          await tx.insert(s.stockLevels).values({ variantId: v.id, warehouseId: 'wh_own', onHand: v.stock, updatedAt: NOW });
          await tx.insert(s.stockLedger).values({
            id: `led_init_${v.id}`,
            variantId: v.id,
            warehouseId: 'wh_own',
            eventType: 'initial',
            change: v.stock,
            balanceAfter: v.stock,
            reason: 'Startsaldo från exempeldata',
            actor: 'seed',
          });
        }
      }
    }

    // Relationer läggs in när alla produktfamiljer finns.
    for (const p of webProducts) {
      const rel = [
        ...p.related.map((r, i) => ({ kind: 'similar' as const, slug: r, i })),
        ...p.pairsWith.map((r, i) => ({ kind: 'pairs_with' as const, slug: r, i })),
      ].filter((r) => webProducts.some((x) => x.slug === r.slug));
      if (rel.length) {
        await tx.insert(s.productRelations).values(
          rel.map((r) => ({ familyId: `pf_${p.slug}`, relatedFamilyId: `pf_${r.slug}`, kind: r.kind, sortOrder: r.i })),
        );
      }
    }
  });
}

/** Sant om databasen saknar produkter. */
export async function isEmpty(db: Db) {
  const rows = await db.select({ id: s.productFamilies.id }).from(s.productFamilies).limit(1);
  return rows.length === 0;
}
