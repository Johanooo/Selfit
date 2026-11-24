import type { DeliveryMethod, Totals } from './cart-math';
import { readJSON, writeJSON } from './storage';

const KEY = 'selfit-last-order';

/** Demo order snapshot. Contains no personal data. */
export interface DemoOrder {
  number: string;
  createdAt: string;
  delivery: DeliveryMethod;
  lines: { variantId: string; qty: number; lineTotal: number }[];
  totals: Totals;
  code: string | null;
}

export function makeOrderNumber(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `SF${n}`;
}

export const saveOrder = (o: DemoOrder) => writeJSON(KEY, o, 'session');
export const loadOrder = () => readJSON<DemoOrder | null>(KEY, null, 'session');

export const ORDER_PATTERN = '^[Ss][Ff]\\s?\\d{6}$';

/** Deterministic demo tracking data from an order number. */
export function demoTracking(order: string) {
  const digits = order.replace(/\D/g, '').padStart(6, '0');
  const seed = Number(digits);
  const stage = seed % 4; // 0..3
  return {
    carrier: seed % 2 === 0 ? 'PostNord' : 'DHL Freight',
    trackingNumber: `00373500${digits}${(seed % 97).toString().padStart(2, '0')}`,
    stage: Math.max(1, stage),
  };
}
