import type { Product, ProductKind } from '@/data/types';

/** Produkttyp utifrån huvudkategorin, när produkten inte har någon egen typ. */
const BY_CATEGORY: Record<string, ProductKind> = {
  drycker: 'dryck',
  livsmedel: 'livsmedel',
  bars: 'livsmedel',
  halsokost: 'kosttillskott',
  kosttillskott: 'kosttillskott',
  kroppsvard: 'kroppsvard',
  traningsklader: 'klader',
  traningsutrustning: 'redskap',
};

export const kindForCategory = (category: string | undefined): ProductKind | undefined => (category ? BY_CATEGORY[category] : undefined);

export function kindOf(product: Pick<Product, 'kind' | 'category'>): ProductKind {
  return product.kind ?? kindForCategory(product.category) ?? 'kosttillskott';
}

/** Mat och dryck: ingredienser, allergener och näringsvärde. */
export const isFood = (kind: ProductKind) => kind === 'dryck' || kind === 'livsmedel' || kind === 'kosttillskott';

/** Rubrikerna på produktsidan för varje typ. Samma fält i databasen, olika namn för kunden. */
export function sectionLabels(kind: ProductKind) {
  switch (kind) {
    case 'klader':
      return { usage: 'Skötselråd', ingredients: 'Material' };
    case 'redskap':
      return { usage: 'Användning', ingredients: 'Material' };
    case 'kroppsvard':
      return { usage: 'Användning', ingredients: 'Innehåll (INCI)' };
    default:
      return { usage: 'Användning', ingredients: 'Ingredienser och näringsvärde' };
  }
}
