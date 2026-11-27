/**
 * Produkttyper: styr moms och vilka fält en produkt har (ingredienser, material, storleksguide …).
 * Standardtyperna finns här. Nya typer skapas i Admin → Katalog → Produkttyper och fält och sparas i databasen.
 * Listan delas av butiken och servern.
 */

export type VatClass = 'vat-food' | 'vat-standard';

export interface ProductTypeFields {
  /** Text om användning, eller skötselråd för kläder. */
  usage: 'usage' | 'care' | 'off';
  /** Innehåll: ingredienser (mat), material (kläder, utrustning) eller INCI (kroppsvård). */
  contents: 'ingredients' | 'material' | 'inci' | 'off';
  allergens: boolean;
  nutrition: boolean;
  warnings: boolean;
  sizeGuide: boolean;
  /** Pant per förpackning kan väljas (drycker). */
  deposit: boolean;
  /** Den lagstadgade texten för kosttillskott visas på produktsidan. */
  supplementWarning: boolean;
}

export interface ProductTypeDef {
  id: string;
  name: string;
  vat: VatClass;
  fields: ProductTypeFields;
  /** Standardtyp som inte kan tas bort. */
  builtIn?: boolean;
}

const food = (extra: Partial<ProductTypeFields> = {}): ProductTypeFields => ({
  usage: 'usage',
  contents: 'ingredients',
  allergens: true,
  nutrition: true,
  warnings: true,
  sizeGuide: false,
  deposit: false,
  supplementWarning: false,
  ...extra,
});

export const defaultProductTypes: ProductTypeDef[] = [
  { id: 'kosttillskott', name: 'Kosttillskott', vat: 'vat-food', builtIn: true, fields: food({ supplementWarning: true }) },
  { id: 'livsmedel', name: 'Livsmedel', vat: 'vat-food', builtIn: true, fields: food() },
  { id: 'dryck', name: 'Dryck', vat: 'vat-food', builtIn: true, fields: food({ deposit: true }) },
  {
    id: 'kroppsvard',
    name: 'Kroppsvård',
    vat: 'vat-standard',
    builtIn: true,
    fields: { usage: 'usage', contents: 'inci', allergens: false, nutrition: false, warnings: true, sizeGuide: false, deposit: false, supplementWarning: false },
  },
  {
    id: 'klader',
    name: 'Kläder',
    vat: 'vat-standard',
    builtIn: true,
    fields: { usage: 'care', contents: 'material', allergens: false, nutrition: false, warnings: false, sizeGuide: true, deposit: false, supplementWarning: false },
  },
  {
    id: 'redskap',
    name: 'Träningsutrustning',
    vat: 'vat-standard',
    builtIn: true,
    fields: { usage: 'usage', contents: 'material', allergens: false, nutrition: false, warnings: false, sizeGuide: false, deposit: false, supplementWarning: false },
  },
];

/** Alla typer som gäller just nu (standardtyperna plus de från databasen). */
export const productTypes: ProductTypeDef[] = defaultProductTypes.map((t) => ({ ...t, fields: { ...t.fields } }));

export function replaceProductTypes(list: ProductTypeDef[]) {
  if (!Array.isArray(list) || list.length === 0) return;
  productTypes.splice(0, productTypes.length, ...list);
}

export const getProductType = (id?: string) => productTypes.find((t) => t.id === id);

/** Mat och dryck: ingredienser, allergener och näringsvärde. */
export const isFoodType = (t?: ProductTypeDef) => Boolean(t && (t.fields.nutrition || t.fields.contents === 'ingredients'));

export const USAGE_LABEL = { usage: 'Användning', care: 'Skötselråd', off: '' } as const;
export const CONTENTS_LABEL = { ingredients: 'Ingredienser och näringsvärde', material: 'Material', inci: 'Innehåll (INCI)', off: '' } as const;
