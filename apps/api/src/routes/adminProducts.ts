/**
 * Admin → Produkter: lista, skapa, ändra, byta status, kopiera och ta bort produkter,
 * och ladda upp bilder. Allt som ändras skrivs i ändringsloggen.
 */
import { randomBytes } from 'node:crypto';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { brands as codeBrands, categories as codeCategories, getSubcategory } from '../../../web/src/data/categories.ts';
import { pwoFlavours } from '../../../web/src/data/products.ts';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { logChange } from '../lib/audit.ts';
import { availableStock, currentPrices, today } from '../lib/pricing.ts';
import type { ProductDisplay } from '../lib/storefront.ts';
import { saveUpload } from './media.ts';

const PRODUCT_TYPES = ['kosttillskott', 'livsmedel', 'dryck', 'kroppsvard', 'klader', 'redskap'] as const;

const variantInput = z.object({
  id: z.string().optional(),
  options: z.record(z.string(), z.string()).default({}),
  flavour: z.string().optional().nullable(),
  pack: z.number().int().positive().optional().nullable(),
  price: z.number().min(0, 'Priset kan inte vara negativt.').max(100000),
  stock: z.number().int().min(0).max(1000000),
  ean: z.string().trim().max(20).optional().default(''),
  sku: z.string().trim().max(60).optional().default(''),
  offered: z.boolean().default(true),
  netAmount: z.number().positive().optional().nullable(),
  netUnit: z.enum(['l', 'kg', 'st']).optional().nullable(),
});

export const productInput = z.object({
  name: z.string().trim().min(1, 'Produkten behöver ett namn.').max(120),
  slug: z.string().trim().max(120).optional().default(''),
  brandId: z.string().trim().min(1, 'Välj varumärke.'),
  productType: z.enum(PRODUCT_TYPES),
  subcategory: z.string().trim().default(''),
  tagline: z.string().trim().max(200).default(''),
  description: z.string().max(20000).default(''),
  usage: z.string().max(5000).default(''),
  ingredients: z.string().max(10000).default(''),
  allergens: z.array(z.string().trim().min(1)).max(20).default([]),
  warnings: z.array(z.string().trim().min(1)).max(10).default([]),
  facts: z.array(z.object({ label: z.string().trim().min(1), value: z.string().trim().min(1) })).max(30).default([]),
  nutrition: z
    .object({ servingLabel: z.string().optional(), rows: z.array(z.object({ label: z.string(), per100: z.string(), perServing: z.string().optional() })) })
    .nullable()
    .default(null),
  images: z.array(z.object({ src: z.string().min(1), alt: z.string().max(200).optional() })).max(12).default([]),
  sizeLabel: z.string().trim().max(60).default(''),
  vat: z.enum(['vat-food', 'vat-standard']),
  deposit: z.boolean().default(false),
  optionNames: z.array(z.string().trim().min(1).max(40)).max(3).default([]),
  variants: z.array(variantInput).min(1, 'Produkten behöver minst ett pris.').max(200),
  isNew: z.boolean().default(false),
  status: z.enum(['draft', 'published']).optional(),
});
type ProductInput = z.infer<typeof productInput>;

const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/é/g, 'e')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'produkt';

const newId = (prefix: string) => `${prefix}_${randomBytes(6).toString('hex')}`;

/** Vad som saknas för att en produkt ska kunna visas i butiken. */
export function publishProblems(p: ProductInput): string[] {
  const out: string[] = [];
  if (!p.name.trim()) out.push('Namn saknas.');
  if (!getSubcategory(p.subcategory)) out.push('Välj kategori.');
  const sellable = p.variants.filter((v) => v.offered);
  if (!sellable.length) out.push('Minst en variant måste säljas.');
  if (sellable.some((v) => !(v.price > 0))) out.push('Alla varianter som säljs behöver ett pris.');
  if (p.optionNames.length && sellable.some((v) => p.optionNames.some((n) => !v.options[n]?.trim()))) out.push('Alla varianter behöver värden för varje alternativ.');
  return out;
}

/** Ser till att kategorier och varumärken från koden finns i databasen. */
export async function syncReferenceData(db: Db) {
  for (const [i, c] of codeCategories.entries()) {
    await db
      .insert(s.categories)
      .values({ id: `cat_${c.slug}`, slug: c.slug, name: c.name, short: c.short, intro: c.intro, tone: c.tone, image: c.image, imageAlt: c.imageAlt, sortOrder: i })
      .onConflictDoNothing();
  }
  for (const b of codeBrands) await db.insert(s.brands).values({ id: `br_${b.slug}`, ...b }).onConflictDoNothing();
}

/** Varumärket måste finnas (skapas under Katalog → Varumärken). */
async function brandExists(db: Db, id: string) {
  const [found] = await db.select({ id: s.brands.id }).from(s.brands).where(eq(s.brands.id, id));
  return Boolean(found);
}

async function uniqueSlug(db: Db, wanted: string, ownId?: string) {
  const base = slugify(wanted);
  let slug = base;
  for (let n = 2; ; n++) {
    const [hit] = await db.select({ id: s.productFamilies.id }).from(s.productFamilies).where(eq(s.productFamilies.slug, slug));
    if (!hit || hit.id === ownId) return slug;
    slug = `${base}-${n}`;
  }
}

const hasOrders = async (db: Db, variantIds: string[]) =>
  variantIds.length > 0 && (await db.select({ id: s.orderLines.id }).from(s.orderLines).where(inArray(s.orderLines.variantId, variantIds)).limit(1)).length > 0;

/** Läser en produkt i formulärets format. */
async function readProduct(db: Db, id: string) {
  const [row] = await db
    .select({ f: s.productFamilies, brand: s.brands.name, brandId: s.brands.id })
    .from(s.productFamilies)
    .innerJoin(s.brands, eq(s.brands.id, s.productFamilies.brandId))
    .where(eq(s.productFamilies.id, id));
  if (!row) return null;
  const { f } = row;
  const d = (f.display ?? {}) as ProductDisplay;
  const flavourIndex = (slug: string | null) => (slug ? pwoFlavours.findIndex((f) => f.slug === slug) : -1);
  const vars = (await db.select().from(s.variants).where(eq(s.variants.familyId, id))).sort(
    (a, b) => a.sortOrder - b.sortOrder || flavourIndex(a.flavourSlug) - flavourIndex(b.flavourSlug) || (a.packSize ?? 0) - (b.packSize ?? 0),
  );
  const ids = vars.map((v) => v.id);
  const [price, stock] = await Promise.all([currentPrices(db, ids, today()), availableStock(db, ids)]);
  const subcategory = d.subcategory ?? '';
  return {
    id: f.id,
    slug: f.slug,
    status: f.status,
    name: f.name,
    brand: row.brand,
    brandId: row.brandId,
    productType: f.productType as ProductInput['productType'],
    subcategory,
    tagline: f.tagline ?? '',
    description: (f.description ?? []).join('\n\n'),
    usage: f.usage ?? '',
    ingredients: f.ingredients ?? '',
    allergens: f.allergens ?? [],
    warnings: d.warnings ?? [],
    facts: f.facts ?? [],
    nutrition: f.nutrition ?? null,
    images: d.images ?? (d.primaryImage ? [{ src: d.primaryImage, alt: d.primaryImageAlt }] : []),
    sizeLabel: d.sizeLabel ?? '',
    vat: (vars[0]?.vatClassId ?? 'vat-food') as ProductInput['vat'],
    deposit: vars.some((v) => v.depositUnits > 0),
    optionNames: f.optionNames ?? [],
    isNew: d.isNew ?? false,
    hasOrders: await hasOrders(db, ids),
    updatedAt: f.updatedAt ?? f.createdAt,
    variants: vars.map((v) => ({
      id: v.id,
      options: v.options ?? {},
      flavour: v.flavourSlug,
      pack: v.packSize,
      price: (price.get(v.id) ?? 0) / 100,
      stock: stock.get(v.id) ?? 0,
      ean: v.gtin ?? '',
      sku: v.sku,
      offered: v.status !== 'not_offered',
      netAmount: v.netAmount ? v.netAmount / 1000 : null,
      netUnit: v.netUnit,
    })),
  };
}

/** Sparar formulärets innehåll. Pris- och lagerändringar sparas som historik. */
async function writeProduct(db: Db, input: ProductInput, existingId?: string) {
  const date = today();
  const now = new Date().toISOString();
  const brandId = input.brandId;
  const sub = getSubcategory(input.subcategory);
  const id = existingId ?? newId('pf');
  const slug = await uniqueSlug(db, input.slug || input.name, existingId);
  const [prev] = existingId ? await db.select().from(s.productFamilies).where(eq(s.productFamilies.id, existingId)) : [];
  const prevDisplay = (prev?.display ?? {}) as ProductDisplay;
  const display: ProductDisplay = {
    ...prevDisplay,
    category: sub?.parent ?? prevDisplay.category,
    subcategory: sub?.slug ?? prevDisplay.subcategory,
    warnings: input.warnings,
    images: input.images,
    primaryImage: input.images[0]?.src ?? (input.images.length ? undefined : prevDisplay.primaryImage),
    primaryImageAlt: input.images[0]?.alt,
    sizeLabel: input.sizeLabel,
    isNew: input.isNew,
    art: prevDisplay.art ?? 'box',
    artTone: prevDisplay.artTone ?? 'plum',
    unitLabel: prevDisplay.unitLabel ?? 'st',
  };
  const values = {
    slug,
    name: input.name,
    brandId,
    productType: input.productType,
    tagline: input.tagline,
    description: input.description.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
    usage: input.usage,
    ingredients: input.ingredients,
    allergens: input.allergens,
    nutrition: input.nutrition && input.nutrition.rows.length ? input.nutrition : null,
    facts: input.facts,
    display: display as Record<string, unknown>,
    optionNames: input.optionNames.length ? input.optionNames : null,
    updatedAt: now,
  };
  if (prev) await db.update(s.productFamilies).set(values).where(eq(s.productFamilies.id, id));
  else await db.insert(s.productFamilies).values({ id, ...values, status: 'draft', popularity: 0 });

  // Kategori
  await db.delete(s.productCategories).where(eq(s.productCategories.familyId, id));
  if (sub) await db.insert(s.productCategories).values({ familyId: id, categoryId: `cat_${sub.parent}`, isPrimary: true });

  // Varianter
  const oldVars = await db.select().from(s.variants).where(eq(s.variants.familyId, id));
  const keep = new Set(input.variants.map((v) => v.id).filter(Boolean));
  const removed = oldVars.filter((v) => !keep.has(v.id));
  for (const v of removed) {
    if (await hasOrders(db, [v.id])) {
      // Varianter som finns på ordrar tas inte bort, de slutar säljas.
      await db.update(s.variants).set({ status: 'not_offered' }).where(eq(s.variants.id, v.id));
    } else {
      await db.delete(s.prices).where(eq(s.prices.variantId, v.id));
      await db.delete(s.stockLevels).where(eq(s.stockLevels.variantId, v.id));
      await db.delete(s.stockLedger).where(eq(s.stockLedger.variantId, v.id));
      await db.delete(s.batches).where(eq(s.batches.variantId, v.id));
      await db.delete(s.warehouseItemRefs).where(eq(s.warehouseItemRefs.variantId, v.id));
      await db.delete(s.variants).where(eq(s.variants.id, v.id));
    }
  }
  const curPrice = await currentPrices(db, input.variants.map((v) => v.id ?? ''), date);
  const curStock = await availableStock(db, input.variants.map((v) => v.id ?? ''));
  for (const [i, v] of input.variants.entries()) {
    const vid = v.id && oldVars.some((o) => o.id === v.id) ? v.id : newId('v');
    const label = input.optionNames.map((n) => v.options[n]).filter(Boolean).join(' ');
    const vValues = {
      familyId: id,
      sku: v.sku || `${slug}${label ? `-${slugify(label)}` : ''}`.toUpperCase().slice(0, 60),
      gtin: v.ean || null,
      flavourSlug: v.flavour ?? null,
      packSize: v.pack ?? null,
      sizeLabel: label || input.sizeLabel || null,
      netAmount: v.netAmount ? Math.round(v.netAmount * 1000) : null,
      netUnit: v.netAmount ? (v.netUnit ?? 'st') : null,
      status: (v.offered ? 'active' : 'not_offered') as 'active' | 'not_offered',
      vatClassId: input.vat,
      depositClassId: input.deposit ? 'pant-burk' : null,
      depositUnits: input.deposit ? (v.pack ?? 1) : 0,
      options: Object.keys(v.options).length ? v.options : null,
      sortOrder: i,
    };
    if (vid === v.id) {
      await db.update(s.variants).set(vValues).where(eq(s.variants.id, vid));
    } else {
      await db.insert(s.variants).values({ id: vid, ...vValues });
    }
    // Pris: ny rad i prishistoriken när priset ändras (samma dag skrivs över).
    const ore = Math.round(v.price * 100);
    if (curPrice.get(vid) !== ore) {
      const [todayRow] = await db.select().from(s.prices).where(and(eq(s.prices.variantId, vid), eq(s.prices.validFrom, date)));
      if (todayRow) await db.update(s.prices).set({ amountOre: ore }).where(eq(s.prices.id, todayRow.id));
      else await db.insert(s.prices).values({ id: newId('pr'), variantId: vid, amountOre: ore, validFrom: date, createdBy: 'Admin' });
    }
    // Lager: justering i eget lager via lagerhistoriken.
    const have = curStock.get(vid) ?? 0;
    if (v.stock !== have || vid !== v.id) {
      const [lvl] = await db.select().from(s.stockLevels).where(and(eq(s.stockLevels.variantId, vid), eq(s.stockLevels.warehouseId, 'wh_own')));
      const onHand = (lvl?.onHand ?? 0) + (v.stock - have);
      if (lvl) await db.update(s.stockLevels).set({ onHand, updatedAt: now }).where(and(eq(s.stockLevels.variantId, vid), eq(s.stockLevels.warehouseId, 'wh_own')));
      else await db.insert(s.stockLevels).values({ variantId: vid, warehouseId: 'wh_own', onHand, updatedAt: now });
      if (v.stock !== have) {
        await db.insert(s.stockLedger).values({
          id: newId('led'),
          variantId: vid,
          warehouseId: 'wh_own',
          eventType: lvl ? 'adjustment' : 'initial',
          change: v.stock - have,
          balanceAfter: onHand,
          reason: 'Ändrat i Admin',
          actor: 'Admin',
        });
      }
    }
  }
  return { id, slug };
}

async function deleteProduct(db: Db, id: string) {
  const vars = await db.select({ id: s.variants.id }).from(s.variants).where(eq(s.variants.familyId, id));
  const ids = vars.map((v) => v.id);
  if (ids.length) {
    await db.delete(s.prices).where(inArray(s.prices.variantId, ids));
    await db.delete(s.purchaseCosts).where(inArray(s.purchaseCosts.variantId, ids));
    await db.delete(s.stockLevels).where(inArray(s.stockLevels.variantId, ids));
    await db.delete(s.stockLedger).where(inArray(s.stockLedger.variantId, ids));
    await db.delete(s.batches).where(inArray(s.batches.variantId, ids));
    await db.delete(s.warehouseItemRefs).where(inArray(s.warehouseItemRefs.variantId, ids));
    await db.delete(s.variants).where(inArray(s.variants.id, ids));
  }
  await db.delete(s.productCategories).where(eq(s.productCategories.familyId, id));
  await db.delete(s.productCollections).where(eq(s.productCollections.familyId, id));
  await db.delete(s.productRelations).where(eq(s.productRelations.familyId, id));
  await db.delete(s.productRelations).where(eq(s.productRelations.relatedFamilyId, id));
  await db.delete(s.productFamilies).where(eq(s.productFamilies.id, id));
}

const STATUS_NAME = { draft: 'Utkast', published: 'Publicerad', archived: 'Arkiverad' } as const;

export function adminProductRoutes(db: Db) {
  const app = new Hono();

  app.get('/admin/products', async (c) => {
    const fams = await db
      .select({ f: s.productFamilies, brand: s.brands.name })
      .from(s.productFamilies)
      .innerJoin(s.brands, eq(s.brands.id, s.productFamilies.brandId))
      .orderBy(asc(s.productFamilies.name));
    const vars = await db.select({ id: s.variants.id, familyId: s.variants.familyId, status: s.variants.status, image: s.variants.image }).from(s.variants);
    const ids = vars.map((v) => v.id);
    const [price, stock] = await Promise.all([currentPrices(db, ids, today()), availableStock(db, ids)]);
    return c.json(
      fams.map(({ f, brand }) => {
        const d = (f.display ?? {}) as ProductDisplay;
        const fv = vars.filter((v) => v.familyId === f.id && v.status !== 'not_offered');
        const prices = fv.map((v) => price.get(v.id) ?? 0).filter((x) => x > 0);
        return {
          id: f.id,
          slug: f.slug,
          name: f.name,
          brand,
          status: f.status,
          subcategory: d.subcategory ?? '',
          category: d.category ?? '',
          image: d.images?.[0]?.src ?? d.primaryImage ?? (fv[0]?.image?.startsWith('photo:') ? fv[0].image.slice(6) : null),
          canImage: fv[0]?.image?.startsWith('can:') ? fv[0].image.slice(4) : null,
          variants: fv.length,
          stock: fv.reduce((sum, v) => sum + (stock.get(v.id) ?? 0), 0),
          priceFrom: prices.length ? Math.min(...prices) / 100 : null,
          updatedAt: f.updatedAt ?? f.createdAt,
        };
      }),
    );
  });

  app.get('/admin/products/:id', async (c) => {
    const key = c.req.param('id');
    let p = await readProduct(db, key);
    if (!p) {
      const [bySlug] = await db.select({ id: s.productFamilies.id }).from(s.productFamilies).where(eq(s.productFamilies.slug, key));
      if (bySlug) p = await readProduct(db, bySlug.id);
    }
    return p ? c.json(p) : c.json({ error: 'Produkten finns inte.' }, 404);
  });

  const save = async (raw: unknown, id?: string) => {
    const parsed = productInput.safeParse(raw);
    if (!parsed.success) return { status: 400 as const, body: { error: parsed.error.issues[0]?.message ?? 'Kontrollera fälten.' } };
    const input = parsed.data;
    if (!(await brandExists(db, input.brandId))) return { status: 400 as const, body: { error: 'Varumärket finns inte. Skapa det under Katalog → Varumärken först.' } };
    const eans = input.variants.map((v) => v.ean).filter(Boolean);
    if (new Set(eans).size !== eans.length) return { status: 400 as const, body: { error: 'Två varianter har samma streckkod (EAN).' } };
    if (eans.length) {
      const taken = await db.select({ id: s.variants.id, familyId: s.variants.familyId, gtin: s.variants.gtin }).from(s.variants).where(inArray(s.variants.gtin, eans));
      const clash = taken.find((t) => t.familyId !== id);
      if (clash) return { status: 400 as const, body: { error: `Streckkoden ${clash.gtin} används redan av en annan produkt.` } };
    }
    if (input.status === 'published') {
      const problems = publishProblems(input);
      if (problems.length) return { status: 400 as const, body: { error: `Kan inte publicera: ${problems.join(' ')}`, problems } };
    }
    const before = id ? await readProduct(db, id) : null;
    const { id: savedId } = await db.transaction(async (tx) => writeProduct(tx as unknown as Db, input, id));
    if (input.status) await db.update(s.productFamilies).set({ status: input.status }).where(eq(s.productFamilies.id, savedId));
    const after = await readProduct(db, savedId);
    if (!before) {
      await logChange(db, { action: 'Produkt skapad', object: `Produkt: ${input.name}`, details: [{ field: 'Status', from: null, to: STATUS_NAME[after!.status] }] });
    } else {
      const fields: [string, unknown, unknown][] = [
        ['Namn', before.name, after!.name],
        ['Kategori', before.subcategory, after!.subcategory],
        ['Kort text', before.tagline, after!.tagline],
        ['Beskrivning', before.description.length ? `${before.description.length} tecken` : '', `${after!.description.length} tecken`],
        ['Bilder', before.images.length, after!.images.length],
        ['Antal varianter', before.variants.length, after!.variants.length],
        ['Status', STATUS_NAME[before.status], STATUS_NAME[after!.status]],
      ];
      for (const v of after!.variants) {
        const b = before.variants.find((x) => x.id === v.id);
        const label =
          Object.values(v.options).join(' · ') ||
          [pwoFlavours.find((f) => f.slug === v.flavour)?.name, v.pack ? `${v.pack}-pack` : ''].filter(Boolean).join(' · ') ||
          v.sku;
        if (b && b.price !== v.price) fields.push([`Pris ${label}`, `${b.price} kr`, `${v.price} kr`]);
        if (b && b.stock !== v.stock) fields.push([`Lager ${label}`, b.stock, v.stock]);
      }
      const details = fields.filter(([, a, b]) => JSON.stringify(a) !== JSON.stringify(b)).map(([field, from, to]) => ({ field, from, to }));
      if (details.length) await logChange(db, { action: 'Produkt ändrad', object: `Produkt: ${after!.name}`, details });
    }
    return { status: 200 as const, body: after };
  };

  app.post('/admin/products', async (c) => {
    const r = await save(await c.req.json().catch(() => null));
    return c.json(r.body, r.status);
  });

  app.put('/admin/products/:id', async (c) => {
    const id = c.req.param('id');
    if (!(await readProduct(db, id))) return c.json({ error: 'Produkten finns inte.' }, 404);
    const r = await save(await c.req.json().catch(() => null), id);
    return c.json(r.body, r.status);
  });

  app.post('/admin/products/:id/status', async (c) => {
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => ({}))) as { status?: string };
    const status = body.status as 'draft' | 'published' | 'archived';
    if (!['draft', 'published', 'archived'].includes(status)) return c.json({ error: 'Okänd status.' }, 400);
    const p = await readProduct(db, id);
    if (!p) return c.json({ error: 'Produkten finns inte.' }, 404);
    if (status === 'published') {
      const problems = publishProblems(productInput.parse({ ...p, status: undefined }));
      if (problems.length) return c.json({ error: `Kan inte publicera: ${problems.join(' ')}`, problems }, 400);
    }
    await db.update(s.productFamilies).set({ status, updatedAt: new Date().toISOString() }).where(eq(s.productFamilies.id, id));
    await logChange(db, { action: 'Status ändrad', object: `Produkt: ${p.name}`, details: [{ field: 'Status', from: STATUS_NAME[p.status], to: STATUS_NAME[status] }] });
    return c.json(await readProduct(db, id));
  });

  app.post('/admin/products/:id/duplicate', async (c) => {
    const p = await readProduct(db, c.req.param('id'));
    if (!p) return c.json({ error: 'Produkten finns inte.' }, 404);
    const copy = productInput.parse({
      ...p,
      name: `${p.name} (kopia)`,
      slug: '',
      status: undefined,
      variants: p.variants.map((v) => ({ ...v, id: undefined, ean: '', sku: '' })),
    });
    const { id } = await db.transaction(async (tx) => writeProduct(tx as unknown as Db, copy));
    await logChange(db, { action: 'Produkt kopierad', object: `Produkt: ${copy.name}`, details: [{ field: 'Kopia av', from: null, to: p.name }] });
    return c.json(await readProduct(db, id));
  });

  app.delete('/admin/products/:id', async (c) => {
    const p = await readProduct(db, c.req.param('id'));
    if (!p) return c.json({ error: 'Produkten finns inte.' }, 404);
    if (p.status === 'published') return c.json({ error: 'Avpublicera eller arkivera produkten innan du tar bort den.' }, 409);
    if (p.hasOrders) return c.json({ error: 'Produkten finns på ordrar och kan inte tas bort. Arkivera den i stället.' }, 409);
    await db.transaction(async (tx) => deleteProduct(tx as unknown as Db, p.id));
    await logChange(db, { action: 'Produkt borttagen', object: `Produkt: ${p.name}`, details: [{ field: 'Status', from: STATUS_NAME[p.status], to: 'Borttagen' }] });
    return c.json({ ok: true });
  });

  /** Bilduppladdning från produktformuläret. Bilden hamnar också i mediebiblioteket. */
  app.post('/admin/uploads', async (c) => {
    const form = await c.req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) return c.json({ error: 'Ingen bild skickades.' }, 400);
    try {
      const row = await saveUpload(db, file, String(form?.get('alt') ?? ''));
      return c.json({ src: row.src, id: row.id });
    } catch (e) {
      return c.json({ error: (e as Error).message }, 400);
    }
  });

  return app;
}
