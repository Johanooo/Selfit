import { findVariant } from '@/data/products';
import type { Product, Variant } from '@/data/types';
import { depositTotal } from './format';
import { pickDiscount, type DiscountRule } from './discounts';

export const FREE_SHIPPING_THRESHOLD = 499;
export const SHIPPING = { ombud: 49, hem: 79 } as const;
export type DeliveryMethod = keyof typeof SHIPPING;


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
  /** T.ex. "VALKOMMEN10 · 10 % på hela ordern". Null om ingen rabatt gäller. */
  discountLabel: string | null;
  /** Varför koden inte ger rabatt än (köpkrav), annars null. */
  discountNote: string | null;
  deposit: number;
  shipping: number;
  total: number;
  vat: number;
  remainingForFree: number;
  itemCount: number;
}

export interface DiscountInput {
  code: DiscountRule | null;
  automatic: DiscountRule[];
}

export function computeTotals(lines: ResolvedLine[], discounts: DiscountInput | null, method: DeliveryMethod = 'ombud'): Totals {
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const deposit = lines.reduce((s, l) => s + l.deposit, 0);
  const picked = discounts ? pickDiscount(lines, discounts.code, discounts.automatic, SHIPPING[method]) : null;
  const discount = picked?.amount ?? 0;
  const afterDiscount = subtotal - discount;
  const free = afterDiscount >= FREE_SHIPPING_THRESHOLD;
  let shipping = lines.length === 0 ? 0 : method === 'ombud' ? (free ? 0 : SHIPPING.ombud) : free ? 39 : SHIPPING.hem;
  if (picked?.freeShipping) shipping = 0;
  const vatGoods = lines.reduce((s, l, i) => {
    const net = l.lineTotal - (picked?.perLine[i] ?? 0);
    return s + (net * l.product.vatRate) / (1 + l.product.vatRate);
  }, 0);
  const vat = vatGoods + ((shipping + deposit) * 0.25) / 1.25;
  const active = picked && !picked.unmet;
  return {
    subtotal,
    discount,
    discountLabel: active ? `${picked.rule.title} · ${picked.rule.label}` : null,
    discountNote: picked?.unmet ?? null,
    deposit,
    shipping,
    total: afterDiscount + deposit + shipping,
    vat,
    remainingForFree: Math.max(0, FREE_SHIPPING_THRESHOLD - afterDiscount),
    itemCount: lines.reduce((s, l) => s + l.qty, 0),
  };
}
