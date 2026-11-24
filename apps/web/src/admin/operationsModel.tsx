import { createContext, useContext, type ReactNode } from 'react';
import { useAdminListState } from './adminInteractions';
import { orderRows, type OrderRow } from './mockData';

export const demoToday = '2026-11-24';
export const warehouses = [{ id: 'dsv', name: 'DSV · Jönköping' }, { id: 'own', name: 'Eget lager · Stockholm' }];
export const warehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? id;
export const money = (value: number) => `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(value)} kr`;
export type Variant = { sku: string; productSlug: string; name: string; flavour: string; pack: number; price: number; cost: number; vat: number; deposit: number };
export type Batch = { id: string; sku: string; warehouse: string; code: string; expiry: string; quantity: number; status: 'Säljbar' | 'Spärrad' | 'Kasserad'; reason?: string };
export type Policy = { sku: string; warehouse: string; point: number; orderQuantity: number; reserved: number };
export type Ledger = { id: string; sku: string; warehouse: string; date: string; event: string; quantity: number; after: number; reason: string; reference: string; href: string; actor: string };
export type Transfer = { id: string; from: string; to: string; status: 'Utkast' | 'Skickad (på väg)' | 'Delvis mottagen' | 'Mottagen'; lines: { batchId: string; sku: string; batch: string; expiry: string; quantity: number; received: number }[] };
export type Receipt = { id: string; date: string; actor: string; lines: { sku: string; quantity: number; batch: string; expiry: string; discrepancy: string }[] };
export type Purchase = { id: string; supplier: string; warehouse: string; expected: string; status: 'Utkast' | 'Skickad' | 'Delvis mottagen' | 'Mottagen'; advised: boolean; receipts?: Receipt[]; lines: { sku: string; quantity: number; cost: number; received: number; batch: string; expiry: string; discrepancy: string }[] };
export type Count = { id: string; warehouse: string; scope: string; date: string; status: 'Pågår' | 'Godkänd'; lines: { batchId: string; sku: string; batch: string; expected: number; counted: number | null }[] };
export type OpsOrder = OrderRow & { kind: 'Webborder' | 'Manuell' | 'Byte'; warehouse: string; lines: { sku: string; quantity: number }[]; address: string; holdReason: string; previousStatus: string; originalOrder?: string; returnId?: string; reason?: string; events: string[]; refunds?: { amount: number; reason: string; actor: string; date: string }[] };
export type ReturnCase = { id: string; orderId: string; sku: string; quantity: number; reason: string; status: string; outcome: 'Återbetalning' | 'Byte'; exchangeSku: string; exchangeOrderId?: string; disposition: string };
export type Operations = { variants: Variant[]; batches: Batch[]; policies: Policy[]; ledger: Ledger[]; transfers: Transfer[]; purchases: Purchase[]; counts: Count[]; orders: OpsOrder[]; returns: ReturnCase[]; shortDays: number; role: string };
export type Balance = { available: number; reserved: number; blocked: number; transit: number; incoming: number; point: number; orderQuantity: number };

const flavours = [['BL', 'Blåbär'], ['JO', 'Jordgubb'], ['BM', 'Bärmix'], ['MP', 'Mango & passionsfrukt'], ['GA', 'Grönt äpple'], ['BE', 'Black Edition']];
const variants: Variant[] = flavours.flatMap(([code, flavour]) => [6, 12, 24].map((pack) => ({
  sku: `PWO-${code}-${String(pack).padStart(2, '0')}`, productSlug: 'pwo-plus', name: 'PWO+ Pre-workout', flavour, pack,
  price: pack === 6 ? 149 : pack === 12 ? 279 : 529, cost: pack === 6 ? 62 : pack === 12 ? 112 : 220, vat: 12, deposit: pack,
}))).concat([
  { sku: 'PRO-PAN-BL', productSlug: 'protein-pannkakor', name: 'Protein pannkakor', flavour: 'Blåbär', pack: 1, price: 129, cost: 55, vat: 12, deposit: 0 },
  { sku: 'PRO-PAN-JO', productSlug: 'protein-pannkakor', name: 'Protein pannkakor', flavour: 'Jordgubb', pack: 1, price: 129, cost: 55, vat: 12, deposit: 0 },
  { sku: 'KRE-300', productSlug: 'kreatin-monohydrat', name: 'Kreatin Monohydrat', flavour: 'Neutral · 300 g', pack: 1, price: 249, cost: 105, vat: 12, deposit: 0 },
  { sku: 'DVT-050', productSlug: 'd-vitamin-50', name: 'D-vitamin 50 µg', flavour: '90 kapslar', pack: 1, price: 89, cost: 29, vat: 12, deposit: 0 },
  { sku: 'OMG-120', productSlug: 'omega-3', name: 'Omega-3 Fiskolja', flavour: 'Neutral', pack: 1, price: 189, cost: 75, vat: 12, deposit: 0 },
  { sku: 'OMG-360', productSlug: 'omega-3', name: 'Omega-3 Fiskolja', flavour: 'Neutral', pack: 3, price: 499, cost: 200, vat: 12, deposit: 0 },
  { sku: 'FUK-01', productSlug: 'fuktkram-ansikte', name: 'Fuktkräm Ansikte', flavour: '50 ml', pack: 1, price: 229, cost: 90, vat: 25, deposit: 0 },
]);
const batches: Batch[] = variants.flatMap((v, i) => warehouses.map((w) => ({
  id: `${v.sku}-${w.id}`, sku: v.sku, warehouse: w.id, code: `SF2611-${i + 1}-${w.id}`, expiry: '2027-08-31',
  quantity: i === 0 ? (w.id === 'dsv' ? 4 : 2) : w.id === 'own' ? 8 : 35 + i,
  status: 'Säljbar' as const,
})));
batches.push(
  { id: 'short-blue', sku: 'PWO-BL-12', warehouse: 'own', code: 'PWO2610-K', expiry: '2026-12-08', quantity: 12, status: 'Säljbar' },
  { id: 'expired-vitamin', sku: 'DVT-050', warehouse: 'dsv', code: 'DV2603', expiry: '2026-11-18', quantity: 9, status: 'Spärrad', reason: 'Bäst före har passerats' },
  { id: 'blocked-creatine', sku: 'KRE-300', warehouse: 'own', code: 'KR2611-K', expiry: '2027-07-01', quantity: 6, status: 'Spärrad', reason: 'Inväntar kvalitetskontroll' },
);
function initialState(): Operations {
  const policies = variants.flatMap((v) => warehouses.map((w) => ({ sku: v.sku, warehouse: w.id, point: w.id === 'dsv' ? 10 : 4, orderQuantity: w.id === 'dsv' ? 48 : 12, reserved: v.sku === 'PWO-BL-12' && w.id === 'dsv' ? 2 : 0 })));
  const result: Operations = {
    variants, batches, policies, shortDays: 30, role: 'Admin',
    transfers: [{ id: 'FL-2611-008', from: 'own', to: 'dsv', status: 'Mottagen', lines: [{ batchId: 'KRE-300-own', sku: 'KRE-300', batch: 'SF2611-21-own', expiry: '2027-08-31', quantity: 6, received: 6 }] }],
    counts: [{ id: 'INV-2611-012', warehouse: 'own', scope: 'Urval · KRE-300', date: '2026-11-18', status: 'Godkänd', lines: [{ batchId: 'KRE-300-own', sku: 'KRE-300', batch: 'SF2611-21-own', expected: 8, counted: 8 }] }],
    purchases: [
      { id: 'PO-2611-018', supplier: 'SELFIT Nutrition AB', warehouse: 'dsv', expected: '2026-11-27', status: 'Skickad', advised: true, lines: [{ sku: 'PWO-BL-06', quantity: 48, cost: 62, received: 0, batch: '', expiry: '', discrepancy: '' }] },
      { id: 'PO-2611-016', supplier: 'Nordic Nutrition AB', warehouse: 'own', expected: '2026-11-25', status: 'Delvis mottagen', advised: true, lines: [{ sku: 'KRE-300', quantity: 40, cost: 105, received: 20, batch: 'KR2611A', expiry: '2027-08-31', discrepancy: '20 st återstår' }] },
    ],
    ledger: [
      { id: 'lg1', sku: 'PWO-BL-12', warehouse: 'dsv', date: '2026-11-24 09:42', event: 'Reservation', quantity: -2, after: 34, reason: 'Order mottagen', reference: 'SF-261120-0842', href: '/admin/order/SF-261120-0842', actor: 'Butik (exempel)' },
      ...['Försäljning', 'Inleverans', 'Retur', 'Justering', 'Flytt', 'Inventering'].map((event, i) => ({ id: `history-${i}`, sku: 'PWO-BL-12', warehouse: i % 2 ? 'own' : 'dsv', date: `2026-11-${String(23 - i).padStart(2, '0')} 10:00`, event, quantity: i % 2 ? 5 : -1, after: 36 + i, reason: ['Levererad order', 'Mottagen leverans', 'Godkänd retur', 'Ominventering', 'Mottagen lagerflytt', 'Godkänd räkning'][i], reference: i === 1 ? 'PO-2611-018' : i === 2 ? 'RET-2611-018' : 'SF-261120-0842', href: i === 1 ? '/admin/inkop/PO-2611-018' : i === 2 ? '/admin/returer/RET-2611-018' : '/admin/order/SF-261120-0842', actor: i % 2 ? 'Ella Svensson' : 'DSV (exempel)' })),
    ],
    orders: orderRows.map((o, i) => ({ ...o, sku: o.sku === 'PWO-MA-24' ? 'PWO-MP-24' : o.sku === 'PWO-ST-12' ? 'PWO-JO-12' : o.sku === 'SHA-600' ? 'KRE-300' : o.sku, kind: 'Webborder', warehouse: i % 2 ? 'own' : 'dsv', lines: [{ sku: i === 0 ? 'PWO-BL-12' : o.sku === 'PWO-MA-24' ? 'PWO-MP-24' : o.sku === 'PWO-ST-12' ? 'PWO-JO-12' : o.sku === 'SHA-600' ? 'KRE-300' : o.sku, quantity: 1 }, ...(i === 0 ? [{ sku: 'KRE-300', quantity: 1 }] : [])], address: 'Sankt Eriksgatan 42, 112 34 Stockholm', holdReason: '', previousStatus: '', events: ['Order mottagen · 24 nov 2026 · Butik (exempel)'] })),
    returns: [
      { id: 'RET-2611-018', orderId: 'SF-261120-0842', sku: 'PWO-BL-12', quantity: 1, reason: 'Fel smak beställd', status: 'Granskas', outcome: 'Återbetalning', exchangeSku: 'PWO-JO-12', disposition: 'Åter i lager' },
      { id: 'RET-2611-017', orderId: 'SF-261120-0834', sku: 'PWO-MP-24', quantity: 1, reason: 'Skadad förpackning', status: 'Granskas', outcome: 'Återbetalning', exchangeSku: 'PWO-MP-24', disposition: 'Kassera' },
    ],
  };
  result.policies.forEach((p) => { p.reserved = 0; });
  result.orders.forEach((o) => {
    o.amount = orderValue(result, o.lines);
    if (o.id === 'SF-261120-0817') { o.previousStatus = o.status; o.status = 'Pausad'; o.holdReason = 'Adressfel'; }
    if (['Att plocka', 'Packas', 'Pausad'].includes(o.status)) o.lines.forEach((l) => {
      const p = result.policies.find((p) => p.sku === l.sku && p.warehouse === o.warehouse);
      if (p) p.reserved += l.quantity;
    });
  });
  return result;
}
type OpsContext = { state: Operations; commit: <T>(change: (draft: Operations) => T) => T };
const Context = createContext<OpsContext | null>(null);
export function OperationsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useAdminListState('operations-v1', 'state', initialState());
  const commit = <T,>(change: (draft: Operations) => T): T => {
    const draft = structuredClone(state);
    const result = change(draft);
    setState(draft);
    return result;
  };
  return <Context.Provider value={{ state, commit }}>{children}</Context.Provider>;
}
export function useOperations() { const value = useContext(Context); if (!value) throw new Error('Adminens lokala exempeldata saknas.'); return value; }
export function variantLabel(v?: Variant) { return v ? `${v.name} · ${v.flavour} · ${v.pack === 1 ? 'Standard' : `${v.pack}-pack`}` : 'Okänd variant'; }
export function batchStatus(state: Operations, batch: Batch): 'Säljbar' | 'Kortdaterad' | 'Spärrad' | 'Kasserad' {
  if (batch.status === 'Kasserad') return 'Kasserad';
  if (batch.status === 'Spärrad' || batch.expiry < demoToday) return 'Spärrad';
  const days = (Date.parse(batch.expiry) - Date.parse(demoToday)) / 86400000;
  return days <= state.shortDays ? 'Kortdaterad' : 'Säljbar';
}
export function balance(state: Operations, sku: string, warehouse: string): Balance {
  const matching = state.batches.filter((b) => b.sku === sku && b.warehouse === warehouse);
  const policy = state.policies.find((p) => p.sku === sku && p.warehouse === warehouse);
  const saleable = matching.filter((b) => ['Säljbar', 'Kortdaterad'].includes(batchStatus(state, b))).reduce((sum, b) => sum + b.quantity, 0);
  const transit = state.transfers.filter((t) => t.to === warehouse && t.status !== 'Utkast').flatMap((t) => t.lines).filter((l) => l.sku === sku).reduce((s, l) => s + l.quantity - l.received, 0);
  const incoming = state.purchases.filter((p) => p.warehouse === warehouse && p.status !== 'Utkast').flatMap((p) => p.lines).filter((l) => l.sku === sku).reduce((s, l) => s + l.quantity - l.received, 0);
  return { available: Math.max(0, saleable - (policy?.reserved ?? 0)), reserved: policy?.reserved ?? 0, blocked: matching.filter((b) => batchStatus(state, b) === 'Spärrad').reduce((s, b) => s + b.quantity, 0), transit, incoming, point: policy?.point ?? 0, orderQuantity: policy?.orderQuantity ?? 12 };
}
export function ledgerEntry(state: Operations, sku: string, warehouse: string, event: string, quantity: number, reason: string, reference = 'Manuell åtgärd', href = '') {
  state.ledger.unshift({ id: crypto.randomUUID(), sku, warehouse, date: `${demoToday} ${new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`, event, quantity, after: balance(state, sku, warehouse).available, reason, reference, href, actor: 'Ella Svensson' });
}
export function adjustStock(state: Operations, sku: string, warehouse: string, quantity: number, reason: string, comment = '', event = 'Justering') {
  if (!Number.isInteger(quantity) || quantity === 0 || !reason.trim()) throw new Error('Ange ett heltal skilt från noll och välj orsak.');
  if (quantity < 0 && balance(state, sku, warehouse).available < -quantity) throw new Error('Justeringen får inte ge negativt tillgängligt saldo.');
  if (quantity > 0) {
    const batch = state.batches.find((b) => b.sku === sku && b.warehouse === warehouse && batchStatus(state, b) === 'Säljbar');
    if (batch) batch.quantity += quantity;
    else state.batches.push({ id: crypto.randomUUID(), sku, warehouse, code: `JUS-${Date.now()}`, expiry: '2027-11-30', quantity, status: 'Säljbar' });
  } else {
    let left = -quantity;
    for (const b of state.batches.filter((b) => b.sku === sku && b.warehouse === warehouse && ['Säljbar', 'Kortdaterad'].includes(batchStatus(state, b))).sort((a, b) => a.expiry.localeCompare(b.expiry))) {
      const n = Math.min(left, b.quantity); b.quantity -= n; left -= n; if (!left) break;
    }
  }
  ledgerEntry(state, sku, warehouse, event, quantity, `${reason}${comment ? ` · ${comment}` : ''}`);
}
export function changeBatch(state: Operations, id: string, action: 'Kassera' | 'Frisläpp spärr', reason: string) {
  if (!reason.trim()) throw new Error('Ange en orsak.');
  const b = state.batches.find((item) => item.id === id)!;
  if (action === 'Frisläpp spärr' && b.expiry < demoToday) throw new Error('Utgångna partier kan inte frisläppas eller säljas.');
  if (action === 'Frisläpp spärr' && b.status === 'Kasserad') throw new Error('Ett kasserat parti kan inte frisläppas.');
  const n = b.quantity;
  b.status = action === 'Kassera' ? 'Kasserad' : 'Säljbar'; b.reason = reason;
  if (action === 'Kassera') b.quantity = 0;
  ledgerEntry(state, b.sku, b.warehouse, 'Justering', action === 'Kassera' ? -n : n, `${action}: ${reason}`, b.code, `/admin/partier/${b.id}`);
}
export function createTransfer(state: Operations, input: Omit<Transfer, 'id' | 'status'>) {
  if (input.from === input.to || !input.lines.length) throw new Error('Välj olika lager och minst en variant.');
  for (const l of input.lines) {
    const b = state.batches.find((b) => b.id === l.batchId);
    if (!b || b.warehouse !== input.from || !['Säljbar', 'Kortdaterad'].includes(batchStatus(state, b)) || !Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > b.quantity || l.quantity > balance(state, l.sku, input.from).available) throw new Error('Kontrollera batch, antal och tillgängligt saldo.');
  }
  const id = `FL-${Date.now()}`; state.transfers.unshift({ ...input, id, status: 'Utkast' }); return id;
}
export function sendTransfer(state: Operations, id: string) {
  const t = state.transfers.find((t) => t.id === id)!;
  if (t.status !== 'Utkast') throw new Error('Flytten är redan skickad.');
  for (const l of t.lines) {
    const b = state.batches.find((b) => b.id === l.batchId)!;
    if (b.quantity < l.quantity || !['Säljbar', 'Kortdaterad'].includes(batchStatus(state, b)) || balance(state, l.sku, t.from).available < l.quantity) throw new Error('Batchen har inte tillräckligt säljbart saldo.');
    b.quantity -= l.quantity;
    ledgerEntry(state, l.sku, t.from, 'Flytt', -l.quantity, 'Skickad till annat lager', id, `/admin/flyttar/${id}`);
  }
  t.status = 'Skickad (på väg)';
}
export function receiveTransfer(state: Operations, id: string, quantities: number[]) {
  const t = state.transfers.find((t) => t.id === id)!;
  if (t.status === 'Utkast' || t.status === 'Mottagen') throw new Error('Flytten kan inte mottas i denna status.');
  if (!quantities.some((n) => n > 0)) throw new Error('Ange mottaget antal.');
  t.lines.forEach((l, i) => {
    const n = quantities[i] ?? 0;
    if (!Number.isInteger(n) || n < 0 || n > l.quantity - l.received) throw new Error('Antalet överstiger återstående antal.');
    if (n) {
      l.received += n;
      const b = state.batches.find((b) => b.warehouse === t.to && b.code === l.batch && b.sku === l.sku && b.status !== 'Kasserad');
      if (b) b.quantity += n; else state.batches.push({ id: crypto.randomUUID(), sku: l.sku, warehouse: t.to, code: l.batch, expiry: l.expiry, quantity: n, status: 'Säljbar' });
      ledgerEntry(state, l.sku, t.to, 'Flytt', n, 'Mottagen lagerflytt', id, `/admin/flyttar/${id}`);
    }
  });
  t.status = t.lines.every((l) => l.received === l.quantity) ? 'Mottagen' : 'Delvis mottagen';
}
export function approveCount(state: Operations, id: string) {
  const c = state.counts.find((c) => c.id === id)!;
  if (c.status === 'Godkänd') throw new Error('Inventeringen är redan godkänd.');
  if (c.lines.some((l) => l.counted === null || !Number.isInteger(l.counted) || l.counted < 0)) throw new Error('Fyll i räknat antal för alla rader.');
  for (const l of c.lines) {
    const b = state.batches.find((b) => b.id === l.batchId)!;
    if (b.quantity !== l.expected) throw new Error('Saldot har ändrats efter att inventeringen startades. Starta en ny inventering.');
    const delta = l.counted! - b.quantity; b.quantity = l.counted!;
    ledgerEntry(state, l.sku, c.warehouse, 'Inventering', delta, 'Godkänd inventeringsdifferens', c.id, `/admin/inventering/${c.id}`);
  }
  c.status = 'Godkänd';
}
export function createPurchase(state: Operations, input: Omit<Purchase, 'id'>) {
  if (!input.supplier.trim() || !input.lines.length || !input.expected) throw new Error('Ange leverantör, datum och minst en variant.');
  if (input.lines.some((l) => !Number.isInteger(l.quantity) || l.quantity < 1 || l.cost < 0)) throw new Error('Kontrollera antal och inköpspris.');
  const id = `PO-${Date.now()}`; state.purchases.unshift({ ...input, id }); return id;
}
export function receivePurchase(state: Operations, id: string, lines: { quantity: number; batch: string; expiry: string; discrepancy: string }[]) {
  const p = state.purchases.find((p) => p.id === id)!;
  if (p.status === 'Utkast') throw new Error('Skicka inköpsordern eller inleveransaviseringen först.');
  if (!lines.some((l) => l.quantity > 0)) throw new Error('Ange mottaget antal.');
  if (!p.receipts) {
    const previous = p.lines.filter((l) => l.received > 0);
    const previousEvent = state.ledger.find((l) => l.event === 'Inleverans' && l.reference === p.id);
    p.receipts = previous.length ? [{ id: `previous-${p.id}`, date: previousEvent?.date.split(' ')[0] ?? demoToday, actor: previousEvent?.actor ?? 'Lager (exempel)', lines: previous.map((l) => ({ sku: l.sku, quantity: l.received, batch: l.batch, expiry: l.expiry, discrepancy: l.discrepancy })) }] : [];
  }
  lines.forEach((input, i) => {
    const l = p.lines[i];
    if (!Number.isInteger(input.quantity) || input.quantity < 0 || input.quantity > l.quantity - l.received) throw new Error('Kontrollera mottaget antal.');
    if (input.quantity && (!input.batch.trim() || !input.expiry)) throw new Error('Batch och bäst före krävs för mottagna varor.');
    if (input.quantity) {
      l.received += input.quantity; l.batch = input.batch; l.expiry = input.expiry; l.discrepancy = input.discrepancy;
      state.batches.push({ id: crypto.randomUUID(), sku: l.sku, warehouse: p.warehouse, code: input.batch, expiry: input.expiry, quantity: input.quantity, status: 'Säljbar' });
      ledgerEntry(state, l.sku, p.warehouse, 'Inleverans', input.quantity, `Batch ${input.batch} · ${input.discrepancy || 'Mottaget utan avvikelse'}`, p.id, `/admin/inkop/${id}`);
    }
  });
  p.receipts = [...(p.receipts ?? []), { id: crypto.randomUUID(), date: demoToday, actor: 'Ella Svensson', lines: lines.flatMap((l, i) => l.quantity > 0 ? [{ sku: p.lines[i].sku, quantity: l.quantity, batch: l.batch, expiry: l.expiry, discrepancy: l.discrepancy }] : []) }];
  p.status = p.lines.every((l) => l.received === l.quantity) ? 'Mottagen' : 'Delvis mottagen';
}
export function orderValue(state: Operations, lines: OpsOrder['lines']) { return lines.reduce((s, l) => { const v = state.variants.find((v) => v.sku === l.sku); return s + ((v?.price ?? 0) + (v?.deposit ?? 0)) * l.quantity; }, 0) + 38; }
export function shipOrder(state: Operations, id: string, tracking: string, carrier: string) {
  const order = state.orders.find((o) => o.id === id)!;
  if (!['Att plocka', 'Packas'].includes(order.status) || !tracking.trim()) throw new Error('Ordern måste vara släppt till plock och ha ett spårningsnummer.');
  for (const line of order.lines) {
    let left = line.quantity;
    for (const b of state.batches.filter((b) => b.sku === line.sku && b.warehouse === order.warehouse && ['Säljbar', 'Kortdaterad'].includes(batchStatus(state, b))).sort((a, b) => a.expiry.localeCompare(b.expiry))) {
      const n = Math.min(left, b.quantity); b.quantity -= n; left -= n; if (!left) break;
    }
    if (left) throw new Error(`${line.sku} saknar säljbart saldo. Kontrollera lagersidan.`);
    const p = state.policies.find((p) => p.sku === line.sku && p.warehouse === order.warehouse);
    if (p) p.reserved = Math.max(0, p.reserved - line.quantity);
    ledgerEntry(state, line.sku, order.warehouse, 'Försäljning', -line.quantity, `Skickad med ${carrier}`, id, `/admin/order/${id}`);
  }
  order.status = 'Skickad'; order.tracking = tracking; order.events.unshift(`Skickad med ${carrier} · ${tracking} · ${demoToday}`);
}
export function saveExchange(state: Operations, returnId: string) {
  const r = state.returns.find((r) => r.id === returnId)!;
  if (r.exchangeOrderId || r.status !== 'Granskas') throw new Error('Returen är redan behandlad.');
  const original = state.orders.find((o) => o.id === r.orderId)!;
  if (balance(state, r.exchangeSku, original.warehouse).available < r.quantity) throw new Error('Ersättningsvaran saknar tillgängligt saldo.');
  const id = `BY-${Date.now()}`;
  state.orders.unshift({ ...original, id, sku: r.exchangeSku, kind: 'Byte', status: 'Att plocka', holdReason: '', refunds: [], lines: [{ sku: r.exchangeSku, quantity: r.quantity }], amount: orderValue(state, [{ sku: r.exchangeSku, quantity: r.quantity }]) - 38, originalOrder: original.id, returnId: r.id, reason: 'Byte från retur', events: [`Bytesorder skapad från ${r.id}`] });
  r.exchangeOrderId = id; r.status = 'Byte skapat';
  original.events.unshift(`Retur ${r.id} blev bytesorder ${id}`);
  const policy = state.policies.find((p) => p.sku === r.exchangeSku && p.warehouse === original.warehouse)!;
  policy.reserved += r.quantity;
  ledgerEntry(state, r.exchangeSku, original.warehouse, 'Reservation', -r.quantity, 'Bytesorder', id, `/admin/order/${id}`);
  return id;
}
