export type CategorySlug = 'traning' | 'halsa' | 'skonhet';
export type Tone = 'lavender' | 'sage' | 'sand';

export interface Category {
  slug: CategorySlug;
  name: string;
  short: string;
  intro: string;
  tone: Tone;
  image: string;
  imageAlt: string;
}

/** Underkategori, t.ex. "Pre-workout" under Träning. */
export interface Subcategory {
  slug: string;
  name: string;
  parent: CategorySlug;
  intro: string;
}

/** Produktens klassificering styr t.ex. vilka obligatoriska texter som visas. */
export type ProductKind = 'dryck' | 'livsmedel' | 'kosttillskott' | 'kroppsvard' | 'redskap';

export interface Flavour {
  slug: string;
  name: string;
  note: string;
}

export type ArtKind = 'can' | 'jar' | 'tube' | 'bottle' | 'box' | 'shaker' | 'band';
export type ArtTone = 'plum' | 'sage' | 'sand' | 'rose' | 'sky' | 'ink';

export interface Measure {
  amount: number;
  unit: 'l' | 'kg' | 'st';
}

/** En prisändring: priset gäller från och med datumet tills nästa ändring. */
export interface PricePoint {
  from: string; // ÅÅÅÅ-MM-DD
  price: number;
}

export interface Variant {
  id: string;
  flavour?: string;
  pack?: number;
  price: number;
  depositPerUnit: number;
  stock: number;
  /** false = combination is not produced at all (not just sold out) */
  offered: boolean;
  ean: string;
  /** Image key, e.g. "can:blueberry", "photo:/images/..." or "art". */
  image: string;
  measure?: Measure;
  /** Prisändringar, äldst först. Sista posten är dagens pris. */
  priceHistory?: PricePoint[];
}

export interface NutritionRow {
  label: string;
  per100: string;
  perServing?: string;
}

export interface Product {
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  category: CategorySlug;
  subcategory?: string;
  kind?: ProductKind;
  /** Produktspecifika varningstexter från etiketten. */
  warnings?: string[];
  collections: string[];
  tagline: string;
  description: string[];
  usage: string;
  ingredients: string;
  allergens: string[];
  allergenInfoKnown?: boolean;
  nutrition?: { referenceLabel?: string; servingLabel?: string; rows: NutritionRow[] };
  facts: { label: string; value: string }[];
  /** Optional local primary product image; set alt text to describe placeholders honestly. */
  primaryImage?: string;
  primaryImageAlt?: string;
  art: ArtKind;
  artTone: ArtTone;
  unitLabel: string;
  sizeLabel: string;
  vatRate: number;
  popularity: number;
  isNew?: boolean;
  related: string[];
  pairsWith: string[];
  variants: Variant[];
}

export interface Brand {
  slug: string;
  name: string;
  intro: string;
}

export interface Collection {
  slug: string;
  name: string;
  intro: string;
}
