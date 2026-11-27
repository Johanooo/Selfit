/**
 * Kopplar ihop kategorier och produkter: vilka produkter som hör till en kategori,
 * och vilka kategorier som ska synas i menyn.
 */
import { categories, getSubcategory, SHOW_EMPTY_CATEGORIES, subcategoriesOf } from './categories';
import { products } from './products';
import type { Product } from './types';

/** Alla underkategorier en produkt finns i (huvudplats + extra platser). */
const subsOf = (p: Product) => [p.subcategory, ...(p.alsoIn ?? [])].filter(Boolean) as string[];

/** Produkter i en huvud- eller underkategori. */
export function productsIn(slug: string): Product[] {
  return products.filter(
    (p) => p.category === slug || subsOf(p).some((s) => s === slug || getSubcategory(s)?.parent === slug),
  );
}

export const visibleCategories = () =>
  categories.filter((c) => !c.hidden && (SHOW_EMPTY_CATEGORIES || productsIn(c.slug).length > 0));

export const visibleSubcategoriesOf = (parent: string) =>
  subcategoriesOf(parent).filter((sc) => !sc.hidden && (SHOW_EMPTY_CATEGORIES || productsIn(sc.slug).length > 0));

/** Kategorier som faktiskt har produkter, t.ex. för rutorna på startsidan. */
export const filledCategories = () => categories.filter((c) => !c.hidden && productsIn(c.slug).length > 0);
export const filledSubcategoriesOf = (parent: string) =>
  subcategoriesOf(parent).filter((sc) => productsIn(sc.slug).length > 0);
