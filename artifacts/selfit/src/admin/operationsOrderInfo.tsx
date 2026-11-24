import { useState, type FormEvent } from 'react';
import { demoToday, money, useOperations, warehouseName, type OpsOrder } from './operationsModel';
import { OpsBadge, OpsError, OpsField, OpsPanel, OpsTable, type ViewActions } from './operationsUi';

export function OperationalOrderInfo({ order, go, notify }: ViewActions & { order: OpsOrder }) {
  const { state, commit } = useOperations();
  const [amount, setAmount] = useState(''); const [reason, setReason] = useState(''); const [error, setError] = useState('');
  const goods = order.lines.reduce((s, l) => s + (state.variants.find((v) => v.sku === l.sku)?.price ?? 0) * l.quantity, 0);
  const deposit = order.lines.reduce((s, l) => s + (state.variants.find((v) => v.sku === l.sku)?.deposit ?? 0) * l.quantity, 0);
  const vat = order.lines.reduce((s, l) => { const v = state.variants.find((v) => v.sku === l.sku)!; return s + v.price * l.quantity * v.vat / (100 + v.vat); }, 0);
  const refunded = (order.refunds ?? []).reduce((s, r) => s + r.amount, 0);
  const refund = (e: FormEvent) => { e.preventDefault(); const value = Number(amount);
    if (!(value > 0) || value > order.amount - refunded || !reason.trim()) { setError('Ange orsak och ett belopp inom återstående betalt belopp.'); return; }
    commit((d) => { const o = d.orders.find((o) => o.id === order.id)!; o.refunds = [...(o.refunds ?? []), { amount: value, reason, actor: 'Ella Svensson', date: demoToday }]; o.events.unshift(`Återbetalning ${money(value)} · ${reason} · Ella Svensson`); });
    setError(''); setAmount(''); setReason(''); notify('Återbetalning registrerad lokalt. Inga pengar har betalats ut.');
  };
  return <><div className="admin-grid two"><OpsPanel title="Kund och leverans"><p>{order.email}</p><p>{warehouseName(order.warehouse)} · {order.tracking}</p><button className="admin-btn" onClick={() => go(`/admin/kunder/${order.email.split('@')[0].replaceAll('.', '-')}`)}>Öppna kundkort</button></OpsPanel><OpsPanel title="Betalningsuppgifter"><div className="admin-metric-line"><span>Betalstatus</span><OpsBadge>{order.payment}</OpsBadge></div><div className="admin-metric-line"><span>Betalsätt</span><strong>Kustom · {order.id.endsWith('0839') ? 'Swish' : order.id.endsWith('0834') ? 'Klarna' : 'Kort'}</strong></div><div className="admin-metric-line"><span>Auktorisering</span><span>24 nov 2026, 09:42</span></div><div className="admin-metric-line"><span>Debitering</span><span>{order.payment === 'Väntar' ? 'Inväntar betalning' : '24 nov 2026, 09:43'}</span></div><div className="admin-metric-line"><span>Kustom-referens</span><code>demo-{order.id}</code></div></OpsPanel></div>
    <OpsPanel title="Prisfördelning"><div className="admin-metric-line"><span>Varor inkl. moms</span><strong>{money(goods)}</strong></div><div className="admin-metric-line"><span>Rabatt / kompensation</span><strong>{money(Math.min(0, order.amount - goods - deposit - 38))}</strong></div><div className="admin-metric-line"><span>Pant</span><strong>{money(deposit)}</strong></div><div className="admin-metric-line"><span>Frakt</span><strong>{money(38)}</strong></div><div className="admin-metric-line"><span>Varav moms på varor</span><strong>{money(vat)}</strong></div><div className="admin-metric-line"><span>Totalt</span><strong>{money(order.amount)}</strong></div></OpsPanel>
    <OpsPanel title="Återbetalningar"><OpsTable id="ops-refunds" headers={['Datum', 'Belopp', 'Orsak', 'Godkänd av']}>{(order.refunds ?? []).map((r, i) => <tr key={i}><td>{r.date}</td><td>{money(r.amount)}</td><td>{r.reason}</td><td>{r.actor}</td></tr>)}</OpsTable>{!(order.refunds ?? []).length && <p>Inga återbetalningar registrerade.</p>}
      <form className="ops-stack" onSubmit={refund}><div className="admin-form-grid"><OpsField label="Återbetalningsbelopp (kr)"><input className="admin-control" type="number" min="0.01" step="0.01" required max={Math.max(0, order.amount - refunded)} value={amount} onChange={(e) => setAmount(e.target.value)} /></OpsField><OpsField label="Orsak till återbetalning"><input className="admin-control" required value={reason} onChange={(e) => setReason(e.target.value)} /></OpsField></div><OpsError message={error} /><div className="ops-inline"><button className="admin-btn" disabled={order.amount <= refunded} type="button" onClick={() => setAmount(String(Math.max(0, order.amount - refunded)))}>Välj hela återstående beloppet</button><button className="admin-btn primary" disabled={order.amount <= refunded}>Godkänn återbetalning</button></div></form>
    </OpsPanel>
    <OpsPanel title="Samlad tidslinje"><ul className="ops-compact-list">{order.events.map((event, i) => <li key={i}>{event}</li>)}</ul></OpsPanel>
    <button className="admin-btn" onClick={() => go(`/admin/order/ny?ursprung=${order.id}`)}>Skapa ersättningsorder</button>
  </>;
}
