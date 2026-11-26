/**
 * SELFITs datamodell (kravspec v3, avsnittet "Produktmodell och ägarskap").
 *
 * Regler som gäller i hela schemat:
 * - Alla belopp lagras i öre som heltal (149 kr = 14900).
 * - Momssatser och pantbelopp hårdkodas inte. De ligger i egna tabeller med giltighetsdatum.
 * - Inget lager hårdkodas. Saldo och externa referenser lagras per lagerplats.
 * - Lagersaldo ändras aldrig direkt utan via en rad i stock_ledger (lagerhistorik).
 */
import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const id = () => text('id').primaryKey();
const createdAt = () => text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);
const json = <T>(name: string) => text(name, { mode: 'json' }).$type<T>();

// ---------- Moms och pant ----------

export const vatClasses = sqliteTable('vat_classes', {
  id: id(),
  name: text('name').notNull(),
});

/** Momssats i baspunkter: 12 % = 1200. */
export const vatRates = sqliteTable('vat_rates', {
  id: id(),
  vatClassId: text('vat_class_id').notNull().references(() => vatClasses.id),
  rateBp: integer('rate_bp').notNull(),
  validFrom: text('valid_from').notNull(),
  validTo: text('valid_to'),
});

export const depositClasses = sqliteTable('deposit_classes', {
  id: id(),
  name: text('name').notNull(),
  vatClassId: text('vat_class_id').notNull().references(() => vatClasses.id),
});

export const depositRates = sqliteTable('deposit_rates', {
  id: id(),
  depositClassId: text('deposit_class_id').notNull().references(() => depositClasses.id),
  amountOre: integer('amount_ore').notNull(),
  validFrom: text('valid_from').notNull(),
  validTo: text('valid_to'),
});

// ---------- Katalog ----------

export const brands = sqliteTable('brands', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  intro: text('intro'),
});

export const categories = sqliteTable('categories', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  parentId: text('parent_id'),
  short: text('short'),
  intro: text('intro'),
  tone: text('tone'),
  image: text('image'),
  imageAlt: text('image_alt'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const collections = sqliteTable('collections', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  intro: text('intro'),
});

export const flavours = sqliteTable('flavours', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  note: text('note'),
});

export type NutritionTable = { referenceLabel?: string; servingLabel?: string; rows: { label: string; per100: string; perServing?: string }[] };

export const productFamilies = sqliteTable('product_families', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  brandId: text('brand_id').notNull().references(() => brands.id),
  productType: text('product_type').notNull(), // dryck, livsmedel, kosttillskott, kroppsvard, klader, redskap
  status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  tagline: text('tagline'),
  description: json<string[]>('description'),
  usage: text('usage'),
  ingredients: text('ingredients'),
  allergens: json<string[]>('allergens'),
  nutrition: json<NutritionTable>('nutrition'),
  facts: json<{ label: string; value: string }[]>('facts'),
  /** Visningsdata som ännu bara används av frontend (bild, ikon, etiketter). */
  display: json<Record<string, unknown>>('display'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  popularity: integer('popularity').notNull().default(0),
  /** Namnen på variantalternativen, t.ex. ["Smak", "Förpackning"] eller ["Storlek", "Färg"]. */
  optionNames: json<string[]>('option_names'),
  updatedAt: text('updated_at'),
  createdAt: createdAt(),
});

export const productCategories = sqliteTable(
  'product_categories',
  {
    familyId: text('family_id').notNull().references(() => productFamilies.id),
    categoryId: text('category_id').notNull().references(() => categories.id),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.familyId, t.categoryId] })],
);

export const productCollections = sqliteTable(
  'product_collections',
  {
    familyId: text('family_id').notNull().references(() => productFamilies.id),
    collectionId: text('collection_id').notNull().references(() => collections.id),
  },
  (t) => [primaryKey({ columns: [t.familyId, t.collectionId] })],
);

/** "Liknande produkter" och "Passar ihop med" är separata relationer. */
export const productRelations = sqliteTable(
  'product_relations',
  {
    familyId: text('family_id').notNull().references(() => productFamilies.id),
    relatedFamilyId: text('related_family_id').notNull().references(() => productFamilies.id),
    kind: text('kind', { enum: ['similar', 'pairs_with'] }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.familyId, t.relatedFamilyId, t.kind] })],
);

export const variants = sqliteTable(
  'variants',
  {
    id: id(),
    familyId: text('family_id').notNull().references(() => productFamilies.id),
    sku: text('sku').notNull().unique(),
    gtin: text('gtin'),
    flavourSlug: text('flavour_slug').references(() => flavours.slug),
    packSize: integer('pack_size'),
    sizeLabel: text('size_label'),
    image: text('image'),
    netAmount: integer('net_amount_milli'), // nettomängd × 1000, t.ex. 1,98 l = 1980
    netUnit: text('net_unit', { enum: ['l', 'kg', 'st'] }),
    grossWeightG: integer('gross_weight_g'),
    lengthMm: integer('length_mm'),
    widthMm: integer('width_mm'),
    heightMm: integer('height_mm'),
    /** not_offered = kombinationen säljs inte alls (skiljs från aktiv variant utan saldo). */
    status: text('status', { enum: ['active', 'inactive', 'not_offered'] }).notNull().default('active'),
    vatClassId: text('vat_class_id').notNull().references(() => vatClasses.id),
    depositClassId: text('deposit_class_id').references(() => depositClasses.id),
    depositUnits: integer('deposit_units').notNull().default(0),
    trackBatches: integer('track_batches', { mode: 'boolean' }).notNull().default(true),
    /** Variantens värden för produktens alternativ, t.ex. { Smak: "Blåbär", Förpackning: "12-pack" }. */
    options: json<Record<string, string>>('options'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index('variants_family_idx').on(t.familyId), uniqueIndex('variants_gtin_idx').on(t.gtin)],
);

/** Prishistorik. Gällande pris = senaste raden med valid_from <= nu. */
export const prices = sqliteTable(
  'prices',
  {
    id: id(),
    variantId: text('variant_id').notNull().references(() => variants.id),
    amountOre: integer('amount_ore').notNull(),
    currency: text('currency').notNull().default('SEK'),
    validFrom: text('valid_from').notNull(),
    validTo: text('valid_to'),
    createdBy: text('created_by'),
    createdAt: createdAt(),
  },
  (t) => [index('prices_variant_idx').on(t.variantId, t.validFrom)],
);

/** Inköpskostnad är intern och syns bara för behörig roll. */
export const purchaseCosts = sqliteTable('purchase_costs', {
  id: id(),
  variantId: text('variant_id').notNull().references(() => variants.id),
  amountOre: integer('amount_ore').notNull(),
  validFrom: text('valid_from').notNull(),
  createdAt: createdAt(),
});

// ---------- Lager ----------

export const warehouses = sqliteTable('warehouses', {
  id: id(),
  name: text('name').notNull(),
  kind: text('kind', { enum: ['3pl', 'own'] }).notNull(),
  /** Vilken adapter som pratar med lagret, t.ex. "manual" för eget lager. */
  adapter: text('adapter').notNull(),
  address: text('address'),
  status: text('status', { enum: ['active', 'paused'] }).notNull().default('active'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  settings: json<Record<string, unknown>>('settings'),
});

export const warehouseItemRefs = sqliteTable(
  'warehouse_item_refs',
  {
    warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
    variantId: text('variant_id').notNull().references(() => variants.id),
    externalRef: text('external_ref').notNull(),
  },
  (t) => [primaryKey({ columns: [t.warehouseId, t.variantId] })],
);

export const stockLevels = sqliteTable(
  'stock_levels',
  {
    variantId: text('variant_id').notNull().references(() => variants.id),
    warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
    onHand: integer('on_hand').notNull().default(0),
    reserved: integer('reserved').notNull().default(0),
    blocked: integer('blocked').notNull().default(0),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.variantId, t.warehouseId] })],
);

export const stockLedger = sqliteTable(
  'stock_ledger',
  {
    id: id(),
    variantId: text('variant_id').notNull().references(() => variants.id),
    warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
    eventType: text('event_type', {
      enum: ['sale', 'reservation', 'receipt', 'return', 'adjustment', 'transfer', 'count', 'initial'],
    }).notNull(),
    change: integer('change').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    reason: text('reason'),
    referenceType: text('reference_type'),
    referenceId: text('reference_id'),
    actor: text('actor').notNull(),
    comment: text('comment'),
    createdAt: createdAt(),
  },
  (t) => [index('stock_ledger_variant_idx').on(t.variantId, t.warehouseId)],
);

export const batches = sqliteTable('batches', {
  id: id(),
  variantId: text('variant_id').notNull().references(() => variants.id),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  code: text('code').notNull(),
  bestBefore: text('best_before'),
  quantity: integer('quantity').notNull(),
  status: text('status', { enum: ['sellable', 'short_dated', 'blocked', 'discarded'] }).notNull().default('sellable'),
  warehouseRef: text('warehouse_ref'),
});

// ---------- Frakt ----------

export const shippingMethods = sqliteTable('shipping_methods', {
  id: id(),
  name: text('name').notNull(),
  carrier: text('carrier'),
  priceOre: integer('price_ore').notNull(),
  /** Pris när ordern når gränsen för fri frakt (0 = fri frakt). */
  priceOverThresholdOre: integer('price_over_threshold_ore').notNull().default(0),
  freeThresholdOre: integer('free_threshold_ore'),
  vatClassId: text('vat_class_id').notNull().references(() => vatClasses.id),
  country: text('country').notNull().default('SE'),
  estimatedDays: text('estimated_days'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

// ---------- Kunder och order ----------

export const customers = sqliteTable('customers', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name'),
  phone: text('phone'),
  newsletterConsentAt: text('newsletter_consent_at'),
  notes: text('notes'),
  tags: json<string[]>('tags'),
  anonymizedAt: text('anonymized_at'),
  createdAt: createdAt(),
});

export type Address = { name: string; street: string; postalCode: string; city: string; country: string };

export const orders = sqliteTable('orders', {
  id: id(),
  number: text('number').notNull().unique(),
  customerId: text('customer_id').references(() => customers.id),
  email: text('email').notNull(),
  phone: text('phone'),
  shippingAddress: json<Address>('shipping_address'),
  source: text('source', { enum: ['web', 'manual'] }).notNull().default('web'),
  paymentStatus: text('payment_status', {
    enum: ['pending', 'authorized', 'captured', 'cancelled', 'refunded', 'partially_refunded', 'not_required'],
  }).notNull().default('pending'),
  fulfillmentStatus: text('fulfillment_status', {
    enum: ['unfulfilled', 'on_hold', 'sent_to_warehouse', 'picked', 'shipped', 'delivered', 'cancelled'],
  }).notNull().default('unfulfilled'),
  holdReason: text('hold_reason'),
  shippingMethodId: text('shipping_method_id').references(() => shippingMethods.id),
  warehouseId: text('warehouse_id').references(() => warehouses.id),
  warehouseOrderRef: text('warehouse_order_ref'),
  paymentProviderRef: text('payment_provider_ref'),
  discountCode: text('discount_code'),
  subtotalOre: integer('subtotal_ore').notNull(),
  discountOre: integer('discount_ore').notNull().default(0),
  depositOre: integer('deposit_ore').notNull().default(0),
  shippingOre: integer('shipping_ore').notNull().default(0),
  vatOre: integer('vat_ore').notNull(),
  totalOre: integer('total_ore').notNull(),
  originalOrderId: text('original_order_id'),
  manualReason: text('manual_reason'),
  createdAt: createdAt(),
});

/** Orderrader är oföränderliga: pris, rabatt, pant och moms sparas vid köp. */
export const orderLines = sqliteTable('order_lines', {
  id: id(),
  orderId: text('order_id').notNull().references(() => orders.id),
  variantId: text('variant_id').notNull().references(() => variants.id),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceOre: integer('unit_price_ore').notNull(),
  discountOre: integer('discount_ore').notNull().default(0),
  depositOre: integer('deposit_ore').notNull().default(0),
  vatRateBp: integer('vat_rate_bp').notNull(),
  vatOre: integer('vat_ore').notNull(),
  lineTotalOre: integer('line_total_ore').notNull(),
});

export const orderEvents = sqliteTable('order_events', {
  id: id(),
  orderId: text('order_id').notNull().references(() => orders.id),
  type: text('type').notNull(),
  data: json<Record<string, unknown>>('data'),
  actor: text('actor').notNull(),
  createdAt: createdAt(),
});

// ---------- Butiksinställningar ----------

/**
 * Inställningar som ändras i Admin, t.ex. företagsuppgifter ("company") och villkor ("policies").
 * Ett värde per nyckel, sparat som JSON. Saknas en nyckel används standardvärdena i siteDefaults.ts.
 */
export const siteSettings = sqliteTable('site_settings', {
  key: text('key').primaryKey(),
  value: json<Record<string, unknown>>('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Sidor som har skrivits om i Admin (köpvillkor, integritet …). Sidor som inte finns här
 * visas med standardtexten i pageTemplates.ts.
 */
export const pages = sqliteTable('pages', {
  slug: text('slug').primaryKey(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  sections: json<{ heading: string; body: string }[]>('sections').notNull(),
  faq: json<{ q: string; a: string }[]>('faq'),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Ändringslogg: vem ändrade vad och när. Raderna skrivs automatiskt när något sparas i Admin.
 * Loggen kan bara läggas till – servern har inga funktioner för att ändra eller ta bort rader.
 */
export const auditLog = sqliteTable(
  'audit_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    at: text('at').notNull(),
    actor: text('actor').notNull(),
    action: text('action').notNull(),
    object: text('object').notNull(),
    details: json<{ field: string; from: unknown; to: unknown }[]>('details'),
  },
  (t) => [index('audit_log_at_idx').on(t.at)],
);

/** Mediebiblioteket: bilder som laddats upp i Admin. Filen ligger i ~/selfit-data/uploads. */
export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  src: text('src').notNull().unique(),
  name: text('name').notNull(),
  alt: text('alt').notNull().default(''),
  width: integer('width'),
  height: integer('height'),
  bytes: integer('bytes').notNull().default(0),
  createdAt: createdAt(),
});

// ---------- Rabatter ----------

export type DiscountAppliesTo = { type: 'all' | 'categories' | 'products'; categories: string[]; products: string[] };
export type DiscountEligibility = { type: 'all' | 'new' | 'returning' | 'specific'; customerIds: string[] };

/**
 * Rabattkoder och automatiska rabatter.
 * value: procent (1–100) eller fast belopp i öre. minValue: öre eller antal artiklar.
 */
export const discounts = sqliteTable('discounts', {
  id: text('id').primaryKey(),
  method: text('method', { enum: ['code', 'automatic'] }).notNull(),
  code: text('code').unique(),
  title: text('title').notNull(),
  kind: text('kind', { enum: ['products', 'order', 'shipping'] }).notNull(),
  valueType: text('value_type', { enum: ['percent', 'fixed'] }).notNull().default('percent'),
  value: integer('value').notNull().default(0),
  appliesTo: json<DiscountAppliesTo>('applies_to').notNull(),
  eligibility: json<DiscountEligibility>('eligibility').notNull(),
  minType: text('min_type', { enum: ['none', 'amount', 'quantity'] }).notNull().default('none'),
  minValue: integer('min_value').notNull().default(0),
  usageLimit: integer('usage_limit'),
  oncePerCustomer: integer('once_per_customer', { mode: 'boolean' }).notNull().default(false),
  startsAt: text('starts_at').notNull(),
  endsAt: text('ends_at'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  updatedAt: text('updated_at'),
  createdAt: createdAt(),
});
