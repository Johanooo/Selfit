import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearch } from 'wouter';
import { useAdminListState } from './adminInteractions';
import {
  adjustStock, approveCount, balance, batchStatus, changeBatch, createPurchase, createTransfer, demoToday, money,
  receivePurchase, receiveTransfer, sendTransfer, useOperations, variantLabel, warehouseName, warehouses,
  type Batch, type Count, type Operations,
} from './operationsModel';
import { OpsBadge, OpsDialog, OpsEmpty, OpsError, OpsField, OpsHeading, OpsPanel, OpsTable, OpsTabs } from './operationsUi';
import './warehouseViews.css';

type Props = { go: (path: string) => void; notify: (message: string) => void; id?: string };
const reasons = ['Trasig', 'Stöld eller svinn', 'Ominventering', 'Egen användning', 'Utgånget', 'Annat'];
const vOf = (s: Operations, sku: string) => s.variants.find((v) => v.sku === sku);
const isExpired = (b: Batch) => b.expiry < demoToday;
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);

function useRunner(notify: (m: string) => void) {
  const [error, setError] = useState('');
  const run = <T,>(fn: () => T, ok: string): T | undefined => {
    try { const r = fn(); setError(''); notify(ok); return r; } catch (e) { setError(e instanceof Error ? e.message : 'Åtgärden kunde inte genomföras.'); return undefined; }
  };
  return { error, setError, run };
}
function NotFound({ what, back, go }: { what: string; back: string; go: (p: string) => void }) {
  return <OpsPanel title={`${what} hittades inte`}><OpsEmpty>Posten finns inte i den lokala lagerdatan. Den kan ha skapats i en annan webbläsare.</OpsEmpty><button type="button" className="admin-btn" onClick={() => go(back)} data-testid="button-back-list">Till listan</button></OpsPanel>;
}
const WhSelect = ({ value, onChange, all, testid }: { value: string; onChange: (v: string) => void; all?: boolean; testid: string }) =>
  <select className="admin-control" value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid}>{all && <option value="alla">Alla lager</option>}{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>;

/* ---------------- Saldo ---------------- */
export function StockView({ go, notify, id }: Props) {
  const { state } = useOperations();
  const [wh, setWh] = useAdminListState('saldo', 'lager', 'alla');
  const [product, setProduct] = useAdminListState('saldo', 'produkt', 'alla');
  const [under, setUnder] = useAdminListState('saldo', 'under', false);
  if (id) return <StockDetail go={go} notify={notify} id={id} />;
  const products = [...new Map(state.variants.map((v) => [v.productSlug, v.name])).entries()];
  const rows = state.variants.flatMap((v) => warehouses.map((w) => ({ v, w, b: balance(state, v.sku, w.id) })))
    .filter((r) => (wh === 'alla' || r.w.id === wh) && (product === 'alla' || r.v.productSlug === product) && (!under || r.b.available < r.b.point));
  return <div className="ops-stack" data-testid="view-stock">
    <OpsHeading title="Saldo" description="Tillgängligt, reserverat, spärrat och inkommande per variant och lager. Öppna en rad för att justera saldo eller ändra beställningspunkt." />
    <div className="admin-toolbar">
      <label className="admin-filter-label">Lager<WhSelect value={wh} onChange={setWh} all testid="select-stock-warehouse" /></label>
      <label className="admin-filter-label">Produkt<select className="admin-control" value={product} onChange={(e) => setProduct(e.target.value)} data-testid="select-stock-product"><option value="alla">Alla produkter</option>{products.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}</select></label>
      <label className="admin-toggle-row wv-toggle"><input type="checkbox" checked={under} onChange={(e) => setUnder(e.target.checked)} data-testid="checkbox-stock-under-point" />Endast under beställningspunkt</label>
      <span className="ops-note" data-testid="text-stock-count">{rows.length} rader</span>
    </div>
    <OpsPanel title="Saldo per variant och lager">
      {rows.length ? <OpsTable id="table-stock" headers={['Variant', 'Lager', 'Tillgängligt', 'Reserverat', 'Spärrat', 'På väg', 'Inkommande', 'Beställningspunkt']}>
        {rows.map(({ v, w, b }) => <tr key={`${v.sku}-${w.id}`} data-row-href={`/admin/saldo/${v.sku}`} data-row-label={`Öppna saldo för ${v.sku}`} data-testid={`row-stock-${v.sku}-${w.id}`}>
          <td><strong>{variantLabel(v)}</strong><span className="subtext">{v.sku}</span></td><td>{w.name}</td>
          <td className={`num ${b.available < b.point ? 'ops-negative' : ''}`}>{b.available}</td><td className="num">{b.reserved}</td><td className="num">{b.blocked}</td><td className="num">{b.transit}</td><td className="num">{b.incoming}</td>
          <td className="num">{b.point}{b.available < b.point && <span className="subtext">Under punkt</span>}</td>
        </tr>)}
      </OpsTable> : <OpsEmpty>Inga varianter matchar filtren. Ta bort ett filter för att se fler rader.</OpsEmpty>}
    </OpsPanel>
  </div>;
}

function StockDetail({ go, notify, id }: Props & { id: string }) {
  const { state, commit } = useOperations();
  const v = vOf(state, id);
  const { error, setError, run } = useRunner(notify);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ warehouse: 'dsv', sign: '-', quantity: '1', reason: 'Trasig', comment: '' });
  const initPolicies = () => Object.fromEntries(warehouses.map((w) => { const b = balance(state, id, w.id); return [w.id, { point: String(b.point), orderQuantity: String(b.orderQuantity) }]; }));
  const [policies, setPolicies] = useState<Record<string, { point: string; orderQuantity: string }>>(initPolicies);
  const [policyError, setPolicyError] = useState('');
  if (!v) return <NotFound what="Varianten" back="/admin/saldo" go={go} />;
  const ledger = state.ledger.filter((l) => l.sku === id);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(form.quantity);
    if (form.reason === 'Annat' && !form.comment.trim()) { setError('Beskriv orsaken i kommentaren när du väljer Annat.'); return; }
    const done = run(() => commit((d) => { adjustStock(d, id, form.warehouse, form.sign === '-' ? -n : n, form.reason, form.comment.trim()); return true; }), `Saldot för ${id} justerades.`);
    if (done) { setOpen(false); setForm((f) => ({ ...f, quantity: '1', comment: '' })); }
  };
  const savePolicies = () => {
    const parsed = warehouses.map((w) => ({ w: w.id, point: Number(policies[w.id].point), q: Number(policies[w.id].orderQuantity) }));
    if (parsed.some((p) => !Number.isInteger(p.point) || p.point < 0 || !Number.isInteger(p.q) || p.q < 1)) { setPolicyError('Beställningspunkt ska vara 0 eller mer och orderantal minst 1 (heltal).'); return; }
    commit((d) => parsed.forEach((p) => { const pol = d.policies.find((x) => x.sku === id && x.warehouse === p.w); if (pol) { pol.point = p.point; pol.orderQuantity = p.q; } else d.policies.push({ sku: id, warehouse: p.w, point: p.point, orderQuantity: p.q, reserved: 0 }); }));
    setPolicyError(''); notify('Beställningspunkter sparades.');
  };
  return <div className="ops-stack" data-testid="view-stock-detail">
    <OpsHeading title={variantLabel(v)} description={`${v.sku} · Inköpspris ${money(v.cost)} · Saldo, beställningspunkter och alla lagerhändelser.`} action={<button type="button" className="admin-btn primary" onClick={() => { setError(''); setOpen(true); }} data-testid="button-adjust-stock">Justera saldo</button>} />
    <OpsPanel title="Saldo per lager" action={<button type="button" className="admin-btn small" onClick={savePolicies} data-testid="button-save-policies">Spara beställningspunkter</button>}>
      <OpsTable id="table-stock-detail" headers={['Lager', 'Tillgängligt', 'Reserverat', 'Spärrat', 'På väg', 'Inkommande', 'Beställningspunkt', 'Orderantal']}>
        {warehouses.map((w) => { const b = balance(state, id, w.id); return <tr key={w.id} data-testid={`row-balance-${w.id}`}>
          <td><strong>{w.name}</strong></td><td className={`num ${b.available <= b.point ? 'ops-negative' : ''}`} data-testid={`text-available-${w.id}`}>{b.available}</td><td className="num">{b.reserved}</td><td className="num">{b.blocked}</td><td className="num">{b.transit}</td><td className="num">{b.incoming}</td>
          <td><input className="admin-control wv-num" type="number" min="0" step="1" aria-label={`Beställningspunkt ${w.name}`} value={policies[w.id].point} onChange={(e) => setPolicies((p) => ({ ...p, [w.id]: { ...p[w.id], point: e.target.value } }))} data-testid={`input-point-${w.id}`} /></td>
          <td><input className="admin-control wv-num" type="number" min="1" step="1" aria-label={`Orderantal ${w.name}`} value={policies[w.id].orderQuantity} onChange={(e) => setPolicies((p) => ({ ...p, [w.id]: { ...p[w.id], orderQuantity: e.target.value } }))} data-testid={`input-order-quantity-${w.id}`} /></td>
        </tr>; })}
      </OpsTable>
      <OpsError message={policyError} />
    </OpsPanel>
    <OpsPanel title="Lagerhändelser">
      {ledger.length ? <OpsTable id="table-ledger" headers={['Datum', 'Händelse', 'Lager', 'Antal', 'Saldo efter', 'Orsak', 'Referens', 'Utförd av']}>
        {ledger.map((l) => <tr key={l.id} {...(l.href ? { 'data-row-href': l.href, 'data-row-label': `Öppna ${l.reference}` } : {})} data-testid={`row-ledger-${l.id}`}>
          <td className="num">{l.date}</td><td>{l.event}</td><td>{warehouseName(l.warehouse)}</td><td className={`num ${l.quantity < 0 ? 'ops-negative' : ''}`}>{l.quantity > 0 ? `+${l.quantity}` : l.quantity}</td><td className="num">{l.after}</td><td>{l.reason}</td>
          <td>{l.href ? <button type="button" className="wv-link" onClick={() => go(l.href)} data-testid={`link-ledger-ref-${l.id}`}>{l.reference}</button> : l.reference}</td><td>{l.actor}</td>
        </tr>)}
      </OpsTable> : <OpsEmpty>Inga lagerhändelser ännu för den här varianten.</OpsEmpty>}
    </OpsPanel>
    <OpsDialog title={`Justera saldo · ${v.sku}`} open={open} onOpenChange={setOpen}>
      <form onSubmit={submit} data-testid="form-adjust-stock">
        <div className="admin-form-grid">
          <OpsField label="Lager"><WhSelect value={form.warehouse} onChange={(x) => setForm({ ...form, warehouse: x })} testid="select-adjust-warehouse" /></OpsField>
          <OpsField label="Riktning"><select className="admin-control" value={form.sign} onChange={(e) => setForm({ ...form, sign: e.target.value })} data-testid="select-adjust-sign"><option value="-">Minska (−)</option><option value="+">Öka (+)</option></select></OpsField>
          <OpsField label="Antal (heltal)"><input className="admin-control" type="number" min="1" step="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} data-testid="input-adjust-quantity" /></OpsField>
          <OpsField label="Orsak"><select className="admin-control" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} data-testid="select-adjust-reason">{reasons.map((r) => <option key={r}>{r}</option>)}</select></OpsField>
          <div className="admin-field span-2"><OpsField label={form.reason === 'Annat' ? 'Kommentar (krävs)' : 'Kommentar'}><textarea className="admin-control" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} data-testid="input-adjust-comment" /></OpsField></div>
        </div>
        <p className="ops-note">Tillgängligt i valt lager: {balance(state, id, form.warehouse).available} st. Saldot får inte bli negativt.</p>
        <OpsError message={error} />
        <div className="ops-inline"><button type="submit" className="admin-btn primary" data-testid="button-confirm-adjust">Spara justering</button></div>
      </form>
    </OpsDialog>
  </div>;
}

/* ---------------- Inköp ---------------- */
const tabNames = ['Inköpsorder', 'Inleveranser', 'Inköpsförslag'];
const tabFromParam = (t?: string) => t === 'forslag' || t === 'Inköpsförslag' ? 'Inköpsförslag' : t === 'inleveranser' || t === 'Inleveranser' ? 'Inleveranser' : 'Inköpsorder';
export function PurchasingView({ go, notify, id, tab }: Props & { tab?: string }) {
  const { state, commit } = useOperations();
  const [active, setActive] = useAdminListState(`inkop-${tab ?? 'default'}`, 'tab', tabFromParam(tab));
  const [selected, setSelected] = useState<string[]>([]);
  const { error, run } = useRunner(notify);
  if (id === 'ny') return <PurchaseForm go={go} notify={notify} />;
  if (id) return <PurchaseDetail go={go} notify={notify} id={id} />;
  const qtyLabel = (p: Operations['purchases'][number]) => `${p.lines.reduce((s, l) => s + l.received, 0)} / ${p.lines.reduce((s, l) => s + l.quantity, 0)}`;
  const inbound = state.purchases.filter((p) => p.status === 'Skickad' || p.status === 'Delvis mottagen');
  const suggestions = state.variants.flatMap((v) => warehouses.map((w) => ({ v, w, b: balance(state, v.sku, w.id) })))
    .filter((r) => r.b.available < r.b.point).map((r) => ({ ...r, key: `${r.v.sku}|${r.w.id}` }));
  const toggle = (k: string) => setSelected((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k]);
  const createFromSuggestions = () => {
    const rows = suggestions.filter((s) => selected.includes(s.key));
    const id2 = run(() => {
      if (!rows.length) throw new Error('Markera minst ett förslag.');
      if (new Set(rows.map((r) => r.w.id)).size > 1) throw new Error('Markera bara förslag för samma lager. En inköpsorder levereras till ett lager.');
      return commit((d) => createPurchase(d, { supplier: 'SELFIT Nutrition AB', warehouse: rows[0].w.id, expected: addDays(demoToday, 7), status: 'Utkast', advised: false, lines: rows.map((r) => ({ sku: r.v.sku, quantity: r.b.orderQuantity, cost: r.v.cost, received: 0, batch: '', expiry: '', discrepancy: '' })) }));
    }, 'Utkast till inköpsorder skapades från förslag.');
    if (id2) { setSelected([]); go(`/admin/inkop/${id2}`); }
  };
  const poTable = (list: typeof state.purchases, tid: string) => list.length ? <OpsTable id={tid} headers={['Order', 'Leverantör', 'Lager', 'Förväntat', 'Mottaget / beställt', 'Status']}>
    {list.map((p) => <tr key={p.id} data-row-href={`/admin/inkop/${p.id}`} data-row-label={`Öppna ${p.id}`} data-testid={`row-purchase-${p.id}`}>
      <td><strong>{p.id}</strong></td><td>{p.supplier}</td><td>{warehouseName(p.warehouse)}</td><td className="num">{p.expected}</td><td className="num">{qtyLabel(p)}</td><td><OpsBadge>{p.status}</OpsBadge></td></tr>)}
  </OpsTable> : null;
  return <div className="ops-stack" data-testid="view-purchasing">
    <OpsHeading title="Inköp" description="Inköpsorder, väntande inleveranser och förslag för varianter under beställningspunkt." action={<button type="button" className="admin-btn primary" onClick={() => go('/admin/inkop/ny')} data-testid="button-new-purchase">Ny inköpsorder</button>} />
    <OpsTabs tabs={tabNames} active={active} select={setActive} />
    {active === 'Inköpsorder' && <OpsPanel title="Alla inköpsorder">{poTable(state.purchases, 'table-purchases') ?? <OpsEmpty>Inga inköpsorder ännu. Skapa en ny eller utgå från Inköpsförslag.</OpsEmpty>}</OpsPanel>}
    {active === 'Inleveranser' && <OpsPanel title="Väntande inleveranser">{poTable(inbound, 'table-inbound') ?? <OpsEmpty>Inga skickade order väntar på mottagning.</OpsEmpty>}<p className="ops-note">Öppna en order för att registrera batch, bäst före och avvikelse per rad. Samma steg gäller eget lager och DSV.</p></OpsPanel>}
    {active === 'Inköpsförslag' && <OpsPanel title="Under beställningspunkt" action={<button type="button" className="admin-btn small primary" disabled={!selected.length} onClick={createFromSuggestions} data-testid="button-create-from-suggestions">Skapa inköpsorder ({selected.length})</button>}>
      <p className="ops-note wv-gap">Visar tillgängligt saldo under beställningspunkt. Kontrollera även inkommande och på väg före beställning. Markera rader för samma lager; föreslaget antal är variantens orderantal.</p>
      {suggestions.length ? <OpsTable id="table-suggestions" headers={['Välj', 'Variant', 'Lager', 'Tillgängligt', 'Inkommande', 'Beställningspunkt', 'Föreslaget antal']}>
        {suggestions.map((s) => <tr key={s.key} data-row-href={`/admin/saldo/${s.v.sku}`} data-row-label={`Öppna saldo för ${s.v.sku}`} data-testid={`row-suggestion-${s.v.sku}-${s.w.id}`}>
          <td><input type="checkbox" aria-label={`Välj ${s.v.sku} i ${s.w.name}`} checked={selected.includes(s.key)} onChange={() => toggle(s.key)} data-testid={`checkbox-suggestion-${s.v.sku}-${s.w.id}`} /></td>
          <td><strong>{variantLabel(s.v)}</strong><span className="subtext">{s.v.sku}</span></td><td>{s.w.name}</td><td className="num ops-negative">{s.b.available}</td><td className="num">{s.b.incoming + s.b.transit}</td><td className="num">{s.b.point}</td><td className="num">{s.b.orderQuantity}</td></tr>)}
      </OpsTable> : <OpsEmpty>Alla varianter ligger över beställningspunkten.</OpsEmpty>}
      <OpsError message={error} />
    </OpsPanel>}
  </div>;
}

function PurchaseForm({ go, notify }: Props) {
  const { state, commit } = useOperations();
  const { error, run } = useRunner(notify);
  const [head, setHead] = useState({ supplier: 'SELFIT Nutrition AB', warehouse: 'dsv', expected: addDays(demoToday, 7) });
  const [lines, setLines] = useState([{ sku: state.variants[0].sku, quantity: '24', cost: String(state.variants[0].cost) }]);
  const patch = (i: number, p: Partial<(typeof lines)[number]>) => setLines((ls) => ls.map((l, j) => j === i ? { ...l, ...p } : l));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = run(() => commit((d) => createPurchase(d, { ...head, status: 'Utkast', advised: false, lines: lines.map((l) => ({ sku: l.sku, quantity: Number(l.quantity), cost: Number(l.cost), received: 0, batch: '', expiry: '', discrepancy: '' })) })), 'Inköpsordern sparades som utkast.');
    if (id) go(`/admin/inkop/${id}`);
  };
  return <form className="ops-stack" onSubmit={submit} data-testid="form-new-purchase">
    <OpsHeading title="Ny inköpsorder" description="Sparas som utkast. Du skickar ordern eller inleveransaviseringen från orderns sida." section="Inköp" action={<button type="submit" className="admin-btn primary" data-testid="button-save-purchase">Spara utkast</button>} />
    <OpsPanel title="Leverans">
      <div className="admin-form-grid three">
        <OpsField label="Leverantör"><input className="admin-control" required value={head.supplier} onChange={(e) => setHead({ ...head, supplier: e.target.value })} data-testid="input-purchase-supplier" /></OpsField>
        <OpsField label="Mottagande lager"><WhSelect value={head.warehouse} onChange={(x) => setHead({ ...head, warehouse: x })} testid="select-purchase-warehouse" /></OpsField>
        <OpsField label="Förväntat datum"><input className="admin-control" type="date" required value={head.expected} onChange={(e) => setHead({ ...head, expected: e.target.value })} data-testid="input-purchase-date" /></OpsField>
      </div>
    </OpsPanel>
    <OpsPanel title="Varianter" action={<button type="button" className="admin-btn small" onClick={() => setLines((ls) => [...ls, { sku: state.variants[0].sku, quantity: '12', cost: String(state.variants[0].cost) }])} data-testid="button-add-purchase-line">Lägg till rad</button>}>
      <OpsTable id="table-purchase-lines" headers={['Variant', 'Antal', 'Inköpspris / st', 'Radsumma', 'Rad']}>
        {lines.map((l, i) => <tr key={i} data-testid={`row-purchase-line-${i}`}>
          <td><select className="admin-control" aria-label={`Variant rad ${i + 1}`} value={l.sku} onChange={(e) => patch(i, { sku: e.target.value, cost: String(vOf(state, e.target.value)?.cost ?? 0) })} data-testid={`select-purchase-sku-${i}`}>{state.variants.map((v) => <option key={v.sku} value={v.sku}>{v.sku} · {variantLabel(v)}</option>)}</select></td>
          <td><input className="admin-control wv-num" type="number" min="1" step="1" aria-label={`Antal rad ${i + 1}`} value={l.quantity} onChange={(e) => patch(i, { quantity: e.target.value })} data-testid={`input-purchase-qty-${i}`} /></td>
          <td><input className="admin-control wv-num" type="number" min="0" step="0.01" aria-label={`Inköpspris rad ${i + 1}`} value={l.cost} onChange={(e) => patch(i, { cost: e.target.value })} data-testid={`input-purchase-cost-${i}`} /></td>
          <td className="num">{money(Number(l.quantity) * Number(l.cost) || 0)}</td>
          <td><button type="button" className="admin-btn small quiet" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} data-testid={`button-remove-purchase-line-${i}`}>Ta bort rad</button></td>
        </tr>)}
      </OpsTable>
      <OpsError message={error} />
    </OpsPanel>
  </form>;
}

function PurchaseDetail({ go, notify, id }: Props & { id: string }) {
  const { state, commit } = useOperations();
  const p = state.purchases.find((x) => x.id === id);
  const { error, run } = useRunner(notify);
  const [rec, setRec] = useState<{ quantity: string; batch: string; expiry: string; discrepancy: string }[]>(() => (p?.lines ?? []).map((l) => ({ quantity: String(l.quantity - l.received), batch: '', expiry: '', discrepancy: '' })));
  if (!p) return <NotFound what="Inköpsordern" back="/admin/inkop" go={go} />;
  const is3pl = p.warehouse === 'dsv';
  const send = () => run(() => commit((d) => { const x = d.purchases.find((y) => y.id === id)!; if (x.status !== 'Utkast') throw new Error('Ordern är redan skickad.'); x.status = 'Skickad'; x.advised = true; }), is3pl ? 'Inköpsorder och inleveransavisering skickades till DSV.' : 'Inköpsordern skickades.');
  const receive = (e: FormEvent) => {
    e.preventDefault();
    const ok = run(() => commit((d) => { receivePurchase(d, id, rec.map((r) => ({ quantity: Number(r.quantity) || 0, batch: r.batch.trim(), expiry: r.expiry, discrepancy: r.discrepancy.trim() }))); return true; }), 'Inleveransen registrerades och saldot uppdaterades.');
    if (ok) setRec(p.lines.map((l, i) => ({ quantity: String(Math.max(0, l.quantity - l.received - (Number(rec[i].quantity) || 0))), batch: '', expiry: '', discrepancy: '' })));
  };
  const receiving = p.status === 'Skickad' || p.status === 'Delvis mottagen';
  const total = p.lines.reduce((s, l) => s + l.quantity * l.cost, 0);
  const receipts = p.receipts?.length ? p.receipts : p.lines.some((l) => l.received > 0) ? [{ id: 'sample-receipt', date: demoToday, actor: 'Lager (exempel)', lines: p.lines.filter((l) => l.received > 0).map((l) => ({ ...l, quantity: l.received })) }] : [];
  return <div className="ops-stack" data-testid="view-purchase-detail">
    <OpsHeading section="Inköp" title={p.id} description={`${p.supplier} · ${warehouseName(p.warehouse)} · Förväntas ${p.expected} · ${money(total)}`}
      action={<><OpsBadge>{p.status}</OpsBadge>{p.status === 'Utkast' && <button type="button" className="admin-btn primary" onClick={send} data-testid="button-send-purchase">{is3pl ? 'Skicka order och inleveransavisering' : 'Skicka inköpsorder'}</button>}</>} />
    <div className="ops-inline ops-note" data-testid="text-purchase-advice">{is3pl ? (p.advised ? 'Inleveransavisering skickad till DSV.' : 'Inleveransavisering skickas till DSV tillsammans med ordern.') : 'Eget lager tar emot direkt, ingen avisering behövs.'}</div>
    {receiving ? <form onSubmit={receive} data-testid="form-receive-purchase"><OpsPanel title={is3pl ? 'Registrera inleverans från DSV' : 'Registrera inleverans i eget lager'} action={<button type="submit" className="admin-btn small primary" data-testid="button-receive-purchase">Registrera inleverans</button>}>
      <OpsTable id="table-receive-purchase" headers={['Variant', 'Beställt', 'Mottaget', 'Tar emot nu', 'Batch', 'Bäst före', 'Avvikelse']}>
        {p.lines.map((l, i) => { const left = l.quantity - l.received; return <tr key={i} data-testid={`row-receive-${i}`}>
          <td><strong>{l.sku}</strong><span className="subtext">{variantLabel(vOf(state, l.sku))}</span></td><td className="num">{l.quantity}</td><td className="num">{l.received}</td>
          {left > 0 ? <>
            <td><input className="admin-control wv-num" type="number" min="0" max={left} step="1" aria-label={`Tar emot ${l.sku}`} value={rec[i]?.quantity ?? ''} onChange={(e) => setRec((r) => r.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} data-testid={`input-receive-qty-${i}`} /></td>
            <td><input className="admin-control" aria-label={`Batch ${l.sku}`} value={rec[i]?.batch ?? ''} onChange={(e) => setRec((r) => r.map((x, j) => j === i ? { ...x, batch: e.target.value } : x))} data-testid={`input-receive-batch-${i}`} /></td>
            <td><input className="admin-control" type="date" aria-label={`Bäst före ${l.sku}`} value={rec[i]?.expiry ?? ''} onChange={(e) => setRec((r) => r.map((x, j) => j === i ? { ...x, expiry: e.target.value } : x))} data-testid={`input-receive-expiry-${i}`} /></td>
            <td><input className="admin-control" aria-label={`Avvikelse ${l.sku}`} placeholder="Ex. 2 st skadade" value={rec[i]?.discrepancy ?? ''} onChange={(e) => setRec((r) => r.map((x, j) => j === i ? { ...x, discrepancy: e.target.value } : x))} data-testid={`input-receive-discrepancy-${i}`} /></td>
          </> : <td colSpan={4} className="ops-note">Fullt mottagen · {l.batch} · {l.expiry}</td>}
        </tr>; })}
      </OpsTable>
      <OpsError message={error} />
    </OpsPanel></form> : <OpsPanel title="Rader">
      <OpsTable id="table-purchase-detail-lines" headers={['Variant', 'Antal', 'Inköpspris', 'Mottaget', 'Batch', 'Bäst före', 'Avvikelse']}>
        {p.lines.map((l, i) => <tr key={i} data-row-href={`/admin/saldo/${l.sku}`} data-row-label={`Öppna saldo för ${l.sku}`} data-testid={`row-po-line-${i}`}><td><strong>{l.sku}</strong><span className="subtext">{variantLabel(vOf(state, l.sku))}</span></td><td className="num">{l.quantity}</td><td className="num">{money(l.cost)}</td><td className="num">{l.received}</td><td>{l.batch || '–'}</td><td>{l.expiry || '–'}</td><td>{l.discrepancy || '–'}</td></tr>)}
      </OpsTable>
      {p.status === 'Utkast' && <p className="ops-note wv-gap">Skicka ordern för att kunna ta emot varorna.</p>}
      <OpsError message={error} />
    </OpsPanel>}
    <OpsPanel title="Mottagningsrapporter">
      <p className="ops-note">Registrerade mottagningar sparas här även när delar av ordern återstår.</p>
      {receipts.length ? <OpsTable id="table-receipt-reports" headers={['Datum', 'SKU', 'Mottaget', 'Batch', 'Bäst före', 'Avvikelse', 'Registrerat av']}>
        {receipts.flatMap((report) => report.lines.map((line, index) => <tr key={`${report.id}-${index}`} data-row-href={`/admin/saldo/${line.sku}`}><td>{report.date}</td><td>{line.sku}</td><td>{line.quantity} st</td><td>{line.batch}</td><td>{line.expiry}</td><td>{line.discrepancy || 'Ingen avvikelse'}</td><td>{report.actor}</td></tr>))}
      </OpsTable> : <OpsEmpty>Ingen mottagning registrerad ännu.</OpsEmpty>}
    </OpsPanel>
  </div>;
}

/* ---------------- Partier ---------------- */
type BatchAction = { id: string; action: 'Kassera' | 'Frisläpp spärr' } | null;
function useBatchActions(notify: (m: string) => void) {
  const { commit } = useOperations();
  const [target, setTarget] = useState<BatchAction>(null);
  const [reason, setReason] = useState('');
  const { error, setError, run } = useRunner(notify);
  const open = (id: string, action: 'Kassera' | 'Frisläpp spärr') => { setTarget({ id, action }); setReason(''); setError(''); };
  const dialog = <OpsDialog title={target?.action === 'Kassera' ? 'Kassera parti' : 'Frisläpp spärr'} open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
    <form onSubmit={(e) => { e.preventDefault(); if (!target) return; if (run(() => commit((d) => { changeBatch(d, target.id, target.action, reason); return true; }), `${target.action} genomförd.`)) setTarget(null); }} data-testid="form-batch-action">
      <p className="ops-note">{target?.action === 'Kassera' ? 'Hela partiets antal tas bort från lagret och loggas som justering.' : 'Partiet blir säljbart igen och räknas in i tillgängligt saldo.'}</p>
      <OpsField label="Orsak (krävs)"><textarea className="admin-control" required value={reason} onChange={(e) => setReason(e.target.value)} data-testid="input-batch-reason" /></OpsField>
      <OpsError message={error} />
      <div className="ops-inline"><button type="submit" className={`admin-btn ${target?.action === 'Kassera' ? 'danger' : 'primary'}`} data-testid="button-confirm-batch-action">{target?.action}</button></div>
    </form>
  </OpsDialog>;
  return { open, dialog };
}
function BatchActions({ b, state, go, open }: { b: Batch; state: Operations; go: (p: string) => void; open: (id: string, a: 'Kassera' | 'Frisläpp spärr') => void }) {
  const st = batchStatus(state, b);
  if (st === 'Kasserad') return <span className="ops-note">Inga åtgärder</span>;
  return <div className="ops-row-actions">
    {(st === 'Säljbar' || st === 'Kortdaterad') && <button type="button" className="admin-btn small" onClick={() => go(`/admin/rabatter/ny?parti=${encodeURIComponent(b.id)}`)} data-testid={`button-create-sale-${b.id}`}>Skapa rea</button>}
    {st === 'Spärrad' && (isExpired(b) ? <span className="ops-note" data-testid={`text-expired-${b.id}`}>Utgånget, kan inte frisläppas</span> : <button type="button" className="admin-btn small" onClick={() => open(b.id, 'Frisläpp spärr')} data-testid={`button-release-${b.id}`}>Frisläpp spärr</button>)}
    <button type="button" className="admin-btn small danger" onClick={() => open(b.id, 'Kassera')} data-testid={`button-discard-${b.id}`}>Kassera</button>
  </div>;
}
export function BatchView({ go, notify, id }: Props) {
  const query = useSearch();
  const { state, commit } = useOperations();
  const [wh, setWh] = useAdminListState(`partier-${query}`, 'lager', 'alla');
  const [status, setStatus] = useAdminListState(`partier-${query}`, 'status', new URLSearchParams(query).get('status') === 'kortdaterad' ? 'Kortdaterad' : 'alla');
  const [days, setDays] = useState(String(state.shortDays));
  const [daysError, setDaysError] = useState('');
  const { open, dialog } = useBatchActions(notify);
  const statusOf = (b: Batch) => batchStatus(state, b);
  if (id) {
    const b = state.batches.find((x) => x.id === id);
    if (!b) return <NotFound what="Partiet" back="/admin/partier" go={go} />;
    const st = statusOf(b);
    const events = state.ledger.filter((l) => l.reference === b.code || l.href === `/admin/partier/${b.id}`);
    return <div className="ops-stack" data-testid="view-batch-detail">
      <OpsHeading title={`Parti ${b.code}`} description={`${variantLabel(vOf(state, b.sku))} · ${warehouseName(b.warehouse)}`} action={<OpsBadge>{st}</OpsBadge>} />
      <OpsPanel title="Uppgifter" action={<BatchActions b={b} state={state} go={go} open={open} />}>
        <div className="admin-metric-line"><span>SKU</span><button type="button" className="wv-link" onClick={() => go(`/admin/saldo/${b.sku}`)} data-testid="link-batch-sku">{b.sku}</button></div>
        <div className="admin-metric-line"><span>Bäst före</span><strong data-testid="text-batch-expiry">{b.expiry}</strong></div>
        <div className="admin-metric-line"><span>Antal</span><strong data-testid="text-batch-quantity">{b.quantity}</strong></div>
        <div className="admin-metric-line"><span>Status</span><span data-testid="text-batch-status">{st}</span></div>
        {b.reason && <div className="admin-metric-line"><span>Senaste orsak</span><span>{b.reason}</span></div>}
        {isExpired(b) && st !== 'Kasserad' && <div className="admin-notice error wv-gap-top" role="note"><div><strong>Utgånget parti</strong>Bäst före har passerat. Partiet räknas inte i tillgängligt saldo och kan inte säljas eller frisläppas. Kassera det när det har tagits ur lagret.</div></div>}
      </OpsPanel>
      <OpsPanel title="Händelser för partiet">{events.length ? <OpsTable id="table-batch-events" headers={['Datum', 'Händelse', 'Antal', 'Orsak', 'Utförd av']}>{events.map((l) => <tr key={l.id} data-testid={`row-batch-event-${l.id}`}><td className="num">{l.date}</td><td>{l.event}</td><td className="num">{l.quantity}</td><td>{l.reason}</td><td>{l.actor}</td></tr>)}</OpsTable> : <OpsEmpty>Inga åtgärder har gjorts på partiet.</OpsEmpty>}</OpsPanel>
      {dialog}
    </div>;
  }
  const rows = state.batches.filter((b) => (wh === 'alla' || b.warehouse === wh) && (status === 'alla' || statusOf(b) === status)).sort((a, b) => a.expiry.localeCompare(b.expiry));
  const saveDays = () => { const n = Number(days); if (!Number.isInteger(n) || n < 1 || n > 365) { setDaysError('Ange ett heltal mellan 1 och 365.'); return; } commit((d) => { d.shortDays = n; }); setDaysError(''); notify(`Kortdaterad gräns sparad: ${n} dagar.`); };
  return <div className="ops-stack" data-testid="view-batches">
    <OpsHeading title="Partier" description="Batcher per variant och lager sorterade på bäst före. Utgångna partier spärras automatiskt och räknas inte i saldot." />
    <div className="admin-toolbar">
      <label className="admin-filter-label">Lager<WhSelect value={wh} onChange={setWh} all testid="select-batch-warehouse" /></label>
      <label className="admin-filter-label">Status<select className="admin-control" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="select-batch-status"><option value="alla">Alla statusar</option>{['Säljbar', 'Kortdaterad', 'Spärrad', 'Kasserad'].map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className="admin-filter-label">Kortdaterad inom (dagar)<input className="admin-control wv-num" type="number" min="1" step="1" value={days} onChange={(e) => setDays(e.target.value)} data-testid="input-short-days" /></label>
      <button type="button" className="admin-btn" onClick={saveDays} data-testid="button-save-short-days">Spara gräns</button>
    </div>
    <OpsError message={daysError} />
    <OpsPanel title="Partier">
      {rows.length ? <OpsTable id="table-batches" headers={['Variant', 'Lager', 'Batch', 'Bäst före', 'Antal', 'Status', 'Åtgärder']}>
        {rows.map((b) => { const st = statusOf(b); return <tr key={b.id} className={isExpired(b) && st !== 'Kasserad' ? 'wv-expired' : ''} data-row-href={`/admin/partier/${b.id}`} data-row-label={`Öppna parti ${b.code}`} data-testid={`row-batch-${b.id}`}>
          <td><strong>{b.sku}</strong><span className="subtext">{variantLabel(vOf(state, b.sku))}</span></td><td>{warehouseName(b.warehouse)}</td><td>{b.code}</td>
          <td className="num">{b.expiry}{isExpired(b) && <span className="subtext">Utgånget</span>}</td><td className="num">{b.quantity}</td><td><OpsBadge>{st}</OpsBadge></td>
          <td><BatchActions b={b} state={state} go={go} open={open} /></td></tr>; })}
      </OpsTable> : <OpsEmpty>Inga partier matchar filtren.</OpsEmpty>}
    </OpsPanel>
    {dialog}
  </div>;
}

/* ---------------- Flyttar ---------------- */
export function TransfersView({ go, notify, id }: Props) {
  const { state } = useOperations();
  if (id === 'ny') return <TransferForm go={go} notify={notify} />;
  if (id) return <TransferDetail go={go} notify={notify} id={id} />;
  return <div className="ops-stack" data-testid="view-transfers">
    <OpsHeading title="Lagerflyttar" description="Flytta batcher mellan DSV och eget lager. Utkast skickas, och mottagning kan ske delvis." action={<button type="button" className="admin-btn primary" onClick={() => go('/admin/flyttar/ny')} data-testid="button-new-transfer">Ny flytt</button>} />
    <OpsPanel title="Flyttar">{state.transfers.length ? <OpsTable id="table-transfers" headers={['Flytt', 'Från', 'Till', 'Mottaget / skickat', 'Status']}>
      {state.transfers.map((t) => <tr key={t.id} data-row-href={`/admin/flyttar/${t.id}`} data-row-label={`Öppna ${t.id}`} data-testid={`row-transfer-${t.id}`}><td><strong>{t.id}</strong><span className="subtext">{t.lines.length} rader</span></td><td>{warehouseName(t.from)}</td><td>{warehouseName(t.to)}</td><td className="num">{t.lines.reduce((s, l) => s + l.received, 0)} / {t.lines.reduce((s, l) => s + l.quantity, 0)}</td><td><OpsBadge>{t.status}</OpsBadge></td></tr>)}
    </OpsTable> : <OpsEmpty>Inga flyttar ännu. Skapa en flytt när ett lager behöver fyllas på från det andra.</OpsEmpty>}</OpsPanel>
  </div>;
}
function TransferForm({ go, notify }: Props) {
  const { state, commit } = useOperations();
  const { error, run } = useRunner(notify);
  const [from, setFrom] = useState('dsv');
  const [to, setTo] = useState('own');
  const options = useMemo(() => state.batches.filter((b) => b.warehouse === from && b.quantity > 0 && ['Säljbar', 'Kortdaterad'].includes(batchStatus(state, b))), [state, from]);
  const [lines, setLines] = useState<{ batchId: string; quantity: string }[]>([{ batchId: '', quantity: '1' }]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const tid = run(() => commit((d) => createTransfer(d, { from, to, lines: lines.map((l) => { const b = d.batches.find((x) => x.id === l.batchId); if (!b) throw new Error('Välj batch på alla rader.'); return { batchId: b.id, sku: b.sku, batch: b.code, expiry: b.expiry, quantity: Number(l.quantity), received: 0 }; }) })), 'Flytten sparades som utkast.');
    if (tid) go(`/admin/flyttar/${tid}`);
  };
  return <form className="ops-stack" onSubmit={submit} data-testid="form-new-transfer">
    <OpsHeading title="Ny flytt" description="Sparas som utkast. Saldot ändras först när flytten skickas." action={<button type="submit" className="admin-btn primary" data-testid="button-save-transfer">Spara utkast</button>} />
    <OpsPanel title="Lager">
      <div className="admin-form-grid">
        <OpsField label="Från lager"><WhSelect value={from} onChange={(x) => { setFrom(x); setLines([{ batchId: '', quantity: '1' }]); if (x === to) setTo(warehouses.find((w) => w.id !== x)!.id); }} testid="select-transfer-from" /></OpsField>
        <OpsField label="Till lager"><WhSelect value={to} onChange={setTo} testid="select-transfer-to" /></OpsField>
      </div>
      {from === to && <p className="admin-field-error">Välj två olika lager.</p>}
    </OpsPanel>
    <OpsPanel title="Varianter och batcher" action={<button type="button" className="admin-btn small" onClick={() => setLines((l) => [...l, { batchId: '', quantity: '1' }])} data-testid="button-add-transfer-line">Lägg till rad</button>}>
      <OpsTable id="table-transfer-lines" headers={['Variant och batch', 'I batch', 'Antal', 'Rad']}>
        {lines.map((l, i) => { const b = options.find((x) => x.id === l.batchId); return <tr key={i} data-testid={`row-transfer-line-${i}`}>
          <td><select className="admin-control" aria-label={`Batch rad ${i + 1}`} value={l.batchId} onChange={(e) => setLines((ls) => ls.map((x, j) => j === i ? { ...x, batchId: e.target.value } : x))} data-testid={`select-transfer-batch-${i}`}><option value="">Välj variant och batch</option>{options.map((o) => <option key={o.id} value={o.id}>{o.sku} · {o.code} · bf {o.expiry} · {o.quantity} st</option>)}</select></td>
          <td className="num">{b ? `${b.quantity} st (tillg. ${balance(state, b.sku, from).available})` : '–'}</td>
          <td><input className="admin-control wv-num" type="number" min="1" step="1" aria-label={`Antal rad ${i + 1}`} value={l.quantity} onChange={(e) => setLines((ls) => ls.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} data-testid={`input-transfer-qty-${i}`} /></td>
          <td><button type="button" className="admin-btn small quiet" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} data-testid={`button-remove-transfer-line-${i}`}>Ta bort rad</button></td></tr>; })}
      </OpsTable>
      <OpsError message={error} />
    </OpsPanel>
  </form>;
}
function TransferDetail({ go, notify, id }: Props & { id: string }) {
  const { state, commit } = useOperations();
  const t = state.transfers.find((x) => x.id === id);
  const { error, run } = useRunner(notify);
  const [qty, setQty] = useState<string[]>(() => (t?.lines ?? []).map((l) => String(l.quantity - l.received)));
  if (!t) return <NotFound what="Flytten" back="/admin/flyttar" go={go} />;
  const canReceive = t.status === 'Skickad (på väg)' || t.status === 'Delvis mottagen';
  const send = () => run(() => commit((d) => sendTransfer(d, id)), `Flytten skickades från ${warehouseName(t.from)}.`);
  const receive = () => { if (run(() => commit((d) => { receiveTransfer(d, id, qty.map((q) => Number(q) || 0)); return true; }), 'Mottagningen registrerades.')) setQty(t.lines.map((l, i) => String(Math.max(0, l.quantity - l.received - (Number(qty[i]) || 0))))); };
  return <div className="ops-stack" data-testid="view-transfer-detail">
    <OpsHeading title={t.id} description={`${warehouseName(t.from)} till ${warehouseName(t.to)}`} action={<><OpsBadge>{t.status}</OpsBadge>
      {t.status === 'Utkast' && <button type="button" className="admin-btn primary" onClick={send} data-testid="button-send-transfer">Skicka flytt</button>}
      {canReceive && <button type="button" className="admin-btn primary" onClick={receive} data-testid="button-receive-transfer">Registrera mottagning</button>}</>} />
    <p className="ops-note">{t.status === 'Utkast' ? 'När flytten skickas minskar saldot i avsändande lager och antalet visas som på väg till mottagaren.' : canReceive ? 'Ange mottaget antal per rad. Resterande antal ligger kvar som på väg.' : 'Flytten är helt mottagen.'}</p>
    <OpsPanel title="Rader">
      <OpsTable id="table-transfer-detail" headers={canReceive ? ['Variant', 'Batch', 'Bäst före', 'Skickat', 'Mottaget', 'Tar emot nu'] : ['Variant', 'Batch', 'Bäst före', 'Antal', 'Mottaget']}>
        {t.lines.map((l, i) => <tr key={i} data-row-href={`/admin/saldo/${l.sku}`} data-row-label={`Öppna saldo för ${l.sku}`} data-testid={`row-transfer-detail-${i}`}><td><strong>{l.sku}</strong><span className="subtext">{variantLabel(vOf(state, l.sku))}</span></td><td>{l.batch}</td><td className="num">{l.expiry}</td><td className="num">{l.quantity}</td><td className="num">{l.received}</td>
          {canReceive && <td>{l.quantity - l.received > 0 ? <input className="admin-control wv-num" type="number" min="0" max={l.quantity - l.received} step="1" aria-label={`Tar emot ${l.sku}`} value={qty[i] ?? ''} onChange={(e) => setQty((q) => q.map((x, j) => j === i ? e.target.value : x))} data-testid={`input-transfer-receive-${i}`} /> : <span className="ops-note">Klar</span>}</td>}
        </tr>)}
      </OpsTable>
      <OpsError message={error} />
    </OpsPanel>
  </div>;
}

/* ---------------- Inventering ---------------- */
export function CountsView({ go, notify, id }: Props) {
  const { state } = useOperations();
  if (id === 'ny') return <CountForm go={go} notify={notify} />;
  if (id) return <CountDetail go={go} notify={notify} id={id} />;
  const diff = (c: Count) => c.lines.filter((l) => l.counted !== null && l.counted !== l.expected).length;
  return <div className="ops-stack" data-testid="view-counts">
    <OpsHeading title="Inventering" description="Räkna ett helt lager eller utvalda varianter. Differenser bokförs när inventeringen godkänns." action={<button type="button" className="admin-btn primary" onClick={() => go('/admin/inventering/ny')} data-testid="button-new-count">Starta inventering</button>} />
    <OpsPanel title="Historik">{state.counts.length ? <OpsTable id="table-counts" headers={['Inventering', 'Lager', 'Omfattning', 'Datum', 'Rader med differens', 'Status']}>
      {state.counts.map((c) => <tr key={c.id} data-row-href={`/admin/inventering/${c.id}`} data-row-label={`Öppna ${c.id}`} data-testid={`row-count-${c.id}`}><td><strong>{c.id}</strong></td><td>{warehouseName(c.warehouse)}</td><td>{c.scope}</td><td className="num">{c.date}</td><td className="num">{diff(c)}</td><td><OpsBadge>{c.status}</OpsBadge></td></tr>)}
    </OpsTable> : <OpsEmpty>Inga inventeringar ännu. Starta den första för ett lager eller några varianter.</OpsEmpty>}</OpsPanel>
  </div>;
}
function CountForm({ go, notify }: Props) {
  const { state, commit } = useOperations();
  const { error, run } = useRunner(notify);
  const [wh, setWh] = useState('dsv');
  const [scope, setScope] = useState<'hela' | 'urval'>('hela');
  const [skus, setSkus] = useState<string[]>([]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cid = run(() => commit((d) => {
      if (scope === 'urval' && !skus.length) throw new Error('Välj minst en variant att räkna.');
      const lines = d.batches.filter((b) => b.warehouse === wh && b.status !== 'Kasserad' && (scope === 'hela' || skus.includes(b.sku))).map((b) => ({ batchId: b.id, sku: b.sku, batch: b.code, expected: b.quantity, counted: null }));
      if (!lines.length) throw new Error('Det finns inga partier att räkna för valet.');
      const newId = `INV-${Date.now()}`;
      d.counts.unshift({ id: newId, warehouse: wh, scope: scope === 'hela' ? 'Hela lagret' : `${skus.length} varianter`, date: demoToday, status: 'Pågår', lines });
      return newId;
    }), 'Inventeringen startades.');
    if (cid) go(`/admin/inventering/${cid}`);
  };
  return <form className="ops-stack" onSubmit={submit} data-testid="form-new-count">
    <OpsHeading title="Starta inventering" description="Systemsaldot per batch sparas som utgångsläge när du startar." action={<button type="submit" className="admin-btn primary" data-testid="button-start-count">Starta</button>} />
    <OpsPanel title="Omfattning">
      <div className="admin-form-grid">
        <OpsField label="Lager"><WhSelect value={wh} onChange={setWh} testid="select-count-warehouse" /></OpsField>
        <fieldset className="admin-option-set"><legend>Vad ska räknas?</legend>
          <label className="admin-toggle-row"><input type="radio" name="scope" checked={scope === 'hela'} onChange={() => setScope('hela')} data-testid="radio-count-whole" />Hela lagret</label>
          <label className="admin-toggle-row"><input type="radio" name="scope" checked={scope === 'urval'} onChange={() => setScope('urval')} data-testid="radio-count-selection" />Valda varianter</label>
        </fieldset>
      </div>
      {scope === 'urval' && <fieldset className="admin-option-set wv-gap-top wv-checkgrid"><legend>Varianter ({skus.length} valda)</legend>
        {state.variants.map((v) => <label key={v.sku} className="admin-toggle-row"><input type="checkbox" checked={skus.includes(v.sku)} onChange={() => setSkus((s) => s.includes(v.sku) ? s.filter((x) => x !== v.sku) : [...s, v.sku])} data-testid={`checkbox-count-sku-${v.sku}`} />{v.sku} · {v.flavour}</label>)}
      </fieldset>}
      <OpsError message={error} />
    </OpsPanel>
  </form>;
}
function CountDetail({ go, notify, id }: Props & { id: string }) {
  const { state, commit } = useOperations();
  const c = state.counts.find((x) => x.id === id);
  const { error, run } = useRunner(notify);
  if (!c) return <NotFound what="Inventeringen" back="/admin/inventering" go={go} />;
  const open = c.status === 'Pågår';
  const setCounted = (i: number, v: string) => commit((d) => { const line = d.counts.find((x) => x.id === id)!.lines[i]; line.counted = v === '' ? null : Number(v); });
  const filled = c.lines.filter((l) => l.counted !== null).length;
  return <div className="ops-stack" data-testid="view-count-detail">
    <OpsHeading title={c.id} description={`${warehouseName(c.warehouse)} · ${c.scope} · Startad ${c.date} · ${filled} av ${c.lines.length} rader räknade`} action={<><OpsBadge>{c.status}</OpsBadge>{open && <button type="button" className="admin-btn primary" onClick={() => run(() => commit((d) => approveCount(d, id)), 'Inventeringen godkändes och saldot uppdaterades.')} data-testid="button-approve-count">Godkänn inventering</button>}</>} />
    <OpsPanel title="Räknade antal">
      <OpsTable id="table-count-lines" headers={['Variant', 'Batch', 'Systemsaldo', 'Räknat', 'Differens']}>
        {c.lines.map((l, i) => { const d = l.counted === null ? null : l.counted - l.expected; return <tr key={l.batchId} className={d ? 'ops-difference' : ''} data-testid={`row-count-line-${i}`}>
          <td><strong>{l.sku}</strong><span className="subtext">{variantLabel(vOf(state, l.sku))}</span></td><td>{l.batch}</td><td className="num">{l.expected}</td>
          <td>{open ? <input className="admin-control wv-num" type="number" min="0" step="1" aria-label={`Räknat ${l.sku} batch ${l.batch}`} value={l.counted ?? ''} onChange={(e) => setCounted(i, e.target.value)} data-testid={`input-counted-${i}`} /> : <span className="num">{l.counted}</span>}</td>
          <td className={`num ${d && d < 0 ? 'ops-negative' : ''}`} data-testid={`text-count-diff-${i}`}>{d === null ? '–' : d > 0 ? `+${d}` : d}</td></tr>; })}
      </OpsTable>
      <OpsError message={error} />
    </OpsPanel>
  </div>;
}
