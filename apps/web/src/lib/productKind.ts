import { getCategory, DEFAULT_CATEGORY_TYPES } from '@/data/categories';
import { CONTENTS_LABEL, getProductType, isFoodType, USAGE_LABEL, type ProductTypeDef } from '@/data/productTypes';
import type { Product } from '@/data/types';

/** Produkttyp för en huvudkategori (väljs i Admin → Kategorier). */
export const kindForCategory = (category: string | undefined): string | undefined =>
  category ? getCategory(category)?.productType ?? DEFAULT_CATEGORY_TYPES[category] : undefined;

/** Produktens typ: sparad på produkten, annars kategorins. */
export function typeOf(product: Pick<Product, 'kind' | 'category'>): ProductTypeDef | undefined {
  return getProductType(product.kind) ?? getProductType(kindForCategory(product.category));
}

export function kindOf(product: Pick<Product, 'kind' | 'category'>): string {
  return typeOf(product)?.id ?? product.kind ?? 'kosttillskott';
}

/** Mat och dryck: ingredienser, allergener och näringsvärde. */
export const isFood = (kind: string) => isFoodType(getProductType(kind));

/** Rubrikerna på produktsidan för typen. */
export function sectionLabels(kind: string) {
  const t = getProductType(kind);
  return {
    usage: t ? USAGE_LABEL[t.fields.usage] || 'Användning' : 'Användning',
    ingredients: t ? CONTENTS_LABEL[t.fields.contents] || 'Innehåll' : 'Ingredienser och näringsvärde',
  };
}
