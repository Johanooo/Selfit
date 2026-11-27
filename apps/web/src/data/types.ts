export type CategorySlug = string;
export type Tone = 'lavender' | 'sage' | 'sand';

export interface Category {
  slug: CategorySlug;
  name: string;
  short: string;
  intro: string;
  tone: Tone;
  /** Bild för kategorirutan. Saknas den används en produktbild. */
  image?: string;
  imageAlt?: string;
  /** Produkttyp för produkter i kategorin (styr moms och fält). */
  productType?: string;
  /** Dold i butikens meny. */
  hidden?: boolean;
}

/** Underkategori, t.ex. "Pre-workout" under Träning. */
export interface Subcategory {
  slug: string;
  name: string;
  parent: CategorySlug;
  intro: string;
  hidden?: boolean;
}

/** Produktens klassificering styr t.ex. vilka obligatoriska texter som visas. */
/** Produkttypens id, t.ex. kosttillskott eller klader. Nya typer skapas i Admin. */
export type ProductKind = string;

/** Vilken storleksguide som visas på produktsidan. */
export type SizeGuideKind = 'klader' | 'skor';

export interface Flavour {
  slug: string;
  name: string;
  note: string;
  /** Aromer i ingrediensförteckningen för just den här smaken. */
  aroma?: string;
  /** Surhetsreglerande medel för smaken. */
  acid?: string;
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
  /** Värden för produktens alternativ, t.ex. { Storlek: "M", Färg: "Svart" }. */
  options?: Record<string, string>;
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
  /** Fler underkategorier där produkten också visas, t.ex. PWO+ både under Drycker och Sporttillskott. */
  alsoIn?: string[];
  kind?: ProductKind;
  /** Storleksguide för kläder eller skor. */
  sizeGuide?: SizeGuideKind;
  /** Produktspecifika varningstexter från etiketten. */
  warnings?: string[];
  collections: string[];
  tagline: string;
  description: string[];
  usage: string;
  ingredients: string;
  /** Ingrediensförteckning per smak (slug → text) när smakerna skiljer sig. */
  ingredientsByFlavour?: Record<string, string>;
  allergens: string[];
  allergenInfoKnown?: boolean;
  nutrition?: { referenceLabel?: string; servingLabel?: string; rows: NutritionRow[] };
  facts: { label: string; value: string }[];
  /** Optional local primary product image; set alt text to describe placeholders honestly. */
  primaryImage?: string;
  primaryImageAlt?: string;
  /** Uppladdade bilder (Admin). Den första är huvudbild. */
  images?: { src: string; alt?: string }[];
  /** Namn på variantalternativ, t.ex. ["Storlek", "Färg"]. Saknas för PWO+ som använder smak/förpackning. */
  optionNames?: string[];
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
