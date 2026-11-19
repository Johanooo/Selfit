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
  /** Image key, e.g. "can:blueberry" or "art". */
  image: string;
  measure?: Measure;
}

export interface NutritionRow {
  label: string;
  per100: string;
  perServing: string;
}

export interface Product {
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  category: CategorySlug;
  collections: string[];
  tagline: string;
  description: string[];
  usage: string;
  ingredients: string;
  allergens: string[];
  nutrition?: { servingLabel: string; rows: NutritionRow[] };
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
