import type { Flavour, Product, Variant } from '@/data/types';
import { getFlavour, products } from '@/data/products';
import { getCategory } from '@/data/categories';
import { isBuyable } from './format';

export interface ListingItem {
  key: string;
  product: Product;
  flavour?: Flavour;
  /** offered variants represented by this card */
  variants: Variant[];
}

export function productHref(product: Product, v?: Partial<Pick<Variant, 'flavour' | 'pack'>>): string {
  const qs = new URLSearchParams();
  if (v?.flavour) qs.set('smak', v.flavour);
  if (v?.pack && product.variants.some((x) => x.pack !== v.pack)) qs.set('pack', String(v.pack));
  const q = qs.toString();
  return `/produkt/${product.slug}${q ? `?${q}` : ''}`;
}

/** One card per flavour for flavoured products, otherwise one card per product. */
export function toItems(list: Product[]): ListingItem[] {
  return list.flatMap((product) => {
    const offered = product.variants.filter((v) => v.offered);
    const flavourSlugs = [...new Set(offered.map((v) => v.flavour).filter(Boolean))] as string[];
    if (flavourSlugs.length) {
      return flavourSlugs.map((f) => ({
        key: `${product.slug}-${f}`,
        product,
        flavour: getFlavour(f),
        variants: offered.filter((v) => v.flavour === f),
      }));
    }
    return [{ key: product.slug, product, variants: offered }];
  });
}

export const allItems = () => toItems(products);

export interface Filters {
  packs: number[];
  flavours: string[];
  prices: string[];
}

export const PRICE_BUCKETS = [
  { id: 'under-100', label: 'Under 100 kr', test: (p: number) => p < 100 },
  { id: '100-250', label: '100–250 kr', test: (p: number) => p >= 100 && p <= 250 },
  { id: 'over-250', label: 'Över 250 kr', test: (p: number) => p > 250 },
];

export type SortKey = 'popularitet' | 'pris-stigande' | 'pris-fallande' | 'jamforpris';
export const SORTS: { id: SortKey; label: string }[] = [
  { id: 'popularitet', label: 'Popularitet' },
  { id: 'pris-stigande', label: 'Pris, lägst först' },
  { id: 'pris-fallande', label: 'Pris, högst först' },
  { id: 'jamforpris', label: 'Jämförpris, lägst först' },
];

/** Which variant a card should present given active filters. */
export function displayVariant(item: ListingItem, filters?: Filters): Variant {
  let pool = item.variants;
  if (filters?.packs.length) {
    const m = pool.filter((v) => v.pack && filters.packs.includes(v.pack));
    if (m.length) pool = m;
  }
  const buyable = pool.filter(isBuyable);
  const base = buyable.length ? buyable : pool;
  return [...base].sort((a, b) => a.price - b.price)[0] ?? item.variants[0];
}

/** A card has a "clear" variant when exactly one purchasable choice remains. */
export function clearVariant(item: ListingItem, filters?: Filters): Variant | undefined {
  let pool = item.variants;
  if (filters?.packs.length === 1) pool = pool.filter((v) => v.pack === filters.packs[0]);
  return pool.length === 1 ? pool[0] : undefined;
}

export function applyFilters(items: ListingItem[], f: Filters): ListingItem[] {
  return items.filter((item) => {
    if (f.packs.length && !item.variants.some((v) => v.pack && f.packs.includes(v.pack))) return false;
    if (f.flavours.length && !(item.flavour && f.flavours.includes(item.flavour.slug))) return false;
    if (f.prices.length) {
      const price = displayVariant(item, f).price;
      if (!PRICE_BUCKETS.filter((b) => f.prices.includes(b.id)).some((b) => b.test(price))) return false;
    }
    return true;
  });
}

function compareValue(v: Variant): number {
  if (!v.measure) return Number.POSITIVE_INFINITY;
  return v.price / v.measure.amount;
}

export function sortItems(items: ListingItem[], sort: SortKey, f: Filters): ListingItem[] {
  const arr = [...items];
  switch (sort) {
    case 'pris-stigande':
      return arr.sort((a, b) => displayVariant(a, f).price - displayVariant(b, f).price);
    case 'pris-fallande':
      return arr.sort((a, b) => displayVariant(b, f).price - displayVariant(a, f).price);
    case 'jamforpris':
      return arr.sort((a, b) => compareValue(displayVariant(a, f)) - compareValue(displayVariant(b, f)));
    default:
      return arr.sort(
        (a, b) => b.product.popularity - a.product.popularity || a.key.localeCompare(b.key, 'sv'),
      );
  }
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function searchItems(query: string): ListingItem[] {
  const tokens = normalise(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  return allItems().filter((item) => {
    const hay = normalise(
      [
        item.product.name,
        item.product.brand,
        item.product.tagline,
        item.flavour?.name ?? '',
        getCategory(item.product.category)?.name ?? '',
        item.product.name.includes('PWO') ? 'pre-workout preworkout energidryck' : '',
      ].join(' '),
    );
    return tokens.every((t) => hay.includes(t));
  });
}

export function itemsForSlugs(slugs: string[]): ListingItem[] {
  return slugs.flatMap((s) => {
    const p = products.find((x) => x.slug === s);
    if (!p) return [];
    return toItems([p]).slice(0, 1);
  });
}
