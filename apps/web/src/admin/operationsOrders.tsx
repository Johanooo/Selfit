import { useEffect, useState, type FormEvent } from 'react';
import { useSearch } from 'wouter';
import { useAdminListState } from './adminInteractions';
import { balance, demoToday, ledgerEntry, money, orderValue, saveExchange, shipOrder, useOperations, variantLabel, warehouseName, warehouses, type OpsOrder, type Operations } from './operationsModel';
import { OpsBadge, OpsDialog, OpsEmpty, OpsError, OpsField, OpsHeading, OpsPanel, OpsTable, type ViewActions } from './operationsUi';
import { OperationalOrderInfo } from './operationsOrderInfo';

function reserveOrderChange(d: Operations, order: OpsOrder, lines: OpsOrder['lines']) {
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new Error('Antalet måste vara ett positivt heltal.');
    const old = order.lines.filter((l) => l.sku === line.sku).reduce((s, l) => s + l.quantity, 0);
    const wanted = lines.filter((l) => l.sku === line.sku).reduce((s, l) => s + l.quantity, 0);
    if (wanted > balance(d, line.sku, order.warehouse).available + old) throw new Error(`${line.sku} har inte tillräckligt säljbart saldo.`);
  }
  for (const old of order.lines) {
    const p = d.policies.find((p) => p.sku === old.sku && p.warehouse === order.warehouse);
    if (p) p.reserved = Math.max(0, p.reserved - old.quantity);
  }
  for (const line of lines) {
    const p = d.policies.find((p) => p.sku === line.sku && p.warehouse === order.warehouse)!;
    p.reserved += line.quantity;
    ledgerEntry(d, line.sku, order.warehouse, 'Reservation', -line.quantity, 'Ändrad order', order.id, `/admin/order/${order.id}`);
  }
  order.lines = lines; order.sku = lines.map((l) => l.sku).join(', ');
}
export function OperationalOrders({ go, notify }: ViewActions) {
  const { state } = useOperations();
  const query = useSearch();
  const scope = `ops-orders-${query}`;
  const [search, setSearch] = useAdminListState(scope, 'query', '');
  const [status, setStatus] = useAdminListState(scope, 'status', new URLSearchParams(query).get('status') === 'pausad' ? 'Pausad' : 'Alla');
  const [kind, setKind] = useAdminListState(scope, 'kind', new URLSearchParams(query).get('typ') === 'manuell' ? 'Manuell' : 'Alla');
  const rows = state.orders.filter((o) => `${o.id} ${o.email} ${o.sku} ${o.tracking}`.toLocaleLowerCase('sv-SE').includes(search.toLocaleLowerCase('sv-SE')) && (status === 'Alla' || o.status === status) && (kind === 'Alla' || o.kind === kind));
  return <><OpsHeading section="Försäljning" title="Ordrar" description="Webborder, manuella order och byten samlade på ett ställe." action={<button className="admin-btn primary" onClick={() => go('/admin/order/ny')}>Ny manuell order</button>} />
    <div className="admin-toolbar"><OpsField label="Sök order"><input className="admin-control" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ordernummer, e-post, SKU eller spårning" /></OpsField><OpsField label="Status"><select className="admin-control" value={status} onChange={(e) => setStatus(e.target.value)}>{['Alla', 'Att plocka', 'Pausad', 'Packas', 'Skickad', 'Levererad', 'Avbruten'].map((s) => <option key={s}>{s}</option>)}</select></OpsField><OpsField label="Ordertyp"><select className="admin-control" value={kind} onChange={(e) => setKind(e.target.value)}>{['Alla', 'Webborder', 'Manuell', 'Byte'].map((s) => <option key={s}>{s}</option>)}</select></OpsField><span>{rows.length} ordrar</span><button className="admin-btn small" onClick={() => notify('Orderexport sammanställd lokalt.')}>Exportera</button></div>
    <OpsPanel title="Orderlista"><OpsTable id="ops-order-list" headers={['Order', 'Kund', 'Typ', 'Summa', 'Betalning', 'Status', 'Lager']}>{rows.map((o) => <tr key={o.id} data-row-href={`/admin/order/${o.id}`}><td><strong>{o.id}</strong><span className="subtext">{o.date}</span></td><td>{o.email}</td><td>{o.kind}</td><td>{money(o.amount)}</td><td>{o.payment}</td><td><OpsBadge>{o.status}</OpsBadge>{o.holdReason && <span className="subtext">{o.holdReason}</span>}</td><td>{warehouseName(o.warehouse)}</td></tr>)}</OpsTable>{!rows.length && <OpsEmpty />}</OpsPanel>
  </>;
}
export function OperationalOrderDetail({ id, go, notify }: ViewActions & { id: string }) {
  const { state, commit } = useOperations();
  const order = state.orders.find((o) => o.id === id);
  const [dialog, setDialog] = useState<'pause' | 'edit' | ''>('');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<OpsOrder['lines']>(() => order?.lines.map((l) => ({ ...l })) ?? []);
  const [address, setAddress] = useState(order?.address ?? '');
  const [error, setError] = useState('');
  if (!order) return <OpsPanel title="Ordern finns inte"><p>Gå tillbaka till orderlistan.</p></OpsPanel>;
  const editable = ['Att plocka', 'Pausad'].includes(order.status);
  const difference = orderValue(state, lines) - orderValue(state, order.lines);
  const perform = (fn: () => void) => { try { fn(); setError(''); setDialog(''); } catch (e) { setError((e as Error).message); } };
  const save = (e: FormEvent) => { e.preventDefault(); perform(() => {
    if (!address.trim()) throw new Error('Ange leveransadress.');
    commit((d) => {
      const o = d.orders.find((o) => o.id === id)!;
      if (!['Att plocka', 'Pausad'].includes(o.status)) throw new Error('Ordern har börjat plockas och kan inte ändras.');
      reserveOrderChange(d, o, lines.map((l) => ({ ...l }))); o.address = address; o.amount = orderValue(d, lines);
      o.events.unshift(`Order ändrad före plock · ${demoToday} · Ella Svensson · ${difference < 0 ? `Delåterbetalning ${money(-difference)}` : difference > 0 ? `Betallänk ${money(difference)} skapad (simulerat)` : 'Ingen prisskillnad'}`);
      if (difference > 0) o.payment = 'Väntar';
    }); notify('Orderändringen sparades lokalt. Ingen betalning genomfördes.');
  }); };
  return <div className="ops-stack"><OpsHeading section="Försäljning / Ordrar" title={`Order ${order.id}`} description={`${order.email} · ${order.kind}`} action={order.status === 'Pausad' ? <button className="admin-btn primary" onClick={() => perform(() => { commit((d) => { const o = d.orders.find((o) => o.id === id)!; o.status = o.previousStatus || 'Att plocka'; o.holdReason = ''; o.events.unshift('Order släppt till lager · Ella Svensson'); }); notify('Ordern är släppt till lagerflödet.'); })}>Släpp order</button> : <button className="admin-btn primary" disabled={!editable} onClick={() => { setReason(''); setError(''); setDialog('pause'); }}>Pausa order</button>} />
    <div className="ops-inline"><OpsBadge>{order.status}</OpsBadge><span>{warehouseName(order.warehouse)}</span>{order.holdReason && <strong role="status">Pausad: {order.holdReason}. Skickas inte till plock och pack.</strong>}</div>
    {order.originalOrder && <p>Kopplad till <a href={`/admin/order/${order.originalOrder}`} onClick={(e) => { e.preventDefault(); go(`/admin/order/${order.originalOrder}`); }}>{order.originalOrder}</a>{order.returnId && <> · <a href={`/admin/returer/${order.returnId}`} onClick={(e) => { e.preventDefault(); go(`/admin/returer/${order.returnId}`); }}>{order.returnId}</a></>}</p>}
    {state.orders.filter((o) => o.originalOrder === id).map((o) => <p key={o.id}>Kopplad bytes-/ersättningsorder: <a href={`/admin/order/${o.id}`} onClick={(e) => { e.preventDefault(); go(`/admin/order/${o.id}`); }}>{o.id}</a></p>)}
    <OpsError message={error} />
    <OpsPanel title="Orderrader" action={<button className="admin-btn" disabled={!editable} onClick={() => { setLines(order.lines.map((l) => ({ ...l }))); setAddress(order.address); setError(''); setDialog('edit'); }}>Ändra order</button>}>
      {!editable && <p className="ops-note">Ordern kan bara ändras före plock.</p>}
      <OpsTable id="ops-order-lines" headers={['Variant', 'SKU', 'Antal', 'Pris', 'Pant', 'Moms']}>{order.lines.map((l, i) => { const v = state.variants.find((v) => v.sku === l.sku); return <tr key={i} data-row-href={`/admin/saldo/${l.sku}`}><td>{variantLabel(v)}</td><td>{l.sku}</td><td>{l.quantity}</td><td>{money((v?.price ?? 0) * l.quantity)}</td><td>{money((v?.deposit ?? 0) * l.quantity)}</td><td>{v?.vat} %</td></tr>; })}</OpsTable><p>Leveransadress: <strong>{order.address}</strong></p>
    </OpsPanel>
    <OperationalOrderInfo order={order} go={go} notify={notify} />
    <OpsPanel title="Avbokning och utskrift"><div className="ops-inline"><button className="admin-btn" onClick={() => window.print()}>Skriv ut order</button><button className="admin-btn danger" disabled={!editable} onClick={() => { commit((d) => { const o = d.orders.find((o) => o.id === id)!; o.status = 'Avbruten'; o.events.unshift('Order avbruten · Ella Svensson'); }); notify('Ordern avbröts lokalt.'); }}>Avbryt order</button></div></OpsPanel>
    <OpsDialog title="Pausa order" open={dialog === 'pause'} onOpenChange={(open) => { if (!open) setDialog(''); }}><form onSubmit={(e) => { e.preventDefault(); perform(() => { commit((d) => { const o = d.orders.find((o) => o.id === id)!; o.previousStatus = o.status; o.status = 'Pausad'; o.holdReason = reason; o.events.unshift(`Order pausad: ${reason} · Ella Svensson`); }); notify('Ordern är pausad och visas inte i plockkön.'); }); }}><p>En pausad order hålls kvar här och skickas inte till lagret.</p><OpsField label="Orsak"><select className="admin-control" required value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Välj orsak</option>{['Misstänkt bedrägeri', 'Kundens begäran', 'Adressfel'].map((s) => <option key={s}>{s}</option>)}</select></OpsField><button className="admin-btn primary">Pausa order</button></form></OpsDialog>
    <OpsDialog title="Ändra order före plock" open={dialog === 'edit'} onOpenChange={(open) => { if (!open) setDialog(''); }}><form onSubmit={save}>{lines.map((line, i) => <div className="admin-form-grid" key={i}><OpsField label={`Variant ${i + 1}`}><select className="admin-control" value={line.sku} onChange={(e) => setLines(lines.map((l, n) => n === i ? { ...l, sku: e.target.value } : l))}>{state.variants.map((v) => <option key={v.sku} value={v.sku}>{variantLabel(v)}</option>)}</select></OpsField><OpsField label={`Antal ${i + 1}`}><input className="admin-control" required type="number" min="1" step="1" value={line.quantity} onChange={(e) => setLines(lines.map((l, n) => n === i ? { ...l, quantity: Number(e.target.value) } : l))} /></OpsField></div>)}<OpsField label="Leveransadress"><textarea className="admin-control" required value={address} onChange={(e) => setAddress(e.target.value)} /></OpsField><p role="status">Prisskillnad: <strong>{money(difference)}</strong>. {difference < 0 ? `Delåterbetalning ${money(-difference)}.` : difference > 0 ? `Betallänk på ${money(difference)} skapas (simulerat).` : 'Ingen betalningsändring.'}</p><OpsError message={error} /><button className="admin-btn primary">Spara orderändring</button></form></OpsDialog>
  </div>;
}

export function ManualOrderForm({ go, notify }: ViewActions) {
  const { state, commit } = useOperations(); const query = new URLSearchParams(useSearch());
  const original = state.orders.find((o) => o.id === query.get('ursprung'));
  const [email, setEmail] = useState(query.get('kund') ?? original?.email ?? '');
  const [warehouse, setWarehouse] = useState('dsv'); const [reason, setReason] = useState(original ? 'Ersättning' : '');
  const [payment, setPayment] = useState('Ingen betalning (0 kr)'); const [originalId, setOriginalId] = useState(original?.id ?? '');
  const [lines, setLines] = useState([{ sku: 'PWO-BL-06', quantity: 1 }]); const [error, setError] = useState('');
  return <div className="ops-stack"><OpsHeading section="Försäljning / Ordrar" title="Ny manuell order" description="Ordern skickas till valt lager som en vanlig order. Inga riktiga köp genomförs." /><OpsPanel title="Orderuppgifter"><form className="ops-stack" onSubmit={(e) => { e.preventDefault(); try {
    const id = commit((d) => {
      if (!reason || !email) throw new Error('Kund och orsak krävs.');
      for (const l of lines) if (!Number.isInteger(l.quantity) || l.quantity < 1 || balance(d, l.sku, warehouse).available < l.quantity) throw new Error('Kontrollera antal och tillgängligt saldo.');
      const id = `MO-${Date.now()}`; const o: OpsOrder = { id, email, date: '24 november 2026', amount: payment.startsWith('Ingen') ? 0 : orderValue(d, lines), status: 'Att plocka', payment: payment.startsWith('Ingen') ? 'Ingen betalning' : 'Väntar', sku: lines.map((l) => l.sku).join(', '), tracking: '—', warehouse, kind: 'Manuell', lines: [], address: 'Sankt Eriksgatan 42, 112 34 Stockholm', holdReason: '', previousStatus: '', originalOrder: originalId || undefined, reason, events: [`Manuell order: ${reason} · Ella Svensson · ${payment}`] };
      reserveOrderChange(d, o, lines); d.orders.unshift(o); return id;
    }); go(`/admin/order/${id}`); notify('Manuell order skapad lokalt.'); } catch (e) { setError((e as Error).message); } }}>
      <div className="admin-form-grid"><OpsField label="Kund"><select className="admin-control" required value={email} onChange={(e) => setEmail(e.target.value)}><option value="">Välj kund</option>{[...new Set(state.orders.map((o) => o.email))].map((s) => <option key={s}>{s}</option>)}</select></OpsField><OpsField label="Orsak"><select className="admin-control" required value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Välj orsak</option>{['Ersättning', 'Reklamation', 'Kompensation', 'Telefonorder'].map((s) => <option key={s}>{s}</option>)}</select></OpsField><OpsField label="Ursprungsorder"><select className="admin-control" value={originalId} onChange={(e) => setOriginalId(e.target.value)}><option value="">Ingen koppling</option>{state.orders.map((o) => <option key={o.id}>{o.id}</option>)}</select></OpsField><OpsField label="Lager"><select className="admin-control" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></OpsField></div>
      {lines.map((l, i) => <div className="admin-form-grid" key={i}><OpsField label={`Variant ${i + 1}`}><select className="admin-control" value={l.sku} onChange={(e) => setLines(lines.map((line, n) => n === i ? { ...line, sku: e.target.value } : line))}>{state.variants.map((v) => <option key={v.sku} value={v.sku}>{variantLabel(v)}</option>)}</select></OpsField><OpsField label={`Antal ${i + 1}`}><input className="admin-control" required min="1" type="number" value={l.quantity} onChange={(e) => setLines(lines.map((line, n) => n === i ? { ...line, quantity: Number(e.target.value) } : line))} /></OpsField></div>)}
      <button className="admin-btn" type="button" onClick={() => setLines([...lines, { sku: 'KRE-300', quantity: 1 }])}>Lägg till variant</button><OpsField label="Betalning"><select className="admin-control" value={payment} onChange={(e) => setPayment(e.target.value)}><option>Ingen betalning (0 kr)</option><option>Skicka betallänk</option></select></OpsField><OpsError message={error} /><button className="admin-btn primary">Skapa manuell order</button>
    </form></OpsPanel></div>;
}

export function OperationalReturns({ id, go, notify }: ViewActions & { id?: string }) {
  const { state, commit } = useOperations(); const [query, setQuery] = useAdminListState('ops-returns', 'query', ''); const [status, setStatus] = useAdminListState('ops-returns', 'status', 'Alla'); const [error, setError] = useState('');
  const r = state.returns.find((r) => r.id === id);
  const patch = (key: 'outcome' | 'exchangeSku' | 'disposition', value: string) => commit((d) => { Object.assign(d.returns.find((r) => r.id === id)!, { [key]: value }); });
  if (!id) { const rows = state.returns.filter((r) => `${r.id} ${r.orderId} ${r.sku}`.toLowerCase().includes(query.toLowerCase()) && (status === 'Alla' || status === r.status)); return <><OpsHeading section="Försäljning" title="Returer och byten" description="Återbetalning eller ny vara från samma returärende." /><div className="admin-toolbar"><OpsField label="Sök retur"><input className="admin-control" value={query} onChange={(e) => setQuery(e.target.value)} /></OpsField><OpsField label="Status"><select className="admin-control" value={status} onChange={(e) => setStatus(e.target.value)}>{['Alla', 'Granskas', 'Återbetald', 'Byte skapat'].map((s) => <option key={s}>{s}</option>)}</select></OpsField></div><OpsPanel title="Returärenden"><OpsTable id="ops-returns" headers={['Retur', 'Order', 'SKU', 'Orsak', 'Hantering', 'Status']}>{rows.map((r) => <tr key={r.id} data-row-href={`/admin/returer/${r.id}`}><td>{r.id}</td><td>{r.orderId}</td><td>{r.sku}</td><td>{r.reason}</td><td>{r.outcome}</td><td><OpsBadge>{r.status}</OpsBadge></td></tr>)}</OpsTable>{!rows.length && <OpsEmpty />}</OpsPanel></>; }
  if (!r) return <OpsEmpty>Returen finns inte.</OpsEmpty>;
  const oldVariant = state.variants.find((v) => v.sku === r.sku)!; const newVariant = state.variants.find((v) => v.sku === r.exchangeSku)!;
  const difference = ((newVariant.price + newVariant.deposit) - (oldVariant.price + oldVariant.deposit)) * r.quantity;
  return <div className="ops-stack"><OpsHeading section="Försäljning / Returer och byten" title={r.id} description={r.reason} /><OpsPanel title="Returvara"><p>{variantLabel(oldVariant)} · {r.quantity} st</p><p>Ursprungsorder: <a href={`/admin/order/${r.orderId}`} onClick={(e) => { e.preventDefault(); go(`/admin/order/${r.orderId}`); }}>{r.orderId}</a></p><OpsBadge>{r.status}</OpsBadge></OpsPanel><OpsPanel title="Beslut"><div className="ops-stack"><OpsField label="Åtgärd"><select className="admin-control" disabled={r.status !== 'Granskas'} value={r.outcome} onChange={(e) => patch('outcome', e.target.value)}><option>Återbetalning</option><option>Byte</option></select></OpsField><OpsField label="Lagrets kontrollresultat"><select className="admin-control" disabled={r.status !== 'Granskas'} value={r.disposition} onChange={(e) => patch('disposition', e.target.value)}><option>Åter i lager</option><option>Kassera</option></select></OpsField>{r.outcome === 'Byte' && <><OpsField label="Ny variant"><select className="admin-control" disabled={r.status !== 'Granskas'} value={r.exchangeSku} onChange={(e) => patch('exchangeSku', e.target.value)}>{state.variants.map((v) => <option key={v.sku} value={v.sku}>{variantLabel(v)}</option>)}</select></OpsField><p>Prisskillnad: <strong>{money(difference)}</strong> · {difference > 0 ? 'Betallänk (simulerad)' : difference < 0 ? 'Delåterbetalning (simulerad)' : 'Inget att betala'}.</p></>}<OpsError message={error} />{r.exchangeOrderId ? <p>Skapad bytesorder: <a href={`/admin/order/${r.exchangeOrderId}`} onClick={(e) => { e.preventDefault(); go(`/admin/order/${r.exchangeOrderId}`); }}>{r.exchangeOrderId}</a></p> : <button className="admin-btn primary" disabled={r.status !== 'Granskas'} onClick={() => { try {
    commit((d) => { const row = d.returns.find((item) => item.id === id)!; const order = d.orders.find((o) => o.id === row.orderId)!;
      if (row.outcome === 'Byte') { const newId = saveExchange(d, row.id); const exchange = d.orders.find((o) => o.id === newId)!; exchange.events.unshift(`Prisskillnad ${money(difference)} · ${difference > 0 ? 'Betallänk' : 'Delåterbetalning / jämnt byte'} (simulerat)`); if (difference > 0) exchange.payment = 'Väntar'; } else { row.status = 'Återbetald'; order.events.unshift(`Återbetalning godkänd för ${row.id} · Ella Svensson`); }
      if (row.disposition === 'Åter i lager') { d.batches.push({ id: crypto.randomUUID(), sku: row.sku, warehouse: order.warehouse, code: `RET-${row.id}`, expiry: '2027-08-31', quantity: row.quantity, status: 'Säljbar' }); ledgerEntry(d, row.sku, order.warehouse, 'Retur', row.quantity, 'Kontrollerad retur åter i lager', row.id, `/admin/returer/${row.id}`); }
    }); setError(''); notify(r.outcome === 'Byte' ? 'Kopplad bytesorder skapad lokalt.' : 'Återbetalning godkänd lokalt.'); } catch (e) { setError((e as Error).message); } }}>{r.outcome === 'Byte' ? 'Godkänn byte och skapa order' : 'Godkänn återbetalning'}</button>}</div></OpsPanel></div>;
}

export function PickPackView({ go, notify }: ViewActions) {
  const { state, commit } = useOperations(); const [orderId, setOrderId] = useState(''); const [carrier, setCarrier] = useState('PostNord'); const [tracking, setTracking] = useState(''); const [error, setError] = useState('');
  const queue = state.orders.filter((o) => ['Att plocka', 'Packas'].includes(o.status));
  const selected = queue.find((o) => o.id === orderId);
  const confirmShipment = () => { try { commit((d) => shipOrder(d, orderId, tracking, carrier)); setOrderId(''); setError(''); notify('Ordern markerades som skickad och lagerhistoriken uppdaterades lokalt.'); } catch (e) { setError((e as Error).message); } };
  return <div className="ops-stack">
    <OpsHeading title="Plock och pack" description="Pausade order ligger kvar under Ordrar och går inte till plock. Inleveranser hanteras under Inköp och inleveranser." action={<button className="admin-btn primary" onClick={() => window.print()}>Skriv ut plocklista</button>} />
    <OpsPanel title="Plockkö">
      <OpsTable id="ops-pick" headers={['Order', 'Kund', 'Lager', 'Rader', 'Status', 'Åtgärd']}>{queue.map((o) => <tr key={o.id} data-row-href={`/admin/order/${o.id}`}>
        <td>{o.id}</td><td>{o.email}</td><td>{warehouseName(o.warehouse)}</td><td>{o.lines.length}</td><td><OpsBadge>{o.status}</OpsBadge></td>
        <td><button className="admin-btn small" onClick={() => { setOrderId(o.id); commit((d) => { d.orders.find((order) => order.id === o.id)!.status = 'Packas'; }); }}>Plocka och packa</button></td>
      </tr>)}</OpsTable>
      {!queue.length && <OpsEmpty>Inga order väntar på plock.</OpsEmpty>}
    </OpsPanel>
    {selected && <OpsPanel title={`Packsedel · ${selected.id}`}><div className="ops-stack">
      <p>{selected.address}</p>
      {selected.lines.map((l, i) => <label className="admin-toggle-row" key={i}><input type="checkbox" />{l.sku} · {l.quantity} st · plockad</label>)}
      <button className="admin-btn" onClick={() => window.print()}>Skriv ut packsedel</button>
      <OpsField label="Transportör"><select className="admin-control" value={carrier} onChange={(e) => setCarrier(e.target.value)}><option>PostNord</option><option>DHL</option><option>DSV</option></select></OpsField>
      <OpsField label="Spårningsnummer"><input className="admin-control" required value={tracking} onChange={(e) => setTracking(e.target.value)} /></OpsField>
      <OpsError message={error} /><button className="admin-btn primary" onClick={confirmShipment}>Markera som skickad</button>
    </div></OpsPanel>}
  </div>;
}
