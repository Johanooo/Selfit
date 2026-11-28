/**
 * Admin → Katalog → Produkttyper och fält / Kategorier.
 * Typerna och kategorierna sparas i databasen och läggs in i den delade listan (web/src/data),
 * så att både servern och butiken använder samma.
 */
import { asc, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  categories as codeCategories,
  DEFAULT_CATEGORY_TYPES,
  replaceCategories,
  subcategories as codeSubcategories,
} from '../../../web/src/data/categories.ts';
import { defaultProductTypes, replaceProductTypes, type ProductTypeDef } from '../../../web/src/data/productTypes.ts';
import type { Category, Subcategory, Tone } from '../../../web/src/data/types.ts';
import type { Db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { logChange } from '../lib/audit.ts';
import { moveToTrash } from '../lib/trash.ts';

export interface TaxonomyPayload {
  productTypes: ProductTypeDef[];
  categories: Category[];
  subcategories: Subcategory[];
}

const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/é/g, 'e')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/** Standardtyper och underkategorier från koden läggs in i databasen. Befintliga rörs inte. */
export async function syncTaxonomy(db: Db) {
  for (const [i, t] of defaultProductTypes.entries()) {
    await db.insert(s.productTypes).values({ id: t.id, name: t.name, vatClassId: t.vat, fields: { ...t.fields }, builtIn: true, sortOrder: i }).onConflictDoNothing();
  }
  for (const [i, sc] of codeSubcategories.entries()) {
    await db
      .insert(s.categories)
      .values({ id: `cat_${sc.slug}`, slug: sc.slug, name: sc.name, parentId: `cat_${sc.parent}`, intro: sc.intro, sortOrder: i })
      .onConflictDoNothing();
  }
  // Huvudkategorier som saknar typ får standardtypen.
  const mains = await db.select().from(s.categories).where(isNull(s.categories.parentId));
  for (const m of mains) {
    if (!m.productType && DEFAULT_CATEGORY_TYPES[m.slug]) await db.update(s.categories).set({ productType: DEFAULT_CATEGORY_TYPES[m.slug] }).where(eq(s.categories.id, m.id));
  }
  await loadTaxonomy(db);
}

/** Läser typer och kategorier ur databasen och lägger in dem i den delade listan. */
export async function loadTaxonomy(db: Db): Promise<TaxonomyPayload> {
  const [types, cats] = await Promise.all([
    db.select().from(s.productTypes).orderBy(asc(s.productTypes.sortOrder), asc(s.productTypes.name)),
    db.select().from(s.categories).orderBy(asc(s.categories.sortOrder), asc(s.categories.name)),
  ]);
  const productTypes: ProductTypeDef[] = types.map((t) => ({
    id: t.id,
    name: t.name,
    vat: t.vatClassId === 'vat-food' ? 'vat-food' : 'vat-standard',
    builtIn: t.builtIn,
    fields: { ...(defaultProductTypes.find((d) => d.id === t.id)?.fields ?? defaultProductTypes[5].fields), ...(t.fields as object) } as ProductTypeDef['fields'],
  }));
  const byId = new Map(cats.map((c) => [c.id, c]));
  const code = new Map(codeCategories.map((c) => [c.slug, c]));
  const categories: Category[] = cats
    .filter((c) => !c.parentId)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      short: c.short ?? '',
      intro: c.intro ?? '',
      tone: ((c.tone as Tone | null) ?? code.get(c.slug)?.tone ?? 'lavender') as Tone,
      ...(c.image ? { image: c.image, imageAlt: c.imageAlt ?? '' } : {}),
      productType: c.productType ?? DEFAULT_CATEGORY_TYPES[c.slug],
      ...(c.hidden ? { hidden: true } : {}),
    }));
  const subcategories: Subcategory[] = cats
    .filter((c) => c.parentId && byId.has(c.parentId))
    .map((c) => ({ slug: c.slug, name: c.name, parent: byId.get(c.parentId!)!.slug, intro: c.intro ?? '', ...(c.hidden ? { hidden: true } : {}) }));
  replaceProductTypes(productTypes);
  replaceCategories(categories, subcategories);
  return { productTypes, categories, subcategories };
}

const fieldsSchema = z.object({
  usage: z.enum(['usage', 'care', 'off']),
  contents: z.enum(['ingredients', 'material', 'inci', 'off']),
  allergens: z.boolean(),
  nutrition: z.boolean(),
  warnings: z.boolean(),
  sizeGuide: z.boolean(),
  deposit: z.boolean(),
  supplementWarning: z.boolean(),
});
const typeInput = z.object({
  name: z.string().trim().min(1, 'Ge typen ett namn.').max(60),
  vat: z.enum(['vat-food', 'vat-standard']),
  fields: fieldsSchema,
});
const categoryInput = z.object({
  name: z.string().trim().min(1, 'Ge kategorin ett namn.').max(60),
  parent: z.string().trim().max(60).nullable().default(null),
  productType: z.string().trim().max(60).nullable().default(null),
  short: z.string().trim().max(200).default(''),
  /** Kan vara formaterad text (HTML) från textredigeraren. */
  intro: z.string().trim().max(20000).default(''),
  image: z.string().trim().max(400).default(''),
  imageAlt: z.string().trim().max(200).default(''),
  hidden: z.boolean().default(false),
});

/** Hur många produkter som använder varje kategori och typ. */
async function usage(db: Db) {
  const fams = await db.select({ productType: s.productFamilies.productType, display: s.productFamilies.display }).from(s.productFamilies);
  const byCat = new Map<string, number>();
  const byType = new Map<string, number>();
  for (const f of fams) {
    const d = (f.display ?? {}) as { category?: string; subcategory?: string };
    for (const slug of new Set([d.category, d.subcategory].filter(Boolean) as string[])) byCat.set(slug, (byCat.get(slug) ?? 0) + 1);
    byType.set(f.productType, (byType.get(f.productType) ?? 0) + 1);
  }
  return { byCat, byType };
}

export function taxonomyRoutes(db: Db, onChange: () => Promise<unknown> = async () => undefined) {
  const app = new Hono();
  const changed = async () => {
    await loadTaxonomy(db);
    await onChange();
  };

  app.get('/taxonomy', async (c) => c.json(await loadTaxonomy(db)));

  app.get('/admin/taxonomy', async (c) => {
    const data = await loadTaxonomy(db);
    const { byCat, byType } = await usage(db);
    const catTypeCount = new Map<string, number>();
    for (const cat of data.categories) if (cat.productType) catTypeCount.set(cat.productType, (catTypeCount.get(cat.productType) ?? 0) + 1);
    return c.json({
      productTypes: data.productTypes.map((t) => ({ ...t, products: byType.get(t.id) ?? 0, categories: catTypeCount.get(t.id) ?? 0 })),
      categories: data.categories.map((cat) => ({ ...cat, products: byCat.get(cat.slug) ?? 0 })),
      subcategories: data.subcategories.map((sc) => ({ ...sc, products: byCat.get(sc.slug) ?? 0 })),
    });
  });

  // ---------- Produkttyper ----------
  app.post('/admin/product-types', async (c) => {
    const parsed = typeInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Kontrollera fälten.' }, 400);
    const id = slugify(parsed.data.name);
    if (!id) return c.json({ error: 'Namnet måste innehålla bokstäver eller siffror.' }, 400);
    const [taken] = await db.select({ id: s.productTypes.id }).from(s.productTypes).where(eq(s.productTypes.id, id));
    if (taken) return c.json({ error: `Produkttypen ${parsed.data.name} finns redan.` }, 409);
    const count = (await db.select({ id: s.productTypes.id }).from(s.productTypes)).length;
    await db.insert(s.productTypes).values({ id, name: parsed.data.name, vatClassId: parsed.data.vat, fields: parsed.data.fields, builtIn: false, sortOrder: count });
    await logChange(db, { action: 'Produkttyp skapad', object: `Produkttyp: ${parsed.data.name}`, details: [{ field: 'Moms', from: '–', to: parsed.data.vat === 'vat-food' ? 'Livsmedelsmoms' : 'Normalmoms 25 %' }] });
    await changed();
    return c.json({ id });
  });

  app.put('/admin/product-types/:id', async (c) => {
    const id = c.req.param('id');
    const parsed = typeInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Kontrollera fälten.' }, 400);
    const [prev] = await db.select().from(s.productTypes).where(eq(s.productTypes.id, id));
    if (!prev) return c.json({ error: 'Produkttypen finns inte.' }, 404);
    await db.update(s.productTypes).set({ name: parsed.data.name, vatClassId: parsed.data.vat, fields: parsed.data.fields }).where(eq(s.productTypes.id, id));
    const details = [];
    if (prev.name !== parsed.data.name) details.push({ field: 'Namn', from: prev.name, to: parsed.data.name });
    if (prev.vatClassId !== parsed.data.vat) details.push({ field: 'Moms', from: prev.vatClassId, to: parsed.data.vat });
    if (JSON.stringify(prev.fields) !== JSON.stringify(parsed.data.fields)) details.push({ field: 'Fält', from: 'tidigare version', to: 'ny version' });
    if (details.length) await logChange(db, { action: 'Produkttyp ändrad', object: `Produkttyp: ${parsed.data.name}`, details });
    await changed();
    return c.json({ ok: true });
  });

  app.delete('/admin/product-types/:id', async (c) => {
    const id = c.req.param('id');
    const [row] = await db.select().from(s.productTypes).where(eq(s.productTypes.id, id));
    if (!row) return c.json({ error: 'Produkttypen finns inte.' }, 404);
    if (row.builtIn) return c.json({ error: 'Standardtyper kan inte tas bort.' }, 409);
    const { byType } = await usage(db);
    if (byType.get(id)) return c.json({ error: `Typen används av ${byType.get(id)} produkter. Byt typ på dem först.` }, 409);
    const cats = await db.select({ name: s.categories.name }).from(s.categories).where(eq(s.categories.productType, id));
    if (cats.length) return c.json({ error: `Typen används av kategorin ${cats.map((x) => x.name).join(', ')}. Byt typ där först.` }, 409);
    await moveToTrash(db, { kind: 'productType', objectId: id, label: row.name, parts: [['productTypes', [row]]] });
    await db.delete(s.productTypes).where(eq(s.productTypes.id, id));
    await logChange(db, { action: 'Produkttyp borttagen', object: `Produkttyp: ${row.name}`, details: [{ field: 'Till', from: '', to: 'Papperskorgen' }] });
    await changed();
    return c.json({ ok: true });
  });

  // ---------- Kategorier ----------
  app.post('/admin/categories', async (c) => {
    const parsed = categoryInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Kontrollera fälten.' }, 400);
    const d = parsed.data;
    const slug = slugify(d.name);
    if (!slug) return c.json({ error: 'Namnet måste innehålla bokstäver eller siffror.' }, 400);
    const [taken] = await db.select({ id: s.categories.id }).from(s.categories).where(eq(s.categories.slug, slug));
    if (taken) return c.json({ error: `Det finns redan en kategori med adressen /kategori/${slug}. Välj ett annat namn.` }, 409);
    let parentId: string | null = null;
    if (d.parent) {
      const [parent] = await db.select().from(s.categories).where(eq(s.categories.slug, d.parent));
      if (!parent || parent.parentId) return c.json({ error: 'Välj en huvudkategori att lägga den under.' }, 400);
      parentId = parent.id;
    } else if (!d.productType) {
      return c.json({ error: 'Välj produkttyp för huvudkategorin.' }, 400);
    }
    if (d.productType) {
      const [t] = await db.select({ id: s.productTypes.id }).from(s.productTypes).where(eq(s.productTypes.id, d.productType));
      if (!t) return c.json({ error: 'Produkttypen finns inte.' }, 400);
    }
    const siblings = await db.select({ id: s.categories.id }).from(s.categories).where(parentId ? eq(s.categories.parentId, parentId) : isNull(s.categories.parentId));
    await db.insert(s.categories).values({
      id: `cat_${slug}`,
      slug,
      name: d.name,
      parentId,
      short: d.short,
      intro: d.intro,
      image: d.image || null,
      imageAlt: d.imageAlt || null,
      productType: parentId ? null : d.productType,
      hidden: d.hidden,
      sortOrder: 1000 + siblings.length,
    });
    await logChange(db, { action: 'Kategori skapad', object: `Kategori: ${d.name}` });
    await changed();
    return c.json({ slug });
  });

  app.put('/admin/categories/:slug', async (c) => {
    const slug = c.req.param('slug');
    const parsed = categoryInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Kontrollera fälten.' }, 400);
    const d = parsed.data;
    const [row] = await db.select().from(s.categories).where(eq(s.categories.slug, slug));
    if (!row) return c.json({ error: 'Kategorin finns inte.' }, 404);
    if (!row.parentId && !d.productType) return c.json({ error: 'Välj produkttyp för huvudkategorin.' }, 400);
    await db
      .update(s.categories)
      .set({ name: d.name, short: d.short, intro: d.intro, image: d.image || null, imageAlt: d.imageAlt || null, productType: row.parentId ? null : d.productType, hidden: d.hidden })
      .where(eq(s.categories.id, row.id));
    const details = [];
    if (row.name !== d.name) details.push({ field: 'Namn', from: row.name, to: d.name });
    if (!row.parentId && row.productType !== d.productType) details.push({ field: 'Produkttyp', from: row.productType ?? '–', to: d.productType ?? '–' });
    if (row.hidden !== d.hidden) details.push({ field: 'Synlig', from: row.hidden ? 'Dold' : 'Visas', to: d.hidden ? 'Dold' : 'Visas' });
    await logChange(db, { action: 'Kategori ändrad', object: `Kategori: ${d.name}`, details });
    await changed();
    return c.json({ ok: true });
  });

  /** Flytta en kategori upp eller ner bland sina syskon. */
  app.post('/admin/categories/:slug/move', async (c) => {
    const slug = c.req.param('slug');
    const { dir } = (await c.req.json().catch(() => ({}))) as { dir?: number };
    const [row] = await db.select().from(s.categories).where(eq(s.categories.slug, slug));
    if (!row || (dir !== 1 && dir !== -1)) return c.json({ error: 'Kunde inte flytta.' }, 400);
    const siblings = await db
      .select()
      .from(s.categories)
      .where(row.parentId ? eq(s.categories.parentId, row.parentId) : isNull(s.categories.parentId))
      .orderBy(asc(s.categories.sortOrder), asc(s.categories.name));
    const i = siblings.findIndex((x) => x.id === row.id);
    const j = i + dir;
    if (j < 0 || j >= siblings.length) return c.json({ ok: true });
    const order = [...siblings];
    [order[i], order[j]] = [order[j], order[i]];
    for (const [n, x] of order.entries()) await db.update(s.categories).set({ sortOrder: n }).where(eq(s.categories.id, x.id));
    await changed();
    return c.json({ ok: true });
  });

  app.delete('/admin/categories/:slug', async (c) => {
    const slug = c.req.param('slug');
    const [row] = await db.select().from(s.categories).where(eq(s.categories.slug, slug));
    if (!row) return c.json({ error: 'Kategorin finns inte.' }, 404);
    const children = await db.select({ id: s.categories.id }).from(s.categories).where(eq(s.categories.parentId, row.id));
    if (children.length) return c.json({ error: 'Ta bort eller flytta underkategorierna först.' }, 409);
    const { byCat } = await usage(db);
    if (byCat.get(slug)) return c.json({ error: `Kategorin har ${byCat.get(slug)} produkter. Flytta dem först, eller dölj kategorin.` }, 409);
    const links = await db.select().from(s.productCategories).where(eq(s.productCategories.categoryId, row.id));
    await moveToTrash(db, { kind: 'category', objectId: row.id, label: row.name, detail: row.parentId ? 'Underkategori' : 'Huvudkategori', parts: [['categories', [row]], ['productCategories', links]] });
    await db.delete(s.productCategories).where(eq(s.productCategories.categoryId, row.id));
    await db.delete(s.categories).where(eq(s.categories.id, row.id));
    await logChange(db, { action: 'Kategori borttagen', object: `Kategori: ${row.name}`, details: [{ field: 'Till', from: '', to: 'Papperskorgen' }] });
    await changed();
    return c.json({ ok: true });
  });

  return app;
}
