import type { Product, Variant } from '@/data/types';
import { getFlavour } from '@/data/products';

const nf0 = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfL = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 });

/** "149 kr" – shows öre only when the amount is not whole. */
export function kr(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return `${Number.isInteger(rounded) ? nf0.format(rounded) : nf2.format(rounded)} kr`;
}

const UNIT_LABEL = { l: 'l', kg: 'kg', st: 'st' } as const;

/** "75 kr/l" */
export function comparison(v: Variant): string | null {
  if (!v.measure || v.measure.amount <= 0) return null;
  const per = v.price / v.measure.amount;
  const value = per < 10 ? nf2.format(per) : nf0.format(Math.round(per));
  return `${value} kr/${UNIT_LABEL[v.measure.unit]}`;
}

export function litres(amount: number): string {
  return `${nfL.format(amount)} l`;
}

export function packLabel(pack?: number): string {
  return pack ? `${pack}-pack` : '';
}

export function variantLabel(product: Product, v: Variant): string {
  const parts: string[] = [];
  const f = getFlavour(v.flavour);
  if (f) parts.push(f.name);
  if (v.pack) parts.push(packLabel(v.pack));
  if (v.options) parts.push(...(product.optionNames ?? Object.keys(v.options)).map((n) => v.options![n]).filter(Boolean));
  if (!parts.length) parts.push(product.sizeLabel);
  return parts.join(' · ');
}

export function depositTotal(v: Variant): number {
  return v.depositPerUnit * (v.pack ?? 1);
}

export type StockState = 'in' | 'low' | 'out' | 'unavailable';
export function stockState(v: Variant): StockState {
  if (!v.offered) return 'unavailable';
  if (v.stock <= 0) return 'out';
  if (v.stock <= 5) return 'low';
  return 'in';
}
export function stockText(v: Variant): string {
  switch (stockState(v)) {
    case 'unavailable':
      return 'Finns inte i denna förpackning';
    case 'out':
      return 'Slut i lager';
    case 'low':
      return `Få kvar – ${v.stock} st i lager`;
    default:
      return 'I lager';
  }
}
export const isBuyable = (v?: Variant) => !!v && v.offered && v.stock > 0;
