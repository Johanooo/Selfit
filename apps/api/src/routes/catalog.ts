import { and, asc, eq, inArray, like, or } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { availableStock, lowest30, today, vatRatesOn } from '../lib/pricing.ts';
import { shopHistories, shopPrices } from '../lib/campaigns.ts';
import { buildStorefrontProducts } from '../lib/storefront.ts';

/** Jämförpris i öre per enhet (kr/l, kr/kg, kr/st). */
const comparePrice = (priceOre: number, netMilli: number | null) =>
  netMilli && netMilli > 0 ? Math.round((priceOre * 1000) / netMilli) : null;

export function catalogRoutes(db: Db) {
  const app = new Hono();

  app.get('/categories', async (c) => c.json(await db.select().from(s.categories).orderBy(asc(s.categories.sortOrder))));
  app.get('/brands', async (c) => c.json(await db.select().from(s.brands).orderBy(asc(s.brands.name))));
  app.get('/collections', async (c) => c.json(await db.select().from(s.collections)));

  /** Produktlista. Filter: ?category=traning&brand=selfit&collection=nyheter&q=blåbär */
  /** Hela produktlistan i butikens format (bara publicerade produkter). */
  app.get('/storefront/products', async (c) => c.json(await buildStorefrontProducts(db)));

  app.get('/products', async (c) => {
    const { category, brand, collection, q } = c.req.query();
    const conditions = [eq(s.productFamilies.status, 'published')];
    if (brand) conditions.push(eq(s.brands.slug, brand));
    if (category) {
      const ids = db
        .select({ id: s.productCategories.familyId })
        .from(s.productCategories)
        .innerJoin(s.categories, eq(s.categories.id, s.productCategories.categoryId))
        .where(eq(s.categories.slug, category));
      conditions.push(inArray(s.productFamilies.id, ids));
    }
    if (collection) {
      const ids = db
        .select({ id: s.productCollections.familyId })
        .from(s.productCollections)
        .innerJoin(s.collections, eq(s.collections.id, s.productCollections.collectionId))
        .where(eq(s.collections.slug, collection));
      conditions.push(inArray(s.productFamilies.id, ids));
    }
    if (q) {
      // Sök på namn, smak och SKU (kravspec: Sökresultat).
      const term = `%${q.trim()}%`;
      const bySkuOrFlavour = db
        .select({ id: s.variants.familyId })
        .from(s.variants)
        .leftJoin(s.flavours, eq(s.flavours.slug, s.variants.flavourSlug))
        .where(or(like(s.variants.sku, term), like(s.flavours.name, term)));
      conditions.push(or(like(s.productFamilies.name, term), inArray(s.productFamilies.id, bySkuOrFlavour))!);
    }

    const families = await db
      .select({ id: s.productFamilies.id, slug: s.productFamilies.slug, name: s.productFamilies.name, tagline: s.productFamilies.tagline, brand: s.brands.name, popularity: s.productFamilies.popularity, display: s.productFamilies.display })
      .from(s.productFamilies)
      .innerJoin(s.brands, eq(s.brands.id, s.productFamilies.brandId))
      .where(and(...conditions))
      .orderBy(asc(s.productFamilies.name));

    const vs = families.length
      ? await db.select().from(s.variants).where(and(inArray(s.variants.familyId, families.map((f) => f.id)), eq(s.variants.status, 'active')))
      : [];
    const date = today();
    const shop = await shopPrices(db, vs.map((v) => v.id), date);
    const prices = new Map([...shop].map(([id, p]) => [id, p.ore]));
    const stock = await availableStock(db, vs.map((v) => v.id));

    return c.json(
      families.map((f) => {
        const own = vs.filter((v) => v.familyId === f.id);
        const priced = own.map((v) => prices.get(v.id)).filter((p): p is number => p !== undefined);
        return {
          ...f,
          fromPriceOre: priced.length ? Math.min(...priced) : null,
          variantCount: own.length,
          inStock: own.some((v) => (stock.get(v.id) ?? 0) > 0),
        };
      }),
    );
  });

  app.get('/products/:slug', async (c) => {
    const [family] = await db
      .select({ family: s.productFamilies, brand: s.brands })
      .from(s.productFamilies)
      .innerJoin(s.brands, eq(s.brands.id, s.productFamilies.brandId))
      .where(and(eq(s.productFamilies.slug, c.req.param('slug')), eq(s.productFamilies.status, 'published')));
    if (!family) return c.json({ error: 'Produkten finns inte.' }, 404);

    const date = today();
    const vs = await db.select().from(s.variants).where(eq(s.variants.familyId, family.family.id));
    const ids = vs.map((v) => v.id);
    const [shop, stock, vat, histories] = await Promise.all([shopPrices(db, ids, date), availableStock(db, ids), vatRatesOn(db, date), shopHistories(db, ids, date)]);
    const categories = await db
      .select({ slug: s.categories.slug, name: s.categories.name, isPrimary: s.productCategories.isPrimary })
      .from(s.productCategories)
      .innerJoin(s.categories, eq(s.categories.id, s.productCategories.categoryId))
      .where(eq(s.productCategories.familyId, family.family.id));
    const relations = await db
      .select({ kind: s.productRelations.kind, slug: s.productFamilies.slug, name: s.productFamilies.name, sortOrder: s.productRelations.sortOrder })
      .from(s.productRelations)
      .innerJoin(s.productFamilies, eq(s.productFamilies.id, s.productRelations.relatedFamilyId))
      .where(and(eq(s.productRelations.familyId, family.family.id), eq(s.productFamilies.status, 'published')))
      .orderBy(asc(s.productRelations.sortOrder));

    const variants = await Promise.all(
      vs.map(async (v) => {
        const priceOre = shop.get(v.id)?.ore ?? null;
        return {
          id: v.id,
          sku: v.sku,
          gtin: v.gtin,
          flavour: v.flavourSlug,
          pack: v.packSize,
          sizeLabel: v.sizeLabel,
          image: v.image,
          netAmount: v.netAmount === null ? null : v.netAmount / 1000,
          netUnit: v.netUnit,
          status: v.status,
          priceOre,
          comparePriceOre: priceOre === null ? null : comparePrice(priceOre, v.netAmount),
          ordinaryPriceOre: shop.get(v.id)?.ordinaryOre ?? null,
          campaign: shop.get(v.id)?.campaign ?? null,
          lowestPrice30DaysOre: lowest30(histories.get(v.id) ?? [], date),
          vatRateBp: vat.get(v.vatClassId) ?? null,
          depositUnits: v.depositUnits,
          available: v.status === 'active' ? (stock.get(v.id) ?? 0) : 0,
        };
      }),
    );

    return c.json({
      ...family.family,
      brand: { slug: family.brand.slug, name: family.brand.name },
      categories,
      similar: relations.filter((r) => r.kind === 'similar').map(({ slug, name }) => ({ slug, name })),
      pairsWith: relations.filter((r) => r.kind === 'pairs_with').map(({ slug, name }) => ({ slug, name })),
      variants,
    });
  });

  /** Prishistorik för en variant, ett år bakåt (för prisgrafen). */
  app.get('/variants/:id/price-history', async (c) => {
    const id = c.req.param('id');
    const from = new Date();
    from.setUTCFullYear(from.getUTCFullYear() - 1);
    const fromIso = from.toISOString().slice(0, 10);
    const rows = await db
      .select({ from: s.prices.validFrom, priceOre: s.prices.amountOre })
      .from(s.prices)
      .where(eq(s.prices.variantId, id))
      .orderBy(asc(s.prices.validFrom));
    if (!rows.length) return c.json({ error: 'Varianten finns inte.' }, 404);
    // Ta med priset som gällde när perioden började.
    const firstInside = rows.findIndex((r) => r.from >= fromIso);
    const start = firstInside === -1 ? rows.length - 1 : Math.max(0, firstInside - 1);
    return c.json(rows.slice(start).filter((r) => r.from <= today()));
  });

  return app;
}
