import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { orderRows, type OrderRow } from './mockData';
import { announcePrototypeAction, NavigableRows, useAdminListState } from './adminInteractions';
import './businessAdmin.css';

type ViewProps = { go: (path: string) => void };
type ActionProps = ViewProps & { notify: (message: string) => void };

type Customer = {
  id: string; name: string; email: string; phone: string; orders: number; total: number;
  latest: string; newsletter: boolean; tags: string[]; address: string;
};

const initialCustomers: Customer[] = [
  { id: 'elin-andersson', name: 'Elin Andersson', email: 'elin.andersson@example.se', phone: '070-214 38 61', orders: 6, total: 2847, latest: '20 nov 2026', newsletter: true, tags: ['Återkommande', 'PWO+'], address: 'Sankt Eriksgatan 42, 112 34 Stockholm' },
  { id: 'mikael-berg', name: 'Mikael Berg', email: 'mikael.berg@example.se', phone: '073-802 17 44', orders: 3, total: 1468, latest: '20 nov 2026', newsletter: false, tags: ['Träning'], address: 'Linnégatan 18, 413 04 Göteborg' },
  { id: 'sara-lind', name: 'Sara Lind', email: 'sara.lind@example.se', phone: '070-991 03 27', orders: 9, total: 5162, latest: '20 nov 2026', newsletter: true, tags: ['Återkommande', 'VIP'], address: 'Storgatan 7, 753 31 Uppsala' },
  { id: 'noah-nilsson', name: 'Noah Nilsson', email: 'noah.nilsson@example.se', phone: '076-445 91 02', orders: 1, total: 198, latest: '20 nov 2026', newsletter: false, tags: ['Ny kund'], address: 'Västra Hamngatan 12, 411 17 Göteborg' },
  { id: 'ida-ek', name: 'Ida Ek', email: 'ida.ek@example.se', phone: '072-340 51 86', orders: 2, total: 608, latest: '20 nov 2026', newsletter: true, tags: ['Hälsa'], address: 'Storgatan 21, 582 23 Linköping' },
  { id: 'oliver-sund', name: 'Oliver Sund', email: 'oliver.sund@example.se', phone: '070-112 84 30', orders: 4, total: 2281, latest: '19 nov 2026', newsletter: true, tags: ['Återkommande'], address: 'Drottninggatan 5, 211 25 Malmö' },
];

type CustomerHistoryRow = { id: string; date: string; amount: number; status: string; current: boolean };
const pastCustomerOrders: Record<string, CustomerHistoryRow[]> = {
  'elin-andersson': [
    { id: 'SF-261104-019', date: '4 november, 12:18', amount: 499, status: 'Levererad', current: false },
    { id: 'SF-261006-0633', date: '6 oktober, 16:08', amount: 529, status: 'Levererad', current: false },
    { id: 'SF-260917-0540', date: '17 september, 11:34', amount: 369, status: 'Levererad', current: false },
    { id: 'SF-260820-0431', date: '20 augusti, 09:45', amount: 499, status: 'Levererad', current: false },
    { id: 'SF-260604-0215', date: '4 juni, 13:19', amount: 373, status: 'Levererad', current: false },
  ],
  'mikael-berg': [
    { id: 'SF-261110-0731', date: '10 november, 12:05', amount: 520, status: 'Levererad', current: false },
    { id: 'SF-261005-0611', date: '5 oktober, 10:22', amount: 520, status: 'Levererad', current: false },
  ],
  'sara-lind': [
    { id: 'SF-261115-0763', date: '15 november, 14:10', amount: 520, status: 'Levererad', current: false },
    { id: 'SF-261026-0651', date: '26 oktober, 15:02', amount: 480, status: 'Levererad', current: false },
    { id: 'SF-261010-0620', date: '10 oktober, 09:12', amount: 575, status: 'Levererad', current: false },
    { id: 'SF-260918-0547', date: '18 september, 13:48', amount: 600, status: 'Levererad', current: false },
    { id: 'SF-260902-0501', date: '2 september, 16:28', amount: 590, status: 'Levererad', current: false },
    { id: 'SF-260821-0442', date: '21 augusti, 08:31', amount: 540, status: 'Levererad', current: false },
    { id: 'SF-260809-0399', date: '9 augusti, 12:10', amount: 550, status: 'Levererad', current: false },
    { id: 'SF-260725-0251', date: '25 juli, 10:44', amount: 480, status: 'Levererad', current: false },
  ],
  'ida-ek': [{ id: 'SF-261108-0714', date: '8 november, 10:05', amount: 289, status: 'Levererad', current: false }],
  'oliver-sund': [
    { id: 'SF-261115-0751', date: '15 november, 11:21', amount: 500, status: 'Levererad', current: false },
    { id: 'SF-261028-0663', date: '28 oktober, 14:42', amount: 524, status: 'Levererad', current: false },
    { id: 'SF-260913-0521', date: '13 september, 09:54', amount: 600, status: 'Levererad', current: false },
  ],
};

const customerOrdersFor = (customer: Customer): CustomerHistoryRow[] => [
  ...orderRows.filter((order) => order.email === customer.email).map((order) => ({ id: order.id, date: order.date, amount: order.amount, status: order.status, current: true })),
  ...(pastCustomerOrders[customer.id] ?? []),
];

const money = (value: number) => `${new Intl.NumberFormat('sv-SE').format(value)} kr`;
const stamp = '20 november 2026, 10:48';

function Heading({ kicker, title, description, actions }: { kicker: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="admin-page-heading"><div><p className="admin-kicker">{kicker}</p><h1>{title}</h1><p>{description}</p></div>{actions && <div className="admin-actions">{actions}</div>}</div>;
}

function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="admin-panel"><header className="admin-panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header><div className="admin-panel-body">{children}</div></section>;
}

function Button({ children, onClick, testId, kind = '', small = false, type = 'button', disabled = false }: { children: ReactNode; onClick?: () => void; testId: string; kind?: string; small?: boolean; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button type={type} className={`admin-btn ${kind} ${small ? 'small' : ''}`} onClick={onClick ?? (type === 'button' ? () => announcePrototypeAction(String(children)) : undefined)} data-testid={testId} disabled={disabled}>{children}</button>;
}

function Status({ children, testId }: { children: string; testId: string }) {
  const stockNumber = Number(children.match(/^(\d+)/)?.[1] ?? Infinity);
  const tone = /delvis|utkast|väntar|nej/i.test(children) || stockNumber <= 4 ? 'warn' : /mottagen|betald|ja|bekräftad|godkänd|klar/i.test(children) ? 'good' : 'info';
  return <span className={`admin-status ${tone}`} data-testid={testId}>{children}</span>;
}

function Table({ headers, children, testId, go }: { headers: string[]; children: ReactNode; testId: string; go?: (path: string) => void }) {
  return <div className="admin-table-wrap"><table className="admin-table" data-testid={testId}><thead><tr>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead><tbody><NavigableRows go={go} tableId={testId} headers={headers}>{children}</NavigableRows></tbody></table></div>;
}

function Field({ label, id, value, onChange, type = 'text', required = false, placeholder, options, testId, min }: {
  label: string; id: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean;
  placeholder?: string; options?: string[]; testId: string; min?: number;
}) {
  return <div className="admin-field"><label htmlFor={id}>{label}{required ? ' *' : ''}</label>{options
    ? <select id={id} className="admin-control" value={value} onChange={(event) => onChange(event.target.value)} required={required} data-testid={testId}>{options.map((option) => { const [optionValue, optionLabel] = option.includes('|') ? option.split('|', 2) : [option, option]; return <option key={option} value={optionValue}>{optionLabel}</option>; })}</select>
    : <input id={id} className="admin-control" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} min={min} placeholder={placeholder} data-testid={testId} />}</div>;
}

export function CustomersView({ go }: ViewProps) {
  const [query, setQuery] = useAdminListState('kunder', 'query', '');
  const [tag, setTag] = useAdminListState('kunder', 'tag', 'Alla taggar');
  const [consent, setConsent] = useAdminListState('kunder', 'consent', 'Alla');
  const tags = [...new Set(initialCustomers.flatMap((customer) => customer.tags))];
  const rows = initialCustomers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone} ${customerOrdersFor(customer).map((order) => order.id).join(' ')}`.toLocaleLowerCase('sv-SE').includes(query.toLocaleLowerCase('sv-SE'))
    && (tag === 'Alla taggar' || customer.tags.includes(tag))
    && (consent === 'Alla' || (consent === 'Ja' ? customer.newsletter : !customer.newsletter)));
  return <>
    <Heading kicker="Kundrelationer" title="Kunder" description="Samlad kundhistorik, kontaktuppgifter och samtycken." actions={<Button onClick={() => go('/admin/manuella-order')} testId="button-new-manual-order">Skapa manuell order</Button>} />
    <div className="admin-toolbar">
      <div className="admin-search"><label className="admin-search-label" htmlFor="customer-search">Sök kunder</label><input id="customer-search" className="admin-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Namn, e-post, telefon eller ordernummer" data-testid="input-search-customers" /></div>
      <label className="admin-filter-label">Tagg<select className="admin-control" value={tag} onChange={(event) => setTag(event.target.value)} data-testid="filter-customer-tag"><option>Alla taggar</option>{tags.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="admin-filter-label">Nyhetsbrev<select className="admin-control" value={consent} onChange={(event) => setConsent(event.target.value)} data-testid="filter-customer-newsletter"><option>Alla</option><option>Ja</option><option>Nej</option></select></label>
      <span className="admin-status info" data-testid="text-customer-count">{rows.length} kunder</span>
    </div>
    <p className="business-admin-note" data-testid="text-guest-order-note">Gästordrar med samma e-postadress samlas i ett kundkort. All information på sidan är lokal exempeldata.</p>
    <div className="admin-panel"><Table headers={['Kund', 'E-post', 'Ordrar', 'Köp totalt', 'Senaste order', 'Nyhetsbrev', 'Taggar', '']} testId="table-customers" go={go}>
      {rows.map((customer) => <tr key={customer.id} data-row-href={`/admin/kunder/${customer.id}`} data-row-label={`Öppna kundkort för ${customer.name}`} data-testid={`row-customer-${customer.id}`}><td><strong>{customer.name}</strong><span className="subtext">{customer.phone}</span></td><td>{customer.email}</td><td>{customer.orders}</td><td className="num">{money(customer.total)}</td><td>{customer.latest}</td><td><Status testId={`status-newsletter-${customer.id}`}>{customer.newsletter ? 'Ja' : 'Nej'}</Status></td><td><div className="business-admin-tags">{customer.tags.map((item) => <span className="business-admin-tag" key={item}>{item}</span>)}</div></td><td><Button small onClick={() => go(`/admin/kunder/${customer.id}`)} testId={`button-open-customer-${customer.id}`}>Kundkort</Button></td></tr>)}
      {!rows.length && <tr><td colSpan={8}><div className="admin-empty" data-testid="empty-customers">Inga kunder matchar filtreringen. Ändra sökning eller filter.</div></td></tr>}
    </Table></div>
  </>;
}

export function CustomerDetailView({ customerId, go, notify }: { customerId: string; go: (path: string) => void; notify: (message: string) => void }) {
  const customer = initialCustomers.find((item) => item.id === customerId) ?? initialCustomers[0];
  const [notes, setNotes] = useState([{ text: 'Föredrar leverans till ombud nära hemmet.', author: 'Ella Svensson', time: '18 nov 2026, 14:22' }]);
  const [newNote, setNewNote] = useState('');
  const [tags, setTags] = useState(customer.tags);
  const [confirm, setConfirm] = useState(false);
  const [anonymized, setAnonymized] = useState(false);
  const customerOrders = customerOrdersFor(customer);
  const addNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newNote.trim()) return;
    setNotes([{ text: newNote.trim(), author: 'Ella Svensson', time: stamp }, ...notes]);
    setNewNote('');
    notify('Intern anteckning lades till lokalt.');
  };
  return <>
    <Heading kicker="Kunder / kundkort" title={anonymized ? 'Anonymiserad kund' : customer.name} description={`${customer.email} · Kund sedan 4 februari 2025`} actions={<><Button onClick={() => go('/admin/manuella-order')} testId="button-customer-manual-order">Skapa manuell order</Button><Button onClick={() => notify('GDPR-export skapades som lokal förhandsvisning.')} testId="button-gdpr-export">Exportera kunddata</Button><Button kind="danger" onClick={() => setConfirm(true)} testId="button-open-anonymize">Anonymisera</Button></>} />
     <div className="admin-grid dashboard">
      <div className="admin-grid">
        <Panel title="Kontakt & adress" subtitle="Uppgifter för kundkommunikation och leverans"><div className="admin-metric-line"><span>E-post</span><strong data-testid="text-customer-email">{anonymized ? 'raderad@example.se' : customer.email}</strong></div><div className="admin-metric-line"><span>Telefon</span><strong>{anonymized ? 'Borttagen' : customer.phone}</strong></div><div className="admin-metric-line"><span>Leveransadress</span><strong>{anonymized ? 'Borttagen' : customer.address}</strong></div><div className="admin-metric-line"><span>Fakturaadress</span><strong>{anonymized ? 'Borttagen' : customer.address}</strong></div><div className="admin-metric-line"><span>Kund sedan</span><strong>4 februari 2025</strong></div></Panel>
        <Panel title="Orderhistorik" subtitle="Alla lokala order kopplade till kundens e-post"><Table headers={['Order', 'Datum', 'Summa', 'Status', '']} testId="table-customer-orders" go={go}>{customerOrders.map((order) => <tr key={order.id} data-row-href={order.current ? `/admin/order/${order.id}` : `/admin/detalj/orderhistorik/${encodeURIComponent(order.id)}`} data-row-label={`Öppna order ${order.id}`}><td><strong>{order.id}</strong></td><td>{order.date}</td><td className="num">{money(order.amount)}</td><td><Status testId={`status-customer-order-${order.id}`}>{order.status}</Status></td><td>{order.current ? <Button small onClick={() => go(`/admin/order/${order.id}`)} testId={`button-customer-order-${order.id}`}>Visa order</Button> : <span className="business-admin-subline">Historisk order</span>}</td></tr>)}{!customerOrders.length && <tr><td colSpan={5}><div className="admin-empty">Inga order i den lokala exempel­datan.</div></td></tr>}</Table></Panel>
        <Panel title="Returer & reklamationer" subtitle="Ärenden kopplade till kundens köp">{customer.id === 'elin-andersson' ? <><div className="admin-metric-line"><span>RET-261104-019 · SF-261104-019</span><Status testId="status-customer-return">Avslutad</Status></div><p className="business-admin-subline">Fel variant · återbetalning 149 kr · 4 nov 2026</p><div className="admin-empty" data-testid="text-customer-claims">Inga öppna reklamationer.</div></> : <div className="admin-empty" data-testid="text-customer-claims">Inga registrerade returer eller reklamationer.</div>}</Panel>
        <Panel title="Interna anteckningar" subtitle="Synliga för personal, aldrig för kunden"><form className="business-admin-note-form" onSubmit={addNote}><label className="admin-field"><span>Ny anteckning</span><textarea className="admin-control" value={newNote} onChange={(event) => setNewNote(event.target.value)} required rows={3} data-testid="input-customer-note" /></label><Button kind="primary" type="submit" testId="button-add-customer-note">Lägg till anteckning</Button></form><div className="admin-timeline">{notes.map((note, index) => <div className="admin-event" key={`${note.time}-${index}`} data-testid={`note-customer-${index}`}><strong>{note.author}</strong>{note.text}<time>{note.time}</time></div>)}</div></Panel>
      </div>
      <div className="admin-grid">
        <Panel title="Kundvärde" subtitle="Summerat från lokala exempelordrar"><div className="business-admin-metric-grid"><div><span>Ordrar</span><strong data-testid="metric-customer-orders">{customer.orders}</strong></div><div><span>Köp totalt</span><strong data-testid="metric-customer-total">{money(customer.total)}</strong></div><div><span>Snittorder</span><strong>{money(Math.round(customer.total / customer.orders))}</strong></div></div></Panel>
        <Panel title="Taggar" subtitle="Segmentering på kundkort"><div className="business-admin-tags">{tags.map((item) => <button type="button" className={`business-admin-tag-button ${tags.includes(item) ? 'is-selected' : ''}`} key={item} onClick={() => setTags((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} aria-pressed={tags.includes(item)} data-testid={`toggle-customer-tag-${item.toLowerCase().replace(/\W+/g, '-')}`}>{item}</button>)}</div></Panel>
        <Panel title="Rabattkoder" subtitle="Koder använda vid köp"><div className="business-admin-code-row"><code>VÄLKOMMEN10</code><span>10 % · 4 feb 2025</span></div><div className="business-admin-code-row"><code>ÅTERKÖP15</code><span>15 % · 12 sep 2026</span></div></Panel>
        <Panel title="Samtycken" subtitle="Tidsstämplade val från kunden"><div className="business-admin-consent"><strong>Nyhetsbrev</strong><Status testId="status-customer-consent">{customer.newsletter ? 'Ja' : 'Nej'}</Status><time>20 aug 2026, 09:14 · Checkout</time></div><div className="business-admin-consent"><strong>Personuppgiftspolicy</strong><Status testId="status-policy-consent">Bekräftad</Status><time>20 nov 2026, 10:42 · Checkout</time></div></Panel>
        <Panel title="Skickade mejl" subtitle="Senaste kommunikation"><div className="business-admin-code-row"><strong>Orderbekräftelse</strong><time>20 nov 2026, 10:43 · Skickat</time></div><div className="business-admin-code-row"><strong>Leveransbekräftelse</strong><time>16 nov 2026, 15:08 · Skickat</time></div></Panel>
      </div>
    </div>
    {confirm && <div className="business-admin-dialog-backdrop" role="presentation"><section className="business-admin-dialog" role="alertdialog" aria-modal="true" aria-labelledby="anonymize-title" aria-describedby="anonymize-copy" data-testid="dialog-anonymize-customer"><h2 id="anonymize-title">Anonymisera kund?</h2><p id="anonymize-copy">Kontaktuppgifter och direkt identifierande kunddata tas bort lokalt. Ordrar och kvitton finns kvar för bokföring och redovisning.</p><div className="admin-actions"><Button onClick={() => setConfirm(false)} testId="button-cancel-anonymize">Avbryt</Button><Button kind="danger" onClick={() => { setAnonymized(true); setConfirm(false); notify('Kundkortet anonymiserades lokalt. Ordrar och kvitton är kvar.'); }} testId="button-confirm-anonymize">Bekräfta anonymisering</Button></div></section></div>}
  </>;
}

type ManualOrder = { id: string; customer: string; reason: string; creator: string; amount: number; date: string };
const seedManualOrders: ManualOrder[] = [
  { id: 'MO-261120-004', customer: 'Sara Lind', reason: 'Ersättningsorder vid reklamation', creator: 'Ella Svensson', amount: 279, date: '20 nov 2026, 09:12' },
  { id: 'MO-261119-003', customer: 'Mikael Berg', reason: 'Telefonorder', creator: 'Jonas Holm', amount: 428, date: '19 nov 2026, 15:34' },
];

export function ManualOrdersView({ go, notify }: ActionProps) {
  const [rows, setRows] = useAdminListState('manuella-order', 'data', seedManualOrders);
  const [customer, setCustomer] = useState('');
  const [lines, setLines] = useState([{ id: 1, variant: 'PWO+ Pre-workout · Blåbär · 12-pack', quantity: '1' }]);
  const [reason, setReason] = useState('');
  const [original, setOriginal] = useState('');
  const [payment, setPayment] = useState('Ingen betalning (0 kr)');
  const [warehouse, setWarehouse] = useState('DSV 3PL · Jönköping');
  const variantOptions = ['PWO+ Pre-workout · Blåbär · 12-pack', 'PWO+ Pre-workout · Jordgubb · 6-pack', 'Kreatin Monohydrat · 300 g', 'D-vitamin 50 µg · 90 kapslar'];
  const unitPrice = (variant: string) => variant.includes('12-pack') ? 279 : variant.includes('6-pack') ? 149 : variant.includes('Kreatin') ? 249 : 89;
  const total = lines.reduce((sum, line) => sum + unitPrice(line.variant) * Number(line.quantity || 0), 0);
  const updateLine = (id: number, key: 'variant' | 'quantity', value: string) => setLines((current) => current.map((line) => line.id === id ? { ...line, [key]: value } : line));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const match = initialCustomers.find((item) => item.id === customer);
    if (lines.some((line) => Number(line.quantity) < 1)) return;
    const row: ManualOrder = { id: `MO-261120-${String(rows.length + 5).padStart(3, '0')}`, customer: match?.name ?? 'Ny kund', reason: `${reason}${original ? ` · ${original}` : ''}`, creator: 'Ella Svensson', amount: total, date: stamp };
    setRows([row, ...rows]); notify('Manuell order skapades lokalt och placerades i valt lagerflöde.'); setReason('');
  };
  return <>
    <Heading kicker="Order & lager" title="Manuella ordrar" description="Skapa ersättningar, kompensationer och telefonordrar i en lokal prototyp." actions={<Button onClick={() => go('/admin/order')} testId="button-back-orders">Till ordrar</Button>} />
    <div className="business-admin-banner" role="note" data-testid="text-manual-order-warehouse-note"><strong>Som en vanlig order.</strong> Manuella ordrar går vidare till valt plocklager och följer samma lagerflöde. Inga betalningar eller leveranser genomförs här.</div>
     <div className="admin-grid">
      <Panel title="Ny manuell order" subtitle="Fält med * behöver fyllas i">
        <form className="admin-form-grid" onSubmit={submit}>
          <Field label="Kund" id="manual-customer" value={customer} onChange={setCustomer} options={['|Välj kund', ...initialCustomers.map((item) => `${item.id}|${item.name} · ${item.email}`)]} required testId="select-manual-customer" />
          <div className="admin-field span-2">
            <span className="admin-section-label">Orderrader</span>
            {lines.map((line, index) => <div className="business-admin-line-item" key={line.id}>
              <Field label={`Variant ${index + 1}`} id={`manual-variant-${line.id}`} value={line.variant} onChange={(value) => updateLine(line.id, 'variant', value)} options={variantOptions} testId={`select-manual-variant-${line.id}`} />
              <Field label="Antal" id={`manual-quantity-${line.id}`} type="number" min={1} value={line.quantity} onChange={(value) => updateLine(line.id, 'quantity', value)} required testId={`input-manual-quantity-${line.id}`} />
              {lines.length > 1 && <Button small kind="danger" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} testId={`button-remove-manual-line-${line.id}`}>Ta bort rad</Button>}
            </div>)}
            <Button small onClick={() => setLines((current) => [...current, { id: Math.max(0, ...current.map((line) => line.id)) + 1, variant: variantOptions[0], quantity: '1' }])} testId="button-add-manual-line">＋ Lägg till variant</Button>
          </div>
          <Field label="Orsak" id="manual-reason" value={reason} onChange={setReason} options={['', 'Ersättning', 'Reklamation', 'Kompensation', 'Telefonorder']} required testId="select-manual-reason" />
          <Field label="Koppla till ursprunglig order" id="manual-original" value={original} onChange={setOriginal} options={['', ...orderRows.map((item) => item.id)]} testId="select-manual-original-order" />
          <Field label="Betalning" id="manual-payment" value={payment} onChange={setPayment} options={['Ingen betalning (0 kr)', 'Skicka betallänk']} testId="select-manual-payment" />
          <Field label="Plocklager" id="manual-warehouse" value={warehouse} onChange={setWarehouse} options={['DSV 3PL · Jönköping', 'Eget lager · Stockholm']} testId="select-manual-warehouse" />
          <div className="business-admin-form-foot"><p className="business-admin-subline">{lines.length === 1 ? '1 orderrad' : `${lines.length} orderrader`} · {money(total)} · Betalningsval: {payment}. Val av lager visas i orderns lokala händelser.</p><Button type="submit" kind="primary" testId="button-create-manual-order">Skapa order lokalt</Button></div>
        </form>
      </Panel>
      <Panel title="Senaste manuella ordrar" subtitle={`${rows.length} lokala exempel`}>
        <Table headers={['Order', 'Kund', 'Orsak', 'Skapad av', 'Summa', 'Datum']} testId="table-manual-orders">{rows.map((row) => <tr key={row.id} data-testid={`row-manual-order-${row.id}`}><td><strong>{row.id}</strong></td><td>{row.customer}</td><td>{row.reason}</td><td>{row.creator}</td><td className="num">{money(row.amount)}</td><td>{row.date}</td></tr>)}</Table>
      </Panel>
    </div>
  </>;
}

type PurchaseOrder = { id: string; supplier: string; lines: number; total: number; expected: string; warehouse: string; status: string };
const seedPurchaseOrders: PurchaseOrder[] = [
  { id: 'PO-2611-018', supplier: 'Nordic Nutrition AB', lines: 4, total: 28460, expected: '27 nov 2026', warehouse: 'DSV 3PL · Jönköping', status: 'Skickad' },
  { id: 'PO-2611-016', supplier: 'VitaForm Sverige', lines: 2, total: 12840, expected: '24 nov 2026', warehouse: 'Eget lager · Stockholm', status: 'Delvis mottagen' },
  { id: 'PO-2611-014', supplier: 'SELFIT Nutrition AB', lines: 3, total: 19400, expected: '22 nov 2026', warehouse: 'DSV 3PL · Jönköping', status: 'Mottagen' },
  { id: 'PO-2611-012', supplier: 'Nordic Nutrition AB', lines: 1, total: 6720, expected: '30 nov 2026', warehouse: 'Eget lager · Stockholm', status: 'Utkast' },
];

export function PurchaseOrdersView({ notify, go }: ActionProps) {
  const [rows, setRows] = useAdminListState('inkopsordrar', 'data', seedPurchaseOrders);
  const [supplier, setSupplier] = useState('');
  const [expected, setExpected] = useState('2026-11-30');
  const [warehouse, setWarehouse] = useState('DSV 3PL · Jönköping');
  const [status, setStatus] = useState('Utkast');
  const [lines, setLines] = useState([{ id: 1, sku: 'PWO-BL-12', quantity: '48', price: '112' }]);
  const [receipts, setReceipts] = useState<string[]>(['PO-2611-016']);
  const total = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.price || 0), 0);
  const updateLine = (id: number, key: 'sku' | 'quantity' | 'price', value: string) => setLines((current) => current.map((line) => line.id === id ? { ...line, [key]: value } : line));
  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lines.some((line) => Number(line.quantity) < 1 || Number(line.price) < 0)) return;
    const row = { id: `PO-2611-${String(19 + rows.length).padStart(3, '0')}`, supplier, lines: lines.length, total, expected: new Date(`${expected}T12:00:00`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' }), warehouse, status };
    setRows([row, ...rows]); notify('Inköpsorder skapades som lokal exempeldata.');
  };
  return <>
    <Heading kicker="Inköp & lager" title="Inköpsordrar" description="Planera inköp och följ mottagning per leverantör och lager." />
     <div className="admin-grid">
      <Panel title="Inköpsorder" subtitle="Utkast, skickade och mottagna inköp">
         <Table headers={['Order', 'Leverantör', 'Rader', 'Inköpsvärde', 'Beräknad ankomst', 'Mottagande lager', 'Status', '']} testId="table-purchase-orders" go={go}>{rows.map((row) => <tr key={row.id} data-row-href={`/admin/detalj/inkopsorder/${encodeURIComponent(row.id)}`} data-row-label={`Öppna inköpsorder ${row.id}`} data-testid={`row-purchase-order-${row.id}`}><td><strong>{row.id}</strong></td><td>{row.supplier}</td><td>{row.lines}</td><td className="num">{money(row.total)}</td><td>{row.expected}</td><td>{row.warehouse}</td><td><Status testId={`status-purchase-order-${row.id}`}>{row.status}</Status></td><td><Button small onClick={() => { setReceipts((current) => current.includes(row.id) ? current : [...current, row.id]); notify(`Mottagningsrapport skapad lokalt för ${row.id}.`); }} testId={`button-create-inbound-${row.id}`}>Skapa inleveransbesked</Button></td></tr>)}</Table>
      </Panel>
       <Panel title="Nytt inköp" subtitle="Ange leverantör, variantrader och planerad mottagning">
        <form className="admin-form-grid" onSubmit={create}>
          <Field label="Leverantör" id="po-supplier" value={supplier} onChange={setSupplier} placeholder="Leverantörens namn" required testId="input-po-supplier" />
          <Field label="Beräknat leveransdatum" id="po-expected" type="date" value={expected} onChange={setExpected} required testId="input-po-expected" />
          <Field label="Mottagande lager" id="po-warehouse" value={warehouse} onChange={setWarehouse} options={['DSV 3PL · Jönköping', 'Eget lager · Stockholm']} testId="select-po-warehouse" />
          <Field label="Status" id="po-status" value={status} onChange={setStatus} options={['Utkast', 'Skickad', 'Delvis mottagen', 'Mottagen']} testId="select-po-status" />
           <div className="admin-field span-2">
             <span className="admin-section-label">Orderrader</span>
             {lines.map((line, index) => <div className="business-admin-line-item" key={line.id}>
               <Field label={`Variant ${index + 1}`} id={`po-sku-${line.id}`} value={line.sku} onChange={(value) => updateLine(line.id, 'sku', value)} options={['PWO-BL-12', 'PWO-JO-06', 'KRE-300', 'DVT-050']} testId={`select-po-variant-${line.id}`} />
               <Field label="Antal" id={`po-quantity-${line.id}`} type="number" min={1} value={line.quantity} onChange={(value) => updateLine(line.id, 'quantity', value)} required testId={`input-po-quantity-${line.id}`} />
               <Field label="Inköpspris per styck (kr)" id={`po-price-${line.id}`} type="number" min={0} value={line.price} onChange={(value) => updateLine(line.id, 'price', value)} required testId={`input-po-price-${line.id}`} />
               {lines.length > 1 && <Button small kind="danger" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} testId={`button-remove-po-line-${line.id}`}>Ta bort rad</Button>}
             </div>)}
             <Button small onClick={() => setLines((current) => [...current, { id: Math.max(0, ...current.map((line) => line.id)) + 1, sku: 'PWO-BL-12', quantity: '1', price: '112' }])} testId="button-add-po-line">＋ Lägg till variant</Button>
           </div>
           <div className="business-admin-form-foot"><p className="business-admin-subline">{lines.length === 1 ? '1 orderrad' : `${lines.length} orderrader`} · {money(total)}</p><Button type="submit" kind="primary" testId="button-save-purchase-order">Skapa inköpsorder</Button></div>
        </form>
      </Panel>
    </div>
    <Panel title="Inleveransrapport" subtitle="Lokalt mottagningsunderlag kopplat till inköpsorder">
      {receipts.length ? <Table headers={['Inleveransbesked', 'Inköpsorder', 'Mottagande lager', 'Förväntat', 'Status']} testId="table-receipt-reports">{rows.filter((row) => receipts.includes(row.id)).map((row) => <tr key={row.id}><td><strong>IA-{row.id.slice(-3)}</strong></td><td>{row.id}</td><td>{row.warehouse}</td><td>{row.expected}</td><td><Status testId={`status-receipt-${row.id}`}>{row.status === 'Mottagen' ? 'Mottagen' : 'Väntar på mottagning'}</Status></td></tr>)}</Table> : <p className="admin-empty" data-testid="empty-receipt-reports">Inga mottagningsrapporter ännu. Skapa ett inleveransbesked från en inköpsorder.</p>}
    </Panel>
  </>;
}

const reportProducts = [
  { name: 'PWO+ Pre-workout', variant: 'Blåbär · 12-pack', units: 184, revenue: 51336, stock: 4, warehouse: 'DSV 3PL · Jönköping', value: 448 },
  { name: 'Kreatin Monohydrat', variant: 'Neutral · 300 g', units: 126, revenue: 31374, stock: 58, warehouse: 'DSV 3PL · Jönköping', value: 10440 },
  { name: 'D-vitamin 50 µg', variant: '90 kapslar', units: 92, revenue: 8188, stock: 3, warehouse: 'Eget lager · Stockholm', value: 267 },
  { name: 'PWO+ Pre-workout', variant: 'Jordgubb · 6-pack', units: 76, revenue: 11324, stock: 4, warehouse: 'DSV 3PL · Jönköping', value: 448 },
  { name: 'Omega-3 Fiskolja', variant: '60 kapslar', units: 51, revenue: 9639, stock: 27, warehouse: 'Eget lager · Stockholm', value: 5103 },
];

export function ReportsView() {
  const [period, setPeriod] = useAdminListState('rapporter', 'period', 'Månad');
  const [from, setFrom] = useAdminListState('rapporter', 'from', '2026-11-01');
  const [to, setTo] = useAdminListState('rapporter', 'to', '2026-11-30');
  const [sort, setSort] = useAdminListState<'units' | 'revenue'>('rapporter', 'sort', 'units');
  const sorted = useMemo(() => [...reportProducts].sort((a, b) => b[sort] - a[sort]), [sort]);
  const exportCsv = () => {
    const content = [['Produkt', 'Variant', 'Sålda', 'Omsättning (kr)'], ...sorted.map((item) => [item.name, item.variant, String(item.units), String(item.revenue)])].map((line) => line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'selfit-rapport-november-2026.csv'; document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    announcePrototypeAction('CSV-rapport exporterad');
  };
  const bars = [42, 58, 48, 72, 61, 87, 66, 77, 52, 94, 70, 84, 61, 100, 74, 88, 56, 79, 64, 92, 70, 83, 60, 96];
  return <>
    <Heading kicker="Analys" title="Rapporter" description="Försäljning, produktutfall och lagervärde för lokala exempeldata." actions={<Button onClick={exportCsv} kind="primary" testId="button-export-report-csv">Exportera CSV</Button>} />
    <div className="admin-toolbar business-admin-period">
      <label className="admin-filter-label">Period<select className="admin-control" value={period} onChange={(event) => setPeriod(event.target.value)} data-testid="select-report-period">{['Dag', 'Vecka', 'Månad', 'Eget datumintervall'].map((item) => <option key={item}>{item}</option>)}</select></label>
      {period === 'Eget datumintervall' && <><Field label="Från" id="report-from" type="date" value={from} onChange={setFrom} testId="input-report-from" /><Field label="Till" id="report-to" type="date" value={to} onChange={setTo} testId="input-report-to" /></>}
      <span className="business-admin-subline" data-testid="text-report-range">{period === 'Eget datumintervall' ? `${from} – ${to}` : `${period} · november 2026`}</span>
    </div>
    <div className="business-admin-report-stats">
      {[['Ordrar', '684'], ['Omsättning exkl. moms', '412 860 kr'], ['Moms', '49 543 kr'], ['Pant', '8 214 kr'], ['Frakt', '21 716 kr'], ['Rabatter', '−18 420 kr'], ['Återbetalningar', '−6 184 kr']].map(([label, value]) => <div className="admin-panel admin-stat" key={label} data-testid={`report-metric-${label.toLowerCase().replace(/\W+/g, '-')}`}><span className="admin-stat-label">{label}</span><strong>{value}</strong><div className="admin-stat-foot">1–30 november 2026</div></div>)}
    </div>
    <div className="admin-grid dashboard">
      <Panel title="Försäljning över tid" subtitle="Daglig omsättning, exklusive moms"><div className="business-admin-chart" role="img" aria-label="Stapeldiagram över daglig försäljning under november 2026" data-testid="chart-sales"><div className="business-admin-bars">{bars.map((height, index) => <div className="business-admin-bar" key={index} style={{ height: `${height}%` }} title={`${index + 1} november`} data-testid={`bar-sales-${index + 1}`} />)}</div><div className="business-admin-chart-axis"><span>1 nov</span><span>10 nov</span><span>20 nov</span><span>30 nov</span></div></div></Panel>
      <Panel title="Lageröversikt" subtitle="Inköpsvärde i tillgängligt saldo"><div className="business-admin-metric-grid"><div><span>Totalt lagervärde</span><strong data-testid="metric-inventory-value">186 420 kr</strong></div><div><span>Under miniminivå</span><strong data-testid="metric-low-stock-count">3 varianter</strong></div></div><div className="business-admin-warehouse-line"><strong>DSV 3PL · Jönköping</strong><span>142 680 kr</span></div><div className="business-admin-warehouse-line"><strong>Eget lager · Stockholm</strong><span>43 740 kr</span></div></Panel>
    </div>
    <Panel title="Lågt saldo per lager" subtitle="Varianter under miniminivå med aktuell lagerplats">
      <Table headers={['Produkt', 'Variant', 'Saldo', 'Lager']} testId="table-low-stock-by-warehouse">{reportProducts.filter((item) => item.stock <= 4).map((item, index) => <tr key={`${item.name}-${item.variant}`} data-testid={`row-low-stock-report-${index}`}><td>{item.name}</td><td>{item.variant}</td><td><Status testId={`status-low-stock-report-${index}`}>{`${item.stock} st`}</Status></td><td>{item.warehouse}</td></tr>)}</Table>
    </Panel>
    <Panel title="Produkt- och variantförsäljning" subtitle="Sortera för att hitta bästsäljare"><div className="business-admin-sort-controls"><Button small onClick={() => setSort('units')} kind={sort === 'units' ? 'primary' : ''} testId="button-sort-sales-units">Flest sålda först</Button><Button small onClick={() => setSort('revenue')} kind={sort === 'revenue' ? 'primary' : ''} testId="button-sort-sales-revenue">Högst omsättning först</Button></div><Table headers={['Produkt', 'Variant', 'Sålda enheter', 'Omsättning', 'Lagersaldo', 'Lager', 'Lagervärde']} testId="table-product-sales">{sorted.map((item, index) => <tr key={`${item.name}-${item.variant}`} data-testid={`row-product-sales-${index}`}><td><strong>{item.name}</strong></td><td>{item.variant}</td><td>{item.units} st</td><td className="num">{money(item.revenue)}</td><td><Status testId={`status-stock-${index}`}>{`${item.stock} st`}</Status></td><td>{item.warehouse}</td><td className="num">{money(item.value)}</td></tr>)}</Table></Panel>
    <div className="business-admin-future-grid" aria-label="Rapporter som kommer senare">
      {['Konvertering', 'Övergivna kundvagnar', 'Återkommande kunder'].map((title) => <section className="admin-panel business-admin-future" key={title} data-testid={`placeholder-report-${title.toLowerCase().replace(/\s+/g, '-')}`}><span>Kommer senare</span><h2>{title}</h2><p>Rapporten är inte tillgänglig i den lokala prototypen.</p></section>)}
    </div>
  </>;
}

export function OrderAdditionalDetails({ order, go, notify }: { order: OrderRow; go: (path: string) => void; notify: (message: string) => void }) {
  const customer = initialCustomers.find((item) => item.email === order.email);
  const customerPath = `/admin/kunder/${customer?.id ?? 'elin-andersson'}`;
  const paymentMethod = order.id.endsWith('0839') ? 'Swish' : order.id.endsWith('0834') ? 'Klarna' : 'Kort';
  return <div className="business-admin-order-extra">
    <div className="admin-grid dashboard">
      <Panel title="Kundkort" subtitle="Kundrelation och köp"><p data-testid="text-order-customer">{order.email}</p><Button small onClick={() => go(customerPath)} testId="button-order-customer-card">Öppna kundkort</Button></Panel>
      <Panel title="Betalningsuppgifter" subtitle="Lokal betalningsinformation"><div className="admin-metric-line"><span>Betalsätt</span><strong>Kustom · {paymentMethod}</strong></div><div className="admin-metric-line"><span>Belopp</span><strong>{money(order.amount)}</strong></div><div className="admin-metric-line"><span>Auktoriserad</span><time>20 nov 2026, 10:42:18</time></div><div className="admin-metric-line"><span>Debiterad</span><time>20 nov 2026, 10:43:02</time></div><div className="admin-metric-line"><span>Kustom-referens</span><code>kus_7F2A91C4</code></div></Panel>
    </div>
    <Panel title="Fullständig prisfördelning" subtitle="Belopp i SEK">
      <Table headers={['Post', 'Belopp', 'Kommentar']} testId="table-order-price-breakdown"><tr><td>Varor</td><td className="num">528 kr</td><td>2 orderrader</td></tr><tr><td>Rabatt</td><td className="num">0 kr</td><td>Kod VÄLKOMMEN10 · ingen rabatt på dessa varor</td></tr><tr><td>Pant</td><td className="num">12 kr</td><td>Återbetalningsbar pant</td></tr><tr><td>Frakt</td><td className="num">38 kr</td><td>Standardleverans</td></tr><tr><td>Moms</td><td className="num">61,71 kr</td><td>12 % på momspliktiga varor</td></tr><tr><td><strong>Totalt betalt</strong></td><td className="num"><strong>{money(order.amount)}</strong></td><td>Inkl. pant och frakt</td></tr></Table>
    </Panel>
    <div className="admin-grid dashboard">
      <Panel title="Återbetalningar" subtitle="Tid, orsak och ansvarig"><Table headers={['Tid', 'Belopp', 'Orsak', 'Godkänd av']} testId="table-order-refunds"><tr><td>4 nov 2026, 12:18</td><td>149 kr</td><td>Reklamation · fel variant</td><td>Ella Svensson</td></tr></Table></Panel>
      <Panel title="Samlad tidslinje" subtitle="Mejl, lager, betalningar och interna anteckningar"><div className="admin-timeline">{[['Order skapad', '20 nov 2026, 10:42', 'Kassan genomförd'], ['Betalning godkänd', '20 nov 2026, 10:43', 'Kustom · kortbetalning fångad'], ['Orderbekräftelse skickad', '20 nov 2026, 10:43', 'Mejl skickat till kunden'], ['Överförd till lager', '20 nov 2026, 10:44', 'DSV 3PL · Jönköping'], ['Intern notering', '20 nov 2026, 10:48', 'Kontrollera variant före plock']].map(([title, time, detail]) => <div className="admin-event" key={title}><strong>{title}</strong>{detail}<time>{time}</time></div>)}</div></Panel>
    </div>
    <div className="business-admin-action-row"><Button kind="primary" onClick={() => { go('/admin/manuella-order'); notify(`Ersättningsorder initierad lokalt för ${order.id}.`); }} testId="button-create-replacement-order">Skapa ersättningsorder</Button></div>
  </div>;
}
