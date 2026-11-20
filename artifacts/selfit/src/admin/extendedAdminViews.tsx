import { useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { productRows } from './mockData';
import { defaultMediaItems, type LocalMediaItem, type RedirectRow } from './extendedAdminData';
import './extendedAdmin.css';

type ProductOption = { slug: string; name: string };
const productOptions: ProductOption[] = productRows.map(({ slug, name }) => ({ slug, name }));
type RelationKind = 'related' | 'pairs';
const relationSeed: Record<string, Record<RelationKind, string[]>> = {
  'pwo-plus': { related: ['kreatin-monohydrat', 'protein-pannkakor'], pairs: ['shaker-600', 'traningsband-set'] },
};

export function ProductRelationsSection({ productSlug, products = productOptions }: { productSlug: string; products?: ProductOption[] }) {
  const [relations, setRelations] = useState<Record<RelationKind, string[]>>(() => relationSeed[productSlug] ?? { related: [], pairs: [] });
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<RelationKind>('related');
  const [dragId, setDragId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const getName = (slug: string) => products.find((product) => product.slug === slug)?.name ?? slug;
  const addProduct = (slug: string) => {
    if (slug === productSlug || relations[kind].includes(slug)) return;
    setRelations((current) => ({ ...current, [kind]: [...current[kind], slug] }));
    setSearch('');
    setNotice(`${getName(slug)} lades till i listan.`);
  };
  const reorder = (listKind: RelationKind, from: string, to: string) => setRelations((current) => {
    const values = [...current[listKind]], fromIndex = values.indexOf(from), toIndex = values.indexOf(to);
    if (fromIndex < 0 || toIndex < 0) return current;
    values.splice(fromIndex, 1); values.splice(toIndex, 0, from);
    return { ...current, [listKind]: values };
  });
  const group = (listKind: RelationKind, title: string) => <section className="xadmin-relation-group" aria-label={title} key={listKind}>
    <div className="xadmin-group-heading"><div><h3>{title}</h3><p>{relations[listKind].length} produkter i ordning</p></div><button type="button" className="xadmin-button" onClick={() => { setKind(listKind); setSearch(''); }} aria-pressed={kind === listKind} data-testid={`button-add-relation-${listKind}`}>Lägg till</button></div>
    <ol className="xadmin-relation-list" data-testid={`list-product-relations-${listKind}`}>
      {relations[listKind].map((slug, index) => <li key={slug} draggable onDragStart={() => setDragId(slug)} onDragOver={(event: DragEvent<HTMLLIElement>) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (dragId) reorder(listKind, dragId, slug); setDragId(null); }} data-testid={`row-relation-${listKind}-${slug}`}>
        <span className="xadmin-grip" aria-hidden="true">⠿</span><span className="xadmin-relation-name">{getName(slug)}<small>/produkt/{slug}</small></span>
        <div className="xadmin-inline-actions"><button type="button" className="xadmin-icon-button" disabled={index === 0} aria-label={`Flytta ${getName(slug)} upp`} onClick={() => reorder(listKind, slug, relations[listKind][index - 1])} data-testid={`button-relation-up-${listKind}-${slug}`}>Upp</button><button type="button" className="xadmin-icon-button" disabled={index === relations[listKind].length - 1} aria-label={`Flytta ${getName(slug)} ned`} onClick={() => reorder(listKind, slug, relations[listKind][index + 1])} data-testid={`button-relation-down-${listKind}-${slug}`}>Ned</button><button type="button" className="xadmin-icon-button is-danger" aria-label={`Ta bort ${getName(slug)}`} onClick={() => setRelations((current) => ({ ...current, [listKind]: current[listKind].filter((item) => item !== slug) }))} data-testid={`button-relation-remove-${listKind}-${slug}`}>Ta bort</button></div>
      </li>)}
      {relations[listKind].length === 0 && <li className="xadmin-empty">Inga produkter valda. Lägg till produkter när listan behövs.</li>}
    </ol>
  </section>;
  const suggestions = products.filter((product) => product.slug !== productSlug && !relations[kind].includes(product.slug) && `${product.name} ${product.slug}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="xadmin-panel xadmin-stack" aria-label="Produktrelationer" data-testid="section-product-relations">
    <div className="xadmin-panel-head"><div><h2>Produktrelationer</h2><p>Ordna rekommendationer och kompletterande produkter.</p></div></div>
    <div className="xadmin-panel-body xadmin-stack">
      <div className="xadmin-relation-grid">{group('related', 'Liknande produkter')}{group('pairs', 'Passar ihop med')}</div>
      <p className="xadmin-local-note">Tomma relationsgrupper visas inte i butiken.</p>
      {kind && <div className="xadmin-search-add"><label htmlFor="relation-search">Sök produkt att lägga till i ”{kind === 'related' ? 'Liknande produkter' : 'Passar ihop med'}”</label><input id="relation-search" className="xadmin-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Sök produktnamn eller slug" data-testid="input-search-relation-products" /><div className="xadmin-suggestions" role="list">{search && suggestions.map((item) => <button type="button" role="listitem" key={item.slug} onClick={() => addProduct(item.slug)} data-testid={`button-select-relation-${item.slug}`}>{item.name}<small>/produkt/{item.slug}</small></button>)}{search && suggestions.length === 0 && <p>Inga fler produkter matchar sökningen.</p>}</div></div>}
      <div className="xadmin-sr" role="status" aria-live="polite" data-testid="status-product-relations">{notice}</div>
    </div>
  </section>;
}

type PriceRecord = { date: string; price: number; editor: string };
const priceHistory: Record<string, { variant: string; records: PriceRecord[] }[]> = {
  'pwo-plus': [
    { variant: 'Blåbär · 6-pack', records: [{ date: '2026-11-17', price: 149, editor: 'Elin Andersson' }, { date: '2026-11-02', price: 159, editor: 'Maja Lind' }, { date: '2026-10-24', price: 149, editor: 'Elin Andersson' }] },
    { variant: 'Blåbär · 12-pack', records: [{ date: '2026-11-17', price: 279, editor: 'Elin Andersson' }, { date: '2026-10-29', price: 299, editor: 'Maja Lind' }] },
    { variant: 'Jordgubb · 6-pack', records: [{ date: '2026-11-10', price: 155, editor: 'Oskar Berg' }, { date: '2026-10-25', price: 149, editor: 'Elin Andersson' }] },
  ],
};
const formatDate = (value: string) => new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
export function ProductPriceHistoryPanel({ productSlug }: { productSlug: string }) {
  const items = priceHistory[productSlug] ?? [{ variant: 'Standardvariant', records: [{ date: '2026-11-15', price: productRows.find((product) => product.slug === productSlug)?.price ?? 0, editor: 'Exempeldata' }, { date: '2026-10-28', price: (productRows.find((product) => product.slug === productSlug)?.price ?? 0) + 10, editor: 'Exempeldata' }] }];
  const windowEnd = new Date('2026-11-20T00:00:00Z').getTime();
  return <section className="xadmin-panel" aria-label="Prishistorik" data-testid="panel-price-history">
    <div className="xadmin-panel-head"><div><h2>Prishistorik</h2><p>Historik per variant och lägsta pris under 30 dagar.</p></div><span className="xadmin-badge">30 dagar</span></div>
    <div className="xadmin-warning" role="note" data-testid="warning-price-reduction"><strong>Visa alltid 30-dagars lägsta pris</strong><span>Vid kampanj eller prissänkning ska kunderna se det lägsta priset som produkten haft under de senaste 30 dagarna.</span></div>
    {items.map((item, index) => {
      const recent = item.records.filter((record) => windowEnd - new Date(`${record.date}T00:00:00Z`).getTime() <= 30 * 86400000);
      const minimum = recent.length ? Math.min(...recent.map((record) => record.price)) : Math.min(...item.records.map((record) => record.price));
      return <section className="xadmin-price-variant" key={item.variant} data-testid={`section-price-variant-${index}`}><div className="xadmin-group-heading"><h3>{item.variant}</h3><strong className="xadmin-price-min">Lägsta 30 dagar: {minimum} kr</strong></div><ol className="xadmin-price-list">{item.records.map((record) => <li key={`${record.date}-${record.price}`}><time dateTime={record.date}>{formatDate(record.date)}</time><strong>{record.price} kr</strong><span>Ändrat av {record.editor}</span></li>)}</ol></section>;
    })}
  </section>;
}

type EmailTemplate = { id: string; title: string; subject: string; body: string };
const initialTemplates: EmailTemplate[] = [
  { id: 'order', title: 'Orderbekräftelse', subject: 'Vi har tagit emot din order {ordernummer}', body: 'Tack för din beställning!\n\nVi har tagit emot order {ordernummer} och förbereder dina varor. Du får ett nytt mejl när paketet lämnar lagret.' },
  { id: 'shipped', title: 'Skickad', subject: 'Din order {ordernummer} är på väg', body: 'Nu är paketet på väg till dig.\n\nFölj leveransen här: {spårningslänk}' },
  { id: 'delivered', title: 'Levererad', subject: 'Din order {ordernummer} har levererats', body: 'Vi hoppas att allt kom fram som det skulle. Tack för att du handlar hos SELFiT.' },
  { id: 'return', title: 'Retur mottagen / återbetalning', subject: 'Vi har tagit emot din retur för {ordernummer}', body: 'Din retur har kommit fram. Återbetalningen hanteras till samma betalsätt som användes vid köpet.' },
  { id: 'cancelled', title: 'Avbruten', subject: 'Order {ordernummer} har avbrutits', body: 'Ordern har avbrutits. Om en betalning redan har gjorts återförs beloppet enligt betaltjänstens hantering.' },
];
const sampleMerge = (value: string) => value.replaceAll('{ordernummer}', 'SF-261120-0842').replaceAll('{spårningslänk}', 'selfit.se/ordersparning');
export function EmailTemplatesView() {
  const [templates, setTemplates] = useState(initialTemplates);
  const [activeId, setActiveId] = useState(initialTemplates[0].id);
  const [notice, setNotice] = useState('');
  const active = templates.find((item) => item.id === activeId) ?? templates[0];
  const update = (key: 'subject' | 'body', value: string) => setTemplates((current) => current.map((item) => item.id === active.id ? { ...item, [key]: value } : item));
  return <section className="xadmin-stack" aria-label="E-postmallar" data-testid="view-email-templates">
    <header className="xadmin-heading"><div><p className="xadmin-kicker">Kundkommunikation</p><h2>E-postmallar</h2><p>Redigera ordermejl och se hur de ser ut med exempeldata.</p></div></header>
    <div className="xadmin-email-layout">
      <section className="xadmin-panel"><div className="xadmin-panel-head"><div><h3>Mallar</h3><p>Ändringar gäller endast lokalt.</p></div></div><div className="xadmin-template-list" role="tablist" aria-label="E-postmallar">{templates.map((template) => <button role="tab" type="button" aria-selected={activeId === template.id} key={template.id} onClick={() => setActiveId(template.id)} data-testid={`tab-email-template-${template.id}`}>{template.title}</button>)}</div>
        <div className="xadmin-form"><label className="xadmin-field-label" htmlFor="email-subject">Ämnesrad<input id="email-subject" className="xadmin-control" value={active.subject} onChange={(event) => update('subject', event.target.value)} data-testid="input-email-subject" /></label><label className="xadmin-field-label" htmlFor="email-body">Meddelandetext<textarea id="email-body" className="xadmin-control xadmin-textarea" value={active.body} onChange={(event) => update('body', event.target.value)} data-testid="input-email-body" /></label><p className="xadmin-local-note">Tillgängliga platshållare: {'{ordernummer}'} och {'{spårningslänk}'}.</p><button type="button" className="xadmin-button" onClick={() => setNotice(`Mallen ”${active.title}” bekräftades lokalt.`)} data-testid="button-save-email-template">Bekräfta lokalt</button>{notice && <p role="status" className="xadmin-local-note" data-testid="status-email-template">{notice}</p>}</div>
      </section>
      <aside className="xadmin-email-preview" aria-label="Förhandsvisning av e-post" data-testid="preview-email">
        <div className="xadmin-email-top"><span className="xadmin-brand-mark">S</span><span>SELFIT <small>TRÄNING · HÄLSA · VÄLMÅENDE</small></span></div>
        <p className="xadmin-email-label">Ämne</p><h3>{sampleMerge(active.subject)}</h3><hr />
        <p className="xadmin-email-copy">{sampleMerge(active.body).split('\n').map((line, index) => <span key={`${line}-${index}`}>{line || '\u00a0'}<br /></span>)}</p>
        <div className="xadmin-email-footer">Ta hand om dig,<br /><strong>Team SELFiT</strong><small>Det här är ett exempel på hur mejlet kan se ut.</small></div>
      </aside>
    </div>
  </section>;
}

type Inbound = { id: string; warehouse: string; sku: string; quantity: number; expected: string; status: 'Skickad' | 'Mottagen' | 'Avvikelse'; received: number; batch: string; bestBefore: string; discrepancy: string };
const initialInbound: Inbound[] = [
  { id: 'in-1', warehouse: 'DSV 3PL · Jönköping', sku: 'PWO-BL-06', quantity: 240, expected: '2026-11-25', status: 'Skickad', received: 0, batch: '—', bestBefore: '—', discrepancy: '—' },
  { id: 'in-2', warehouse: 'DSV 3PL · Jönköping', sku: 'KRE-300', quantity: 120, expected: '2026-11-18', status: 'Mottagen', received: 120, batch: 'KR2611A', bestBefore: '2027-08-31', discrepancy: '—' },
  { id: 'in-3', warehouse: 'Logent 3PL · Borås', sku: 'DVT-050', quantity: 80, expected: '2026-11-19', status: 'Avvikelse', received: 76, batch: 'DV2611B', bestBefore: '2027-02-28', discrepancy: '4 st saknas' },
];
export function WarehouseInboundLotsView() {
  const [tab, setTab] = useState<'inbound' | 'lots'>('inbound');
  const [rows, setRows] = useState(initialInbound);
  const [warehouse, setWarehouse] = useState('DSV 3PL · Jönköping');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('120');
  const [expected, setExpected] = useState('2026-11-26');
  const [notice, setNotice] = useState('');
  const sendNotice = (event: FormEvent) => {
    event.preventDefault();
    if (!sku.trim() || Number(quantity) < 1) { setNotice('Ange en SKU och ett antal större än noll.'); return; }
    setRows((current) => [{ id: `in-${Date.now()}`, warehouse, sku: sku.trim(), quantity: Number(quantity), expected, status: 'Skickad', received: 0, batch: '—', bestBefore: '—', discrepancy: '—' }, ...current]);
    setNotice(`Inleveransavisering för ${sku.trim()} skapades lokalt för ${warehouse}.`);
    setSku('');
  };
  const sampleDate = new Date('2026-11-20T00:00:00Z').getTime();
  const lots = rows.filter((row) => row.status !== 'Skickad').map((row) => ({ ...row, expiring: row.bestBefore !== '—' && new Date(`${row.bestBefore}T00:00:00Z`).getTime() < sampleDate + 180 * 86400000 }));
  return <section className="xadmin-stack" aria-label="Inleveranser och partier" data-testid="view-inbound-lots">
    <header className="xadmin-heading"><div><p className="xadmin-kicker">Lager & mottagning</p><h2>Inleveranser & partier</h2><p>Skapa aviseringar till 3PL och följ upp mottagna batcher.</p></div></header>
    <div className="xadmin-tabs" role="tablist" aria-label="Välj lagervy"><button type="button" role="tab" aria-selected={tab === 'inbound'} onClick={() => setTab('inbound')} data-testid="tab-inbound">3PL-inleveranser</button><button type="button" role="tab" aria-selected={tab === 'lots'} onClick={() => setTab('lots')} data-testid="tab-lots">Partiöversikt</button></div>
    {tab === 'inbound' ? <>
      <form className="xadmin-panel xadmin-form" onSubmit={sendNotice} data-testid="form-inbound-notice"><div className="xadmin-panel-head"><div><h3>Ny inleveransavisering</h3><p>Exempelavisering skickas inte till något externt lager.</p></div></div><div className="xadmin-form-grid">
        <label className="xadmin-field-label">3PL-lager<select className="xadmin-control" value={warehouse} onChange={(event) => setWarehouse(event.target.value)} data-testid="select-inbound-warehouse"><option>DSV 3PL · Jönköping</option><option>Logent 3PL · Borås</option><option>DSV 3PL · Stockholm</option></select></label>
        <label className="xadmin-field-label">SKU<input className="xadmin-control" value={sku} onChange={(event) => setSku(event.target.value)} placeholder="Exempel: PWO-BL-06" required data-testid="input-inbound-sku" /></label>
        <label className="xadmin-field-label">Planerat antal<input className="xadmin-control" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required data-testid="input-inbound-quantity" /></label>
        <label className="xadmin-field-label">Förväntat datum<input className="xadmin-control" type="date" value={expected} onChange={(event) => setExpected(event.target.value)} required data-testid="input-inbound-date" /></label>
     </div><button type="submit" className="xadmin-button is-primary" data-testid="button-send-inbound">Skapa avisering lokalt</button>{notice && <p className="xadmin-local-note" role="status" data-testid="status-inbound-notice">{notice}</p>}</form>
       <section className="xadmin-panel"><div className="xadmin-panel-head"><div><h3>Aviseringar</h3><p>Skickade, mottagna och avvikande inleveranser.</p></div></div><div className="xadmin-table-scroll"><table className="xadmin-table"><thead><tr>{['SKU / lager', 'Förväntat', 'Aviserat', 'Mottaget', 'Batch', 'Bäst före', 'Avvikelse', 'Status'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} data-testid={`row-inbound-${row.id}`}><td><strong>{row.sku}</strong><small>{row.warehouse}</small></td><td>{row.expected}</td><td>{row.quantity} st</td><td>{row.received} st</td><td>{row.batch}</td><td>{row.bestBefore}</td><td>{row.discrepancy}</td><td><span className={`xadmin-badge ${row.status === 'Mottagen' ? 'is-good' : row.status === 'Avvikelse' ? 'is-warn' : ''}`} data-testid={`status-inbound-${row.id}`}>{row.status}</span>{row.status === 'Skickad' && <button type="button" className="xadmin-text-button" onClick={() => setRows((current) => current.map((item) => item.id === row.id ? { ...item, status: 'Mottagen', received: item.quantity, batch: 'EX2611A', bestBefore: '2027-05-30', discrepancy: '—' } : item))} data-testid={`button-mark-received-${row.id}`}>Markera mottagen</button>}</td></tr>)}</tbody></table></div></section>
    </> : <section className="xadmin-panel"><div className="xadmin-panel-head"><div><h3>Partier per variant och lager</h3><p>Hållbarhetsdatum och mottaget saldo i exempeldata.</p></div></div><div className="xadmin-table-scroll"><table className="xadmin-table"><thead><tr>{['Variant / SKU', 'Lager', 'Batch', 'Bäst före', 'Antal', 'Hållbarhet'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{lots.map((row) => <tr key={row.id} data-testid={`row-lot-${row.id}`}><td>{row.sku}</td><td>{row.warehouse}</td><td>{row.batch}</td><td>{row.bestBefore}</td><td>{row.received} st</td><td><span className={`xadmin-badge ${row.expiring ? 'is-warn' : 'is-good'}`}>{row.expiring ? 'Går ut snart' : 'I god tid'}</span></td></tr>)}</tbody></table></div>{lots.length === 0 && <p className="xadmin-empty">Inga mottagna partier ännu.</p>}</section>}
  </section>;
}

export { defaultMediaItems };
export function MediaLibraryView({ items, onItemsChange }: { items: LocalMediaItem[]; onItemsChange: (items: LocalMediaItem[]) => void }) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? '');
  const [notice, setNotice] = useState('');
  const selected = items.find((item) => item.id === selectedId);
  const filtered = items.filter((item) => `${item.name} ${item.alt} ${item.kind} ${item.usedBy.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const add = () => {
    const count = items.length + 1, id = `media-local-${Date.now()}`;
    const fresh: LocalMediaItem = { id, name: `Ny lokal bild ${count}`, src: defaultMediaItems[(count - 1) % defaultMediaItems.length].src, alt: '', kind: 'Produktbild', usedBy: [] };
    onItemsChange([...items, fresh]); setSelectedId(id); setNotice('En lokal platshållarbild har lagts till. Ingen fil har laddats upp.');
  };
  const patchSelected = (patch: Partial<LocalMediaItem>) => onItemsChange(items.map((item) => item.id === selectedId ? { ...item, ...patch } : item));
  return <section className="xadmin-stack" aria-label="Mediebibliotek" data-testid="view-media-library">
    <header className="xadmin-heading"><div><p className="xadmin-kicker">Produktinnehåll</p><h2>Mediebibliotek</h2><p>Välj lokala exempelbilder, byt bild och komplettera alternativtext.</p></div><button type="button" className="xadmin-button is-primary" onClick={add} data-testid="button-add-media">Lägg till exempelbild</button></header>
    {notice && <p className="xadmin-local-note" role="status" data-testid="status-media-library">{notice}</p>}
    <div className="xadmin-media-layout"><section className="xadmin-panel"><div className="xadmin-panel-head"><div><h3>Bibliotek</h3><p>{filtered.length} av {items.length} objekt</p></div></div><label className="xadmin-media-search" htmlFor="media-search">Sök media<input id="media-search" className="xadmin-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Namn, alt-text eller produkt" data-testid="input-search-media" /></label><div className="xadmin-media-grid">{filtered.map((item) => <button type="button" key={item.id} className={`xadmin-media-card ${selectedId === item.id ? 'is-selected' : ''}`} aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)} data-testid={`button-select-media-${item.id}`}><img src={item.src} alt="" /><span>{item.name}</span><small>{item.kind}</small></button>)}</div>{filtered.length === 0 && <p className="xadmin-empty">Inga medieobjekt matchar sökningen.</p>}</section>
      {selected && <aside className="xadmin-panel xadmin-media-detail"><div className="xadmin-panel-head"><div><h3>Mediauppgifter</h3><p>{selected.name}</p></div></div><img className="xadmin-media-large" src={selected.src} alt="" /><label className="xadmin-field-label" htmlFor="media-alt">Alternativtext<input id="media-alt" className="xadmin-control" value={selected.alt} onChange={(event) => patchSelected({ alt: event.target.value })} data-testid="input-media-alt" /></label><label className="xadmin-field-label" htmlFor="media-name">Namn<input id="media-name" className="xadmin-control" value={selected.name} onChange={(event) => patchSelected({ name: event.target.value })} data-testid="input-media-name" /></label><div className="xadmin-field-label">Används av{selected.usedBy.length ? <ul className="xadmin-usage-list">{selected.usedBy.map((name) => <li key={name}>{name}</li>)}</ul> : <p className="xadmin-local-note">Inte kopplad till någon produkt.</p>}</div><button type="button" className="xadmin-button" onClick={() => setNotice(`Bildvalet för ”${selected.name}” bekräftades lokalt.`)} data-testid="button-confirm-media">Bekräfta bildval</button></aside>}
    </div>
  </section>;
}

export function MediaPicker({ items, selectedId, onSelect }: { items: LocalMediaItem[]; selectedId?: string; onSelect: (item: LocalMediaItem) => void }) {
  const [search, setSearch] = useState('');
  const choices = useMemo(() => items.filter((item) => `${item.name} ${item.alt}`.toLowerCase().includes(search.toLowerCase())), [items, search]);
  return <section className="xadmin-media-picker" aria-label="Välj produktmedia" data-testid="media-picker">
    <label className="xadmin-field-label" htmlFor="media-picker-search">Sök biblioteket<input id="media-picker-search" className="xadmin-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Sök bild" data-testid="input-media-picker-search" /></label>
    <div className="xadmin-picker-grid">{choices.map((item) => <button type="button" key={item.id} className={`xadmin-picker-item ${selectedId === item.id ? 'is-selected' : ''}`} onClick={() => onSelect(item)} aria-pressed={selectedId === item.id} data-testid={`button-pick-media-${item.id}`}><img src={item.src} alt="" /><span>{item.name}</span><small>{item.alt || 'Alt-text saknas'}</small></button>)}</div>
    {choices.length === 0 && <p className="xadmin-empty">Inga bilder matchar sökningen.</p>}
  </section>;
}

export type { RedirectRow };
export function RedirectsView({ rows, onRowsChange }: { rows: RedirectRow[]; onRowsChange: (rows: RedirectRow[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [oldUrl, setOldUrl] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [notice, setNotice] = useState('');
  const beginEdit = (row: RedirectRow) => { setEditingId(row.id); setOldUrl(row.oldUrl); setNewUrl(row.newUrl); };
  const reset = () => { setEditingId(null); setOldUrl(''); setNewUrl(''); };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const cleanOld = oldUrl.trim(), cleanNew = newUrl.trim();
    if (!cleanOld.startsWith('/') || !cleanNew.startsWith('/') || cleanOld === cleanNew) { setNotice('Ange två olika relativa adresser som börjar med /.'); return; }
    if (editingId) onRowsChange(rows.map((row) => row.id === editingId ? { ...row, oldUrl: cleanOld, newUrl: cleanNew } : row));
    else onRowsChange([{ id: `redirect-${Date.now()}`, oldUrl: cleanOld, newUrl: cleanNew, type: 'Permanent (301)', createdAt: new Date().toISOString().slice(0, 10) }, ...rows]);
    setNotice(editingId ? 'Omdirigeringen uppdaterades lokalt.' : 'Permanent omdirigering skapades lokalt.');
    reset();
  };
  return <section className="xadmin-stack" aria-label="Omdirigeringar" data-testid="view-redirects">
    <header className="xadmin-heading"><div><p className="xadmin-kicker">Katalog & sök</p><h2>URL-omdirigeringar</h2><p>Behåll fungerande länkar när en produktadress ändras.</p></div></header>
    <form className="xadmin-panel xadmin-form" onSubmit={save}><div className="xadmin-panel-head"><div><h3>{editingId ? 'Redigera omdirigering' : 'Lägg till omdirigering'}</h3><p>Permanent omdirigering (301), endast exempeldata.</p></div></div><div className="xadmin-form-grid"><label className="xadmin-field-label" htmlFor="redirect-old">Gammal adress<input id="redirect-old" className="xadmin-control" value={oldUrl} onChange={(event) => setOldUrl(event.target.value)} placeholder="/produkt/gammal-adress" required data-testid="input-redirect-old" /></label><label className="xadmin-field-label" htmlFor="redirect-new">Ny adress<input id="redirect-new" className="xadmin-control" value={newUrl} onChange={(event) => setNewUrl(event.target.value)} placeholder="/produkt/ny-adress" required data-testid="input-redirect-new" /></label></div><div className="xadmin-inline-actions"><button type="submit" className="xadmin-button is-primary" data-testid="button-save-redirect">{editingId ? 'Spara ändring' : 'Lägg till 301'}</button>{editingId && <button type="button" className="xadmin-button" onClick={reset} data-testid="button-cancel-redirect">Avbryt</button>}</div>{notice && <p className="xadmin-local-note" role="status" data-testid="status-redirects">{notice}</p>}</form>
    <section className="xadmin-panel"><div className="xadmin-panel-head"><div><h3>Aktiva omdirigeringar</h3><p>{rows.length} rader i den lokala listan</p></div></div><div className="xadmin-table-scroll"><table className="xadmin-table"><thead><tr><th scope="col">Från</th><th scope="col">Till</th><th scope="col">Typ</th><th scope="col">Skapad</th><th scope="col"><span className="xadmin-sr">Åtgärder</span></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} data-testid={`row-redirect-${row.id}`}><td><code>{row.oldUrl}</code></td><td><code>{row.newUrl}</code></td><td>{row.type}</td><td>{row.createdAt}</td><td><div className="xadmin-inline-actions"><button type="button" className="xadmin-icon-button" onClick={() => beginEdit(row)} data-testid={`button-edit-redirect-${row.id}`}>Redigera</button><button type="button" className="xadmin-icon-button is-danger" onClick={() => { onRowsChange(rows.filter((item) => item.id !== row.id)); setNotice('Omdirigeringen togs bort lokalt.'); }} data-testid={`button-delete-redirect-${row.id}`}>Ta bort</button></div></td></tr>)}</tbody></table></div>{rows.length === 0 && <p className="xadmin-empty">Inga omdirigeringar ännu.</p>}</section>
  </section>;
}
