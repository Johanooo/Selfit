import { findVariant } from '@/data/products';
import type { Product, Variant } from '@/data/types';
import { depositTotal } from './format';

export const FREE_SHIPPING_THRESHOLD = 499;
export const SHIPPING = { ombud: 49, hem: 79 } as const;
export type DeliveryMethod = keyof typeof SHIPPING;

/** Mock discount codes – demo only, nothing is validated server-side. */
export const DISCOUNT_CODES: Record<string, { rate: number; label: string }> = {
  SELFIT10: { rate: 0.1, label: '10 % rabatt på produkter' },
};

export interface CartLine {
  variantId: string;
  qty: number;
}

export interface ResolvedLine extends CartLine {
  product: Product;
  variant: Variant;
  lineTotal: number;
  deposit: number;
}

export function resolveLines(lines: CartLine[]): ResolvedLine[] {
  return lines.flatMap((l) => {
    const hit = findVariant(l.variantId);
    if (!hit) return [];
    return [
      {
        ...l,
        product: hit.product,
        variant: hit.variant,
        lineTotal: hit.variant.price * l.qty,
        deposit: depositTotal(hit.variant) * l.qty,
      },
    ];
  });
}

export interface Totals {
  subtotal: number;
  discount: number;
  deposit: number;
  shipping: number;
  total: number;
  vat: number;
  remainingForFree: number;
  itemCount: number;
}

export function computeTotals(
  lines: ResolvedLine[],
  code: string | null,
  method: DeliveryMethod = 'ombud',
): Totals {
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const rate = code ? (DISCOUNT_CODES[code]?.rate ?? 0) : 0;
  const discount = Math.round(subtotal * rate * 100) / 100;
  const deposit = lines.reduce((s, l) => s + l.deposit, 0);
  const afterDiscount = subtotal - discount;
  const free = afterDiscount >= FREE_SHIPPING_THRESHOLD;
  const shipping = lines.length === 0 ? 0 : method === 'ombud' ? (free ? 0 : SHIPPING.ombud) : free ? 39 : SHIPPING.hem;
  const vatGoods = lines.reduce((s, l) => {
    const share = subtotal ? l.lineTotal / subtotal : 0;
    const net = l.lineTotal - discount * share;
    return s + (net * l.product.vatRate) / (1 + l.product.vatRate);
  }, 0);
  const vat = vatGoods + ((shipping + deposit) * 0.25) / 1.25;
  return {
    subtotal,
    discount,
    deposit,
    shipping,
    total: afterDiscount + deposit + shipping,
    vat,
    remainingForFree: Math.max(0, FREE_SHIPPING_THRESHOLD - afterDiscount),
    itemCount: lines.reduce((s, l) => s + l.qty, 0),
  };
}
