import { getCollection } from '@/data/categories';
import type { RowSource } from '@/data/homeDefaults';
import { products } from '@/data/products';
import { productsIn, visibleCategories } from '@/data/taxonomy';
import { allItems, sortItems, toItems, type ListingItem } from '@/lib/catalog';
import { isOnSale } from '@/lib/price-history';

const EMPTY = { packs: [], flavours: [], prices: [] };

/** Produkterna i en produktrad på startsidan, mest populära först. */
export function itemsForSource(source: RowSource, limit: number): ListingItem[] {
  const popular = (list: ListingItem[]) => sortItems(list, 'popularitet', EMPTY);
  let items: ListingItem[];
  if (source === 'sale') items = allItems().filter((i) => i.variants.some((v) => isOnSale(v)));
  else if (source === 'new') items = allItems().filter((i) => i.product.isNew);
  else if (source === 'popular') items = allItems();
  else if (source.startsWith('category:')) items = toItems(productsIn(source.slice(9)));
  else if (source.startsWith('collection:')) items = toItems(products.filter((p) => p.collections.includes(source.slice(11))));
  else items = [];
  return popular(items).slice(0, limit);
}

/** Valen i Admin för var en produktrad hämtar produkter. */
export function sourceOptions(): { value: RowSource; label: string }[] {
  return [
    { value: 'sale', label: 'Kampanjer (sänkt pris)' },
    { value: 'popular', label: 'Populärast just nu' },
    { value: 'new', label: 'Nyheter' },
    ...visibleCategories().map((c) => ({ value: `category:${c.slug}` as RowSource, label: `Kategori: ${c.name}` })),
    ...['pwo-plus', 'bastsaljare']
      .map((slug) => getCollection(slug))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({ value: `collection:${c.slug}` as RowSource, label: `Kollektion: ${c.name}` })),
  ];
}
