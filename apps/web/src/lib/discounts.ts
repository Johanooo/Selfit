/**
 * Rabatter i butiken. Reglerna kommer från servern (Admin → Rabatter).
 * Servern avgör om en kod får användas, här räknas bara beloppet ut.
 */

export interface DiscountRule {
  code: string | null;
  title: string;
  label: string;
  method: 'code' | 'automatic';
  kind: 'products' | 'order' | 'shipping';
  valueType: 'percent' | 'fixed';
  /** Procent eller kronor. */
  value: number;
  appliesTo: { type: 'all' | 'categories' | 'products'; categories: string[]; products: string[] };
  minType: 'none' | 'amount' | 'quantity';
  /** Kronor eller antal artiklar. */
  minValue: number;
  /** Koden gäller vissa kunder. Kontrolleras igen i kassan med e-postadressen. */
  needsEmail: boolean;
}

interface LineLike {
  qty: number;
  lineTotal: number;
  product: { slug: string; category: string; subcategory?: string; alsoIn?: string[] };
}

export interface DiscountResult {
  rule: DiscountRule;
  amount: number;
  freeShipping: boolean;
  /** Andel av rabatten per rad (samma ordning som raderna), för momsen. */
  perLine: number[];
  /** Text när köpkravet inte är uppfyllt, annars null. */
  unmet: string | null;
}

const kr = (n: number) => `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(n)} kr`;
const round = (n: number) => Math.round(n * 100) / 100;

export function lineMatches(rule: DiscountRule, line: LineLike) {
  if (rule.kind !== 'products' || rule.appliesTo.type === 'all') return true;
  const p = line.product;
  if (rule.appliesTo.type === 'products') return rule.appliesTo.products.includes(p.slug);
  const cats = [p.category, p.subcategory, ...(p.alsoIn ?? [])].filter(Boolean) as string[];
  return cats.some((c) => rule.appliesTo.categories.includes(c));
}

export function applyDiscount(rule: DiscountRule, lines: LineLike[]): DiscountResult {
  const matches = lines.map((l) => lineMatches(rule, l));
  const base = lines.reduce((s, l, i) => s + (matches[i] ? l.lineTotal : 0), 0);
  const qty = lines.reduce((s, l, i) => s + (matches[i] ? l.qty : 0), 0);
  const none = { rule, amount: 0, freeShipping: false, perLine: lines.map(() => 0) };
  const scope = rule.kind === 'products' && rule.appliesTo.type !== 'all' ? ' av de utvalda produkterna' : '';
  if (rule.minType === 'amount' && base < rule.minValue) return { ...none, unmet: `Handla${scope} för ${kr(round(rule.minValue - base))} till för att få ${rule.label.toLowerCase()}.` };
  if (rule.minType === 'quantity' && qty < rule.minValue) return { ...none, unmet: `Lägg till ${rule.minValue - qty} st till${scope} för att få ${rule.label.toLowerCase()}.` };
  if (base <= 0) return { ...none, unmet: rule.kind === 'products' ? 'Rabatten gäller inte varorna i din varukorg.' : null };
  if (rule.kind === 'shipping') return { ...none, freeShipping: true, unmet: null };
  const amount = round(Math.min(base, rule.valueType === 'percent' ? (base * rule.value) / 100 : rule.value));
  const perLine = lines.map((l, i) => (matches[i] ? (amount * l.lineTotal) / base : 0));
  return { rule, amount, freeShipping: false, perLine, unmet: null };
}

/**
 * Väljer koden om kunden skrivit in en, annars den automatiska rabatt som ger lägst totalpris.
 * freightFor ger fraktpriset för varornas värde efter rabatt. Då räknas det rätt även när
 * en rabatt gör att ordern hamnar under gränsen för fri frakt, eller när frakten redan är fri.
 */
export function pickDiscount(lines: LineLike[], code: DiscountRule | null, automatic: DiscountRule[], freightFor: (goodsAfterDiscount: number) => number): DiscountResult | null {
  if (code) return applyDiscount(code, lines);
  const results = automatic.map((r) => applyDiscount(r, lines)).filter((r) => !r.unmet && (r.amount > 0 || r.freeShipping));
  if (!results.length) return null;
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const pay = (r: DiscountResult) => subtotal - r.amount + (r.freeShipping ? 0 : freightFor(subtotal - r.amount));
  const best = results.sort((a, b) => pay(a) - pay(b))[0];
  // En rabatt som inte sänker priset alls (t.ex. fri frakt när frakten redan är fri) visas inte.
  return pay(best) < subtotal + freightFor(subtotal) ? best : null;
}
