import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useSearch } from 'wouter';
import { navGroups, orderRows, productRows } from './mockData';
import {
  defaultCategoryFilters,
  defaultMediaItems,
  defaultProductTypes,
  defaultRedirectRows,
  type CategoryFilterDefinition,
  type LocalMediaItem,
  type ProductTypeDefinition,
  type RedirectRow,
} from './extendedAdminData';
import {
  EmailTemplatesView,
  MediaPicker,
  ProductRelationsSection,
  ProductPriceHistoryPanel,
  RedirectsView,
  WarehouseInboundLotsView,
} from './extendedAdminViews';
import { ProductTypeFieldsEditor, ProductTypesAndFiltersView } from './extendedProductViews';
import {
  CustomerDetailView,
  CustomersView,
  ManualOrdersView,
  OrderAdditionalDetails,
  PurchaseOrdersView,
  ReportsView,
} from './businessAdminViews';
import { AdminNavigationContext, announcePrototypeAction, NavigableRows, readRowDetail, recordRowProps, RowDetailView, useAdminListState } from './adminInteractions';
import { DiscountsView } from './discountViews';
import { MediaLibraryView } from './mediaLibraryView';
import { OperationsProvider, useOperations, balance, batchStatus, money } from './operationsModel';
import { OperationalOrders, OperationalOrderDetail, OperationalReturns, ManualOrderForm, PickPackView } from './operationsOrders';
import { StockView, PurchasingView, BatchView, TransfersView, CountsView } from './warehouseViews';
import { CompanySettingsView, ComingSoonView, PoliciesSettingsView } from './storeSettingsViews';
import { PageEditorView, PagesListView } from './pagesViews';
import { FaqAdminView } from './faqView';
import { TaxSettingsView } from './taxView';
import { CategoriesAdminView, ProductTypesAdminView } from './taxonomyViews';
import { HomepageAdminView, NavigationAdminView } from './homeAdminView';
import { AuditLogView } from './auditLogView';
import { ProductFormView, ProductsListView } from './productAdminViews';
import { MediaLibraryPage } from './mediaViews';
import { BrandsView } from './brandViews';
import './admin.css';
import './productForm.css';

type ButtonProps = { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'quiet' | 'danger'; small?: boolean; testId: string; ariaLabel?: string; ariaExpanded?: boolean; ariaControls?: string; className?: string; disabled?: boolean };

function Button({ children, onClick, kind, small, testId, ariaLabel, ariaExpanded, ariaControls, className = '', disabled }: ButtonProps) {
  return <button type="button" disabled={disabled} className={`admin-btn ${kind ?? ''} ${small ? 'small' : ''} ${className}`} onClick={onClick ?? (() => announcePrototypeAction(String(children)))} aria-label={ariaLabel} aria-expanded={ariaExpanded} aria-controls={ariaControls} data-testid={testId}>{children}</button>;
}

function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="admin-panel"><header className="admin-panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header><div className="admin-panel-body">{children}</div></section>;
}

function Field({ label, value, onChange, placeholder, type = 'text', testId, multiline = false, error }: { label: string; value?: string; onChange?: (value: string) => void; placeholder?: string; type?: string; testId: string; multiline?: boolean; error?: string }) {
  return <div className="admin-field"><label htmlFor={testId}>{label}</label>{multiline ? (onChange ? <textarea id={testId} className="admin-control" value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${testId}-error` : undefined} data-testid={testId} /> : <textarea id={testId} className="admin-control" defaultValue={value} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `${testId}-error` : undefined} data-testid={testId} />) : (onChange ? <input id={testId} className="admin-control" type={type} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${testId}-error` : undefined} data-testid={testId} /> : <input id={testId} className="admin-control" type={type} defaultValue={value} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `${testId}-error` : undefined} data-testid={testId} />)}{error && <span className="admin-field-error" id={`${testId}-error`} role="alert" data-testid={`${testId}-error`}>{error}</span>}</div>;
}

function statusTone(status: string) {
  if (/publicerad|betald|levererad|aktiv|synkad|godkänd|klar|i lager/i.test(status)) return 'good';
  if (/utkast|väntar|att plocka|lågt|granskas|pågår/i.test(status)) return 'warn';
  if (/fel|arkiverad|avbruten|avvisad/i.test(status)) return 'bad';
  return 'info';
}

function Status({ children, testId }: { children: string; testId: string }) {
  return <span className={`admin-status ${statusTone(children)}`} data-testid={testId}>{children}</span>;
}

function Table({ headers, children, testId, go }: { headers: string[]; children: ReactNode; testId: string; go?: (path: string) => void }) {
  const { state } = useOperations();
  if (testId === 'table-variants') headers = ['Smak / pack', 'SKU', 'GTIN', 'Pris kr', 'Jämförpris', 'Pant', 'Moms', 'Status', ...(['Admin', 'Ekonomi'].includes(state.role) ? ['Inköpspris kr · Endast ekonomi'] : []), 'DSV · tillgängligt', 'Eget lager · tillgängligt'];
  return <div className="admin-table-wrap"><table className="admin-table" data-testid={testId}><thead><tr>{headers.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody><NavigableRows go={go} tableId={testId} headers={headers}>{children}</NavigableRows></tbody></table></div>;
}

function Heading({ kicker, title, description, actions }: { kicker: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="admin-page-heading"><div><p className="admin-kicker">{kicker}</p><h1>{title}</h1><p>{description}</p></div>{actions && <div className="admin-actions">{actions}</div>}</div>;
}

function Login({ onSubmit }: { onSubmit: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  return <main className="admin-login">
    <aside className="admin-login-aside"><div className="admin-login-brand"><span>S</span> SELFIT · administration</div><div className="admin-login-manifesto"><p className="eyebrow">Operativt nav</p><h1>Ordning i varje leverans.</h1><p>En samlad arbetsyta för katalog, order och lager. Byggd för tydliga beslut och lugna arbetsdagar.</p></div><small>Intern arbetsyta · Sverige</small></aside>
    <section className="admin-login-main"><form className="admin-login-card" onSubmit={(e) => { e.preventDefault(); setSubmitted(true); onSubmit(); }}><p className="admin-kicker">Säker inloggning</p><h2>Välkommen tillbaka</h2><p>Ange dina uppgifter och verifieringskod för att fortsätta.</p><div className="admin-login-fields"><label htmlFor="login-email">E-post<input id="login-email" type="email" autoComplete="username" required placeholder="namn@selfit.se" data-testid="input-login-email" /></label><label htmlFor="login-password">Lösenord<input id="login-password" type="password" autoComplete="current-password" required placeholder="Minst 8 tecken" data-testid="input-login-password" /></label><label htmlFor="login-code">Tvåstegskod<input id="login-code" type="text" inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} placeholder="6-siffrig kod" data-testid="input-login-code" /></label><button className="admin-btn primary" type="submit" data-testid="button-login-submit">Logga in</button></div>{submitted && <div className="admin-login-note" role="status" data-testid="status-login">Prototyp: uppgifterna har kontrollerats lokalt. Ingen session skapas.</div>}<div className="admin-login-note">Prototypmiljö — inga uppgifter skickas eller sparas.</div></form></section>
  </main>;
}

function Dashboard({ go, notice, setNotice }: { go: (path: string) => void; notice: string; setNotice: (s: string) => void }) {
  const { state } = useOperations();
  const paused = state.orders.filter((o) => o.status === 'Pausad').length;
  const proposals = state.policies.filter((p) => balance(state, p.sku, p.warehouse).available < p.point).length;
  const short = state.batches.filter((b) => batchStatus(state, b) === 'Kortdaterad' && b.quantity > 0).length;
  return <>
    <Heading kicker="Tisdag 24 november 2026" title="Dagens läge" description="En snabb överblick över det som behöver uppmärksamhet." actions={<><Button onClick={() => go('/admin/kunder')} testId="button-dashboard-customers">Kunder</Button><Button kind="quiet" onClick={() => setNotice('Översikten uppdaterades från den lokala exempeldatan.')} testId="button-refresh-overview">Uppdatera läge</Button></>} />
    {notice && <div className="admin-inline-message" role="status" data-testid="status-notice">{notice}</div>}
    <div className="admin-grid three">{[{ label: 'Pausade order', value: paused, href: '/admin/order?status=pausad' }, { label: 'Inköpsförslag', value: proposals, href: '/admin/inkop?flik=forslag' }, { label: 'Partier som snart går ut', value: short, href: '/admin/partier?status=kortdaterad' }].map((item) => <button key={item.label} className="ops-summary-link" onClick={() => go(item.href)}><span>{item.label}</span><strong>{item.value}</strong><span>Visa och hantera →</span></button>)}</div>
    <div className="admin-grid three admin-stat-grid">
      {[['Nya ordrar', '28', '+6 sedan 09:00'], ['Att plocka', '14', '3 väntar på betalning'], ['Nettoomsättning', '18 420 kr', '31 ordrar idag']].map(([label, value, foot]) => <div className="admin-panel admin-stat" key={label}><span className="admin-stat-label">{label}</span><strong>{value}</strong><div className="admin-stat-foot"><span className="admin-stat-mark">↗</span> {foot}</div></div>)}
    </div>
    <div className="admin-grid dashboard">
      <Panel title="Plockkö" subtitle="Ordrar som behöver hanteras nu" action={<Button small onClick={() => go('/admin/order')} testId="button-all-orders">Alla ordrar</Button>}>
        <Table headers={['Order', 'Kund', 'Summa', 'Status']} testId="table-picking-queue">
          {state.orders.filter((o) => ['Att plocka', 'Packas'].includes(o.status)).slice(0, 4).map((o) => <tr key={o.id} data-row-href={`/admin/order/${o.id}`}><td><button className="admin-btn quiet small" onClick={() => go(`/admin/order/${o.id}`)} data-testid={`link-order-${o.id}`}>{o.id}</button></td><td>{o.email.split('@')[0]}</td><td className="num">{o.amount} kr</td><td><Status testId={`status-order-${o.id}`}>{o.status}</Status></td></tr>)}
        </Table>
      </Panel>
      <div className="admin-grid">
        <Panel title="Lagersynk" subtitle="Senaste aktivitet från anslutna lager">
          <div className="admin-metric-line"><span>DSV 3PL</span><Status testId="status-sync-dsv">Synkad</Status></div><div className="admin-metric-line"><span>Senaste synk</span><strong>10:32</strong></div><div className="admin-metric-line"><span>Felkö</span><Status testId="status-sync-errors">2 fel</Status></div><div className="admin-actions admin-metric-actions"><Button small onClick={() => go('/admin/lager')} testId="button-open-warehouse">Öppna lagerstatus</Button></div>
        </Panel>
        <Panel title="Lågt lagersaldo" subtitle="Varianter under miniminivå" action={<Button small onClick={() => go('/admin/saldo')} testId="button-stock-list">Lager</Button>}>
          <div className="admin-metric-line"><span>PWO+ · Blåbär · 6-pack</span><strong>4 st</strong></div><div className="admin-metric-line"><span>Träningsband · set om 3</span><strong>3 st</strong></div><div className="admin-metric-line"><span>Protein pannkakor · jordgubb</span><strong>5 st</strong></div>
        </Panel>
        <div className="admin-notice error"><div><strong>2 orderrader kunde inte synkas</strong>Kontrollera lagerkopplingen innan nästa plockvåg.</div></div>
      </div>
    </div>
  </>;
}

function Products({ go, notice, setNotice }: { go: (path: string) => void; notice: string; setNotice: (s: string) => void }) {
  const [search, setSearch] = useAdminListState('produkter', 'search', '');
  const [category, setCategory] = useAdminListState('produkter', 'category', 'Alla kategorier');
  const [state, setState] = useAdminListState('produkter', 'status', 'Alla statusar');
  const [brand, setBrand] = useAdminListState('produkter', 'brand', 'Alla varumärken');
  const [rows, setRows] = useAdminListState('produkter', 'data', productRows);
  const brands = useMemo(() => [...new Set(rows.map((product) => product.brand))], [rows]);
  const visible = useMemo(() => rows.filter((p) => `${p.name} ${p.brand} ${p.slug}`.toLowerCase().includes(search.toLowerCase()) && (category === 'Alla kategorier' || p.category === category) && (state === 'Alla statusar' || p.status === state) && (brand === 'Alla varumärken' || p.brand === brand)), [rows, search, category, state, brand]);
  return <>
    <Heading kicker="Butik / katalog" title="Produkter" description="Hantera produktfamiljer, innehåll och försäljningsstatus." actions={<Button kind="primary" onClick={() => { setRows([{ slug: 'ny-produkt', name: 'Ny produkt', brand: 'SELFIT', category: 'Träning', status: 'Utkast', variants: 0, stock: 0, price: 0 }, ...rows]); setNotice('En ny produktfamilj skapades som lokalt utkast.'); }} testId="button-add-product">＋ Ny produkt</Button>} />
    <div className="admin-toolbar admin-product-toolbar"><div className="admin-search"><label className="admin-search-label" htmlFor="product-search">Sök produkter</label><input id="product-search" className="admin-control" placeholder="Namn, varumärke eller artikelnummer" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-products" /></div><label className="admin-filter-label">Varumärke<select className="admin-control" value={brand} onChange={(e) => setBrand(e.target.value)} data-testid="filter-product-brand"><option>Alla varumärken</option>{brands.map((item) => <option key={item}>{item}</option>)}</select></label><label className="admin-filter-label">Kategori<select className="admin-control" value={category} onChange={(e) => setCategory(e.target.value)} data-testid="filter-product-category"><option>Alla kategorier</option><option>Träning</option><option>Hälsa</option><option>Skönhet</option></select></label><label className="admin-filter-label">Status<select className="admin-control" value={state} onChange={(e) => setState(e.target.value)} data-testid="filter-product-status"><option>Alla statusar</option><option>Publicerad</option><option>Utkast</option><option>Arkiverad</option></select></label><span className="admin-status info" data-testid="text-products-count">{visible.length} produktfamiljer</span></div>
    {notice && <div className="admin-inline-message" role="status" data-testid="status-products-notice">{notice}</div>}
    <div className="admin-panel"><Table headers={['Produktfamilj', 'Kategori', 'Varianter', 'Lager totalt', 'Frånpris', 'Status', '']} testId="table-products">
      {visible.map((p) => <tr key={p.slug} data-row-href={`/admin/produkter/${p.slug}`} data-row-label={`Redigera ${p.name}`}><td><strong>{p.name}</strong><span className="subtext">{p.brand} · /produkt/{p.slug}</span></td><td>{p.category}</td><td>{p.variants}</td><td>{p.stock} st</td><td className="num">{p.price} kr</td><td><Status testId={`status-product-${p.slug}`}>{p.status}</Status></td><td><Button small onClick={() => go(`/admin/produkter/${p.slug}`)} testId={`button-edit-product-${p.slug}`}>Redigera</Button></td></tr>)}
      {visible.length === 0 && <tr><td colSpan={7}><div className="admin-panel-body muted" data-testid="empty-products">Inga produkter matchar sökningen. Prova en annan filtrering.</div></td></tr>}
    </Table></div>
  </>;
}

type VariantRow = { flavour: string; pack: number; sku: string; gtin: string; price: string; compare: string; deposit: string; vat: string; stockDsv: string; stockOwn: string; status: string };
const pwoVariantFlavours = [
  { name: 'Blåbär', code: 'BL' },
  { name: 'Jordgubb', code: 'JO' },
  { name: 'Bärmix', code: 'BM' },
  { name: 'Mango & passionsfrukt', code: 'MP' },
  { name: 'Grönt äpple', code: 'GA' },
  { name: 'Black Edition', code: 'BE' },
];
const pwoVariantRows: VariantRow[] = pwoVariantFlavours.flatMap((flavour, flavourIndex) =>
  [6, 12, 24].map((pack, packIndex) => {
    const stock = flavour.name === 'Blåbär' && pack === 6 ? 4
      : flavour.name === 'Jordgubb' && pack === 6 ? 4
        : flavour.name === 'Jordgubb' && pack === 24 ? 0
          : flavour.name === 'Mango & passionsfrukt' && pack === 24 ? 3
            : 38 + flavourIndex * 7 + packIndex * 3;
    return {
      flavour: flavour.name, pack, sku: `PWO-${flavour.code}-${String(pack).padStart(2, '0')}`,
      gtin: `735012${flavourIndex}${packIndex}000${String(pack).padStart(2, '0')}`,
      price: pack === 6 ? '149' : pack === 12 ? '279' : '529',
      compare: pack === 6 ? '75,25 kr/l' : pack === 12 ? '70,45 kr/l' : '66,79 kr/l',
      deposit: String(pack), vat: '12%', stockDsv: String(stock), stockOwn: '0',
      status: flavour.name === 'Black Edition' && pack === 24 ? 'Ej till salu' : 'Aktiv',
    };
  }),
);
const productVariantConfig: Record<string, { flavours: string[]; packs: string[]; rows: VariantRow[] }> = {
  'pwo-plus': { flavours: pwoVariantFlavours.map((flavour) => flavour.name), packs: ['6', '12', '24'], rows: pwoVariantRows },
  'protein-pannkakor': { flavours: ['Blåbär', 'Jordgubb'], packs: ['1'], rows: [
    { flavour: 'Blåbär', pack: 1, sku: 'PRO-PAN-BL', gtin: '7350200000881', price: '129', compare: '258 kr/kg', deposit: '0', vat: '12%', stockDsv: '24', stockOwn: '4', status: 'Utkast' },
    { flavour: 'Jordgubb', pack: 1, sku: 'PRO-PAN-JO', gtin: '7350200000898', price: '129', compare: '258 kr/kg', deposit: '0', vat: '12%', stockDsv: '20', stockOwn: '4', status: 'Utkast' },
  ] },
  'kreatin-monohydrat': { flavours: ['Neutral'], packs: ['1'], rows: [
    { flavour: 'Neutral', pack: 1, sku: 'KRE-300', gtin: '7350200000440', price: '249', compare: '830 kr/kg', deposit: '0', vat: '12%', stockDsv: '58', stockOwn: '6', status: 'Aktiv' },
  ] },
  'd-vitamin-50': { flavours: ['Neutral'], packs: ['1'], rows: [
    { flavour: 'Neutral', pack: 1, sku: 'DVT-050', gtin: '7350300000110', price: '89', compare: '0,99 kr/kapsel', deposit: '0', vat: '12%', stockDsv: '38', stockOwn: '3', status: 'Aktiv' },
  ] },
  'omega-3': { flavours: ['Neutral'], packs: ['1', '3'], rows: [
    { flavour: 'Neutral', pack: 1, sku: 'OMG-120', gtin: '7350300000200', price: '189', compare: '1,58 kr/kapsel', deposit: '0', vat: '12%', stockDsv: '20', stockOwn: '7', status: 'Aktiv' },
    { flavour: 'Neutral', pack: 3, sku: 'OMG-360', gtin: '7350300000217', price: '499', compare: '1,39 kr/kapsel', deposit: '0', vat: '12%', stockDsv: '14', stockOwn: '2', status: 'Aktiv' },
  ] },
};

function createEditorVariants(slug: string): VariantRow[] {
  return productVariantConfig[slug]?.rows.map((variant) => ({ ...variant })) ?? [{
    flavour: 'Standard', pack: 1, sku: `${slug.slice(0, 3).toUpperCase()}-01`, gtin: '7350400000118',
    price: String(productRows.find((product) => product.slug === slug)?.price ?? 0), compare: '—', deposit: '0', vat: '25%',
    stockDsv: '16', stockOwn: '2', status: 'Aktiv',
  }];
}

function ProductEditor({ slug, go, notify, productTypes, mediaItems, onMediaItemsChange, onAddRedirect }: {
  slug: string;
  go: (path: string) => void;
  notify: (s: string) => void;
  productTypes: ProductTypeDefinition[];
  mediaItems: LocalMediaItem[];
  onMediaItemsChange: (items: LocalMediaItem[]) => void;
  onAddRedirect: (oldUrl: string, newUrl: string) => void;
}) {
  const { state: operations, commit } = useOperations();
  const canFinance = ['Admin', 'Ekonomi'].includes(operations.role);
  const [catalog] = useAdminListState('produkter', 'data', productRows);
  const product = catalog.find((p) => p.slug === slug) ?? productRows[0];
  const variantConfig = productVariantConfig[slug] ?? { flavours: ['Standard'], packs: ['1'], rows: createEditorVariants(slug) };
  const [tab, setTab] = useAdminListState(`produkt-${slug}`, 'tab', 'Grunddata');
  const [view, setView] = useState('Dator');
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState('En tydlig och lättanvänd produkt för en aktiv vardag. Utvecklad med fokus på kvalitet och enkelhet.');
  const [variants, setVariants] = useState<VariantRow[]>(() => createEditorVariants(slug));
  const [flavours, setFlavours] = useState(variantConfig.flavours);
  const [packs, setPacks] = useState(variantConfig.packs);
  const [url, setUrl] = useState(slug);
  const [urlOriginal] = useState(slug);
  const [mediaAlt, setMediaAlt] = useState(`${product.name} produktbild mot ljus bakgrund`);
  const [productType, setProductType] = useState(
    slug === 'fuktkram-ansikte' ? 'kroppsvard'
      : ['shaker-600', 'traningsband-set'].includes(slug) ? 'redskap-tillbehor'
        : ['kreatin-monohydrat', 'd-vitamin-50', 'omega-3'].includes(slug) ? 'kosttillskott'
          : 'dryck-livsmedel',
  );
  const [selectedMediaId, setSelectedMediaId] = useState(
    () => mediaItems.find((item) => item.usedBy.includes(product.name))?.id ?? '',
  );
  const [priceChanged, setPriceChanged] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const selectedMedia = mediaItems.find((item) => item.id === selectedMediaId);
  const duplicateSku = variants.some((v, i) => variants.findIndex((other) => other.sku === v.sku) !== i);
  const duplicateGtin = variants.some((v, i) => variants.findIndex((other) => other.gtin === v.gtin) !== i);
  const missing = !name.trim() || !description.trim() || !mediaAlt.trim() || duplicateSku || duplicateGtin || variants.some((v) => !v.sku.trim() || !v.gtin.trim() || !v.price.trim());
  const createVariants = () => {
    let sequence = 1;
    const prefix = slug.split('-').map((part) => part.slice(0, 2).toUpperCase()).join('');
    const next = flavours.flatMap((flavour) => packs.map((pack) => {
      const numberPack = Number(pack);
      const flavorCode = flavour.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
      const flavorOrdinal = variantConfig.flavours.indexOf(flavour) + 1;
      const newVariant: VariantRow = {
        flavour, pack: numberPack, sku: `${prefix}-${flavorCode}${flavorOrdinal}-${numberPack}`,
        gtin: `735099000${String(sequence++).padStart(4, '0')}`,
        price: numberPack === 6 ? '149' : numberPack === 12 ? '279' : numberPack === 24 ? '529' : String(product.price),
        compare: numberPack > 1 ? '70,45 kr/l' : '—', deposit: String(numberPack > 1 && slug === 'pwo-plus' ? numberPack : 0),
        vat: '12%', stockDsv: '0', stockOwn: '0', status: 'Utkast',
      };
      return newVariant;
    }));
    setVariants(next);
    notify(`${next.length} variantkombinationer genererades lokalt. Kontrollera SKU och GTIN innan publicering.`);
  };
  const setV = (index: number, key: keyof VariantRow, value: string) => {
    if (key === 'price') setPriceChanged(true);
    setVariants((current) => current.map((variant, i) => i === index ? { ...variant, [key]: value } : variant));
  };
  const selectMedia = (item: LocalMediaItem) => {
    setSelectedMediaId(item.id);
    setMediaAlt(item.alt);
    onMediaItemsChange(mediaItems.map((media) => {
      const withoutProduct = media.usedBy.filter((usedBy) => usedBy !== product.name);
      return media.id === item.id
        ? { ...media, usedBy: [...new Set([...withoutProduct, product.name])] }
        : { ...media, usedBy: withoutProduct };
    }));
  };
  const tabNames = ['Grunddata', 'Beskrivning', 'Media & SEO', 'Näring & innehåll', 'Varianter', 'Relationer'];
  const editorTabs = <div className="admin-tabs" role="group" aria-label="Produktens redigeringsavsnitt">{tabNames.map((item) => <button key={item} type="button" aria-pressed={tab === item} className="admin-tab" onClick={() => setTab(item)} data-testid={`tab-product-${item.toLowerCase().replaceAll(' ', '-')}`}>{item}</button>)}</div>;
  return <>
    <Heading kicker="Katalog / produktfamilj" title={product.name} description="Redigera produktfamilj och dess försäljningsvarianter." actions={<><Button onClick={() => notify('Ändringarna sparades som lokalt utkast.')} testId="button-save-draft">Spara utkast</Button><Button kind="primary" onClick={() => notify(missing ? 'Publicering stoppad: komplettera obligatoriska fält och granska varningslistan.' : 'Produkten markerades som publicerad i prototypen.')} testId="button-publish-product">Publicera</Button></>} />
    <div className={`admin-product-editor ${tab === 'Varianter' ? 'variant-layout' : ''}`}>
      <div className="admin-panel"><div className="admin-panel-body">{editorTabs}
        {tab === 'Grunddata' && <div className="admin-form-grid"><Field label="Produktnamn" value={name} onChange={setName} testId="input-product-name" error={!name.trim() ? 'Produktnamn måste fyllas i.' : undefined} /><Field label="Varumärke" value={product.brand} testId="input-product-brand" /><Field label="Produktens URL" value={url} onChange={setUrl} testId="input-product-url" /><Field label="Kategori" value={product.category} testId="input-product-category" /><Field label="Kort ingress" value="Kolsyrad pre-workout med beta-alanin, AAKG och koffein." multiline testId="input-product-intro" /><div className="admin-field"><label htmlFor="product-visibility">Synlighet</label><select id="product-visibility" className="admin-control" data-testid="select-product-visibility"><option>Publicerad</option><option>Utkast</option><option>Arkiverad</option></select></div><div className="admin-field"><label htmlFor="product-type">Produkttyp</label><select id="product-type" className="admin-control" value={productType} onChange={(event) => setProductType(event.target.value)} data-testid="select-product-type">{productTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></div></div>}
         {tab === 'Beskrivning' && <div className="admin-form-grid"><Field label="Produktbeskrivning" value={description} onChange={setDescription} multiline testId="input-product-description" error={!description.trim() ? 'Beskrivningen måste fyllas i.' : undefined} /><Field label="Användning och varningar" value="Drick före träning. Innehåller 300 mg koffein per burk. Rekommenderas inte för barn, gravida eller ammande." multiline testId="input-product-usage" /><fieldset className="admin-option-set span-2"><legend>Kategorier</legend><div className="admin-toolbar"><label className="admin-toggle-row"><input type="checkbox" defaultChecked data-testid="check-category-training" /> Träning</label><label className="admin-toggle-row"><input type="checkbox" data-testid="check-category-health" /> Hälsa</label><label className="admin-toggle-row"><input type="checkbox" data-testid="check-category-new" /> Nyheter</label></div></fieldset></div>}
         {tab === 'Media & SEO' && <div className="admin-form-grid"><Field label="Bildens alt-text" value={mediaAlt} onChange={setMediaAlt} testId="input-media-alt" error={!mediaAlt.trim() ? 'Alt-text krävs för produktbilden.' : undefined} /><Field label="SEO-titel" value={`${product.name} – SELFiT`} testId="input-seo-title" /><Field label="SEO-beskrivning" value="Färdigblandad pre-workout med 300 mg koffein. Välj smak och packstorlek." multiline testId="input-seo-description" /><Field label="URL-slug" value={url} onChange={setUrl} testId="input-seo-url" /><div className="admin-field span-2"><span className="admin-section-label">Välj produktmedia</span><div className="admin-notice info">Vald bild: {selectedMedia?.name ?? 'ingen bild vald'}. Bild och alt-text ändras lokalt.</div><MediaPicker items={mediaItems} selectedId={selectedMediaId} onSelect={selectMedia} /></div>{url !== urlOriginal && <div className="admin-notice error span-2"><div><strong>URL ändras — omdirigering krävs</strong>En permanent omdirigering från /produkt/{urlOriginal} till /produkt/{url} bör skapas.</div><Button small kind="primary" onClick={() => { onAddRedirect(`/produkt/${urlOriginal}`, `/produkt/${url}`); notify('Omdirigeringen lades till i listan.'); go('/admin/omdirigeringar'); }} testId="button-add-product-redirect">Lägg till omdirigering</Button></div>}</div>}
         {tab === 'Näring & innehåll' && <div className="admin-form-grid"><Field label="Ingredienser" value="Kolsyrat vatten, beta-alanin, AAKG, koffein, aromer, sötningsmedel." multiline testId="input-ingredients" /><Field label="Allergener" value="Inga deklarerade allergener" testId="input-allergens" /><Panel title="Näringsvärde" subtitle="Värde per 100 ml / per burk"><div className="admin-metric-line"><span>Energi</span><strong>4 kJ / 1 kcal · 13 kJ / 3 kcal</strong></div><div className="admin-metric-line"><span>Koffein</span><strong>91 mg · 300 mg</strong></div><Button small onClick={() => notify('Näringsraden kan redigeras lokalt i prototypen.')} testId="button-edit-nutrition">＋ Lägg till näringsrad</Button></Panel><div className="admin-notice error"><div><strong>Hälsopåståenden kräver granskning</strong>Påståenden om effekt ska verifieras mot godkända formuleringar före publicering.</div></div><label className="admin-toggle-row"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} data-testid="check-health-claim-reviewed" /> Jag har granskat hälsopåståenden</label><div className="span-2"><ProductTypeFieldsEditor productType={productType} productTypes={productTypes} /></div></div>}
         {tab === 'Varianter' && <><p className="muted small admin-variant-intro">Välj kombinationer och generera SKU-rader. Varje rad kan sedan justeras separat.</p><div className="admin-form-grid"><fieldset className="admin-option-set"><legend>Smak</legend>{variantConfig.flavours.map((flavour) => <label key={flavour} className="admin-toggle-row"><input type="checkbox" checked={flavours.includes(flavour)} onChange={(e) => setFlavours((list) => e.target.checked ? [...list, flavour] : list.filter((f) => f !== flavour))} data-testid={`check-flavour-${flavour.toLowerCase().replaceAll(' ', '-')}`} />{flavour}</label>)}</fieldset><fieldset className="admin-option-set"><legend>Packstorlek</legend>{variantConfig.packs.map((pack) => <label key={pack} className="admin-toggle-row"><input type="checkbox" checked={packs.includes(pack)} onChange={(e) => setPacks((list) => e.target.checked ? [...list, pack] : list.filter((p) => p !== pack))} data-testid={`check-pack-${pack}`} />{pack === '1' ? 'Standardförpackning' : `${pack}-pack`}</label>)}</fieldset><div className="admin-field span-2"><Button kind="primary" onClick={createVariants} testId="button-generate-variants">Generera varianter</Button></div></div><hr className="admin-divider" />{priceChanged && <div className="admin-notice info" role="note" data-testid="warning-price-changed"><div><strong>Prisändring behöver prisinformation</strong>Kontrollera att lägsta pris de senaste 30 dagarna visas för kunden.</div></div>}<Table headers={['Smak / pack', 'SKU', 'GTIN', 'Pris kr', 'Jämförpris', 'Pant', 'Moms', 'DSV', 'Eget lager', 'Status']} testId="table-variants">{variants.map((v, index) => {
          const duplicateSkuCell = Boolean(v.sku) && variants.findIndex((other) => other.sku === v.sku) !== index;
          const duplicateGtinCell = Boolean(v.gtin) && variants.findIndex((other) => other.gtin === v.gtin) !== index;
          const fieldKeys: (keyof VariantRow)[] = ['sku', 'gtin', 'price', 'compare', 'deposit', 'vat', 'status'];
          const fieldLabels: Record<keyof VariantRow, string> = { flavour: 'smak', pack: 'packstorlek', sku: 'SKU', gtin: 'GTIN', price: 'pris', compare: 'jämförpris', deposit: 'pant', vat: 'moms', stockDsv: 'lager DSV', stockOwn: 'lager eget lager', status: 'status' };
          const stockVariant = operations.variants.find((item) => item.sku === v.sku);
          return <tr key={`${v.sku}-${index}`} data-row-href={stockVariant ? `/admin/saldo/${v.sku}` : undefined}><td><strong>{v.flavour}</strong><span className="subtext">{v.pack === 1 ? 'Standard' : `${v.pack}-pack`}</span></td>{fieldKeys.map((key) => {
            const duplicate = (key === 'sku' && duplicateSkuCell) || (key === 'gtin' && duplicateGtinCell);
            const missingField = (key === 'sku' && !v.sku.trim()) || (key === 'gtin' && !v.gtin.trim()) || (key === 'price' && !v.price.trim());
            const error = duplicate ? `Dubblett: ${key === 'sku' ? 'SKU' : 'GTIN'} måste vara unik.` : missingField ? 'Obligatoriskt fält.' : '';
            return <td key={key}><div className="admin-cell-editor"><input aria-label={`${v.flavour} ${v.pack === 1 ? 'standardförpackning' : `${v.pack}-pack`} · ${fieldLabels[key]}`} className="admin-control admin-variant-control" aria-invalid={Boolean(error)} aria-describedby={error ? `variant-${key}-${index}-error` : undefined} value={v[key]} onChange={(e) => setV(index, key, e.target.value)} data-testid={`input-variant-${key}-${index}`} />{error && <span className="admin-cell-error" id={`variant-${key}-${index}-error`} role="alert" data-testid={`error-variant-${key}-${index}`}>{error}</span>}</div></td>;
          })}{canFinance && <td><label className="admin-field"><span className="ops-note">Endast ekonomi</span><input className="admin-control" aria-label={`Inköpspris ${v.sku}`} type="number" min="0" step="0.01" value={stockVariant?.cost ?? ''} disabled={!stockVariant} onChange={(e) => { const value = Number(e.target.value); if (value >= 0) commit((d) => { const item = d.variants.find((item) => item.sku === v.sku); if (item) item.cost = value; }); }} /></label></td>}{['dsv', 'own'].map((warehouse) => <td key={warehouse}>{stockVariant ? <a href={`/admin/saldo/${v.sku}`} onClick={(e) => { e.preventDefault(); go(`/admin/saldo/${v.sku}`); }}>{balance(operations, v.sku, warehouse).available} st · Visa lager</a> : <span>Ingen lagerpost</span>}</td>)}</tr>;
         })}</Table><div className="admin-price-history"><ProductPriceHistoryPanel productSlug={slug} /></div></>}
         {tab === 'Relationer' && <ProductRelationsSection productSlug={slug} />}
      </div></div>
      <aside className="admin-preview"><Panel title="Butikförhandsvisning" subtitle="Ungefärlig produktvy" action={<div className="admin-actions"><Button small onClick={() => setView('Mobil')} testId="button-preview-mobile">Mobil</Button><Button small onClick={() => setView('Dator')} testId="button-preview-desktop">Dator</Button></div>}><div className={`admin-preview-card ${view === 'Mobil' ? 'mobile' : ''}`}><div className="admin-preview-hero">{selectedMedia ? <img src={selectedMedia.src} alt={mediaAlt} /> : <div className="admin-preview-can" />}</div><div className="admin-preview-content"><h3>{name || 'Produktnamn saknas'}</h3><p>{description}</p><div className="admin-preview-price">{variants[0]?.price || product.price} kr <span className="admin-preview-note">{Number(variants[0]?.deposit ?? 0) > 0 ? `inkl. ${variants[0].deposit} kr pant` : 'inkl. moms'}</span></div></div></div><ul className="admin-checklist"><li className={name.trim() ? '' : 'missing'}>{name.trim() ? 'Produktnamn finns' : 'Produktnamn saknas'}</li><li className={description.trim() ? '' : 'missing'}>{description.trim() ? 'Beskrivning finns' : 'Beskrivning saknas'}</li><li className={mediaAlt.trim() ? '' : 'missing'}>{mediaAlt.trim() ? 'Alt-text finns' : 'Alt-text saknas'}</li><li className={variants.every((v) => v.sku && v.gtin && v.price) ? '' : 'missing'}>SKU, GTIN och pris för alla varianter</li><li className={reviewed ? '' : 'missing'}>{reviewed ? 'Hälsopåstående granskat' : 'Hälsopåstående ej granskat'}</li></ul><div className="admin-actions"><Button small onClick={() => notify('Produkt sparad som utkast lokalt.')} testId="button-product-draft">Spara utkast</Button><Button small kind="danger" onClick={() => notify('Produktfamiljen arkiverades lokalt.')} testId="button-product-archive">Arkivera</Button></div></Panel></aside>
    </div>
  </>;
}

function Orders({ go, notify }: { go: (path: string) => void; notify: (s: string) => void }) {
  const [search, setSearch] = useAdminListState('order', 'search', '');
  const [filter, setFilter] = useAdminListState('order', 'status', 'Alla statusar');
  const [rows, setRows] = useState(orderRows);
  const filtered = rows.filter((o) => `${o.id} ${o.email} ${o.sku} ${o.tracking}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'Alla statusar' || o.status === filter));
  return <><Heading kicker="Order & lager" title="Ordrar" description="Sök på ordernummer, e-post, SKU eller spårningsnummer." actions={<Button onClick={() => notify('Orderexport sammanställd lokalt.')} testId="button-export-orders">Exportera</Button>} /><div className="admin-toolbar"><div className="admin-search"><label className="admin-search-label" htmlFor="order-search">Sök ordrar</label><input id="order-search" className="admin-control" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order, e-post, SKU eller spårning" data-testid="input-search-orders" /></div><label className="admin-filter-label">Status<select className="admin-control" value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="filter-order-status"><option>Alla statusar</option>{['Att plocka', 'Packas', 'Skickad', 'Levererad', 'Avbruten'].map((s) => <option key={s}>{s}</option>)}</select></label><span className="admin-status info" data-testid="text-order-count">{filtered.length} ordrar</span></div><div className="admin-panel"><Table headers={['Ordernummer', 'Kund', 'Datum', 'Rader / SKU', 'Summa inkl. pant', 'Betalning', 'Leveransstatus', '']} testId="table-orders">{filtered.map((o) => <tr key={o.id}><td><strong>{o.id}</strong></td><td>{o.email}</td><td>{o.date}</td><td>{o.sku}</td><td className="num">{o.amount} kr</td><td><Status testId={`status-payment-${o.id}`}>{o.payment}</Status></td><td><Status testId={`status-delivery-${o.id}`}>{o.status}</Status></td><td><Button small onClick={() => go(`/admin/order/${o.id}`)} testId={`button-open-order-${o.id}`}>Visa</Button></td></tr>)}</Table></div></>;
}

function OrderDetail({ id, go, notify }: { id: string; go: (path: string) => void; notify: (s: string) => void }) {
  const order = orderRows.find((o) => o.id === id) ?? orderRows[0];
  const [status, setStatus] = useState(order.status);
  const [refund, setRefund] = useState('');
  const [cancelled, setCancelled] = useState(false);
  return <>
    <Heading kicker={`Ordrar / ${order.id}`} title={`Order ${order.id}`} description={`${order.email} · lagd ${order.date}`} actions={<Button onClick={() => notify('Orderbekräftelsen öppnades som utskriftsvänlig lokal vy.')} testId="button-print-order">Skriv ut</Button>} />
    <div className="admin-grid dashboard">
      <div className="admin-grid">
        <Panel title="Orderrader" subtitle="Belopp i SEK, inkl. pant">
          <Table headers={['Artikel / variant', 'SKU', 'Antal', 'Pris', 'Pant', 'Moms']} testId="table-order-lines">
            <tr><td><strong>PWO+ Pre-workout</strong><span className="subtext">Blåbär · 12-pack</span></td><td>{order.sku}</td><td>1</td><td>279 kr</td><td>12 kr</td><td>12 %</td></tr>
            <tr><td><strong>Kreatin Monohydrat</strong><span className="subtext">300 g</span></td><td>KRE-300</td><td>1</td><td>249 kr</td><td>0 kr</td><td>12 %</td></tr>
          </Table>
          <div className="admin-panel-body"><div className="admin-metric-line"><span>Varor</span><strong>528 kr</strong></div><div className="admin-metric-line"><span>Pant</span><strong>12 kr</strong></div><div className="admin-metric-line"><span>Frakt</span><strong>38 kr</strong></div><div className="admin-metric-line"><span>Totalt</span><strong>578 kr</strong></div></div>
        </Panel>
        <Panel title="Händelser" subtitle="Lokal orderhistorik"><div className="admin-timeline">{[['Order skapad', order.date, 'Kassan genomförd'], ['Betalning mottagen', '20 november, 10:43', 'Kustom · betalningen godkänd'], ['Plockkö', '20 november, 10:44', 'Väntar på plockning']].map(([title, time, detail]) => <div className="admin-event" key={title}><strong>{title}</strong>{detail}<time>{time}</time></div>)}</div></Panel>
      </div>
      <div className="admin-grid">
        <Panel title="Betalning & leverans">
          <div className="admin-metric-line"><span>Kustom</span><Status testId="status-kustom-payment">{order.payment}</Status></div>
          <div className="admin-metric-line"><span>Leverans</span><Status testId="status-order-delivery">{status}</Status></div>
          <div className="admin-metric-line"><span>Plocklager</span><strong>DSV 3PL · Jönköping</strong></div>
          <div className="admin-metric-line"><span>Spårning</span><strong>{order.tracking}</strong></div>
          <div className="admin-actions admin-panel-actions"><Button small onClick={() => { setStatus('Skickad'); notify('Order markerad som skickad lokalt.'); }} testId="button-mark-shipped">Markera skickad</Button><Button small onClick={() => notify('Spårningslänken kopierades i prototypen.')} testId="button-copy-tracking">Kopiera spårning</Button></div>
        </Panel>
        <Panel title="Återbetalning / avbokning">
          <Field label="Belopp för återbetalning (kr)" value={refund} onChange={setRefund} placeholder="Exempel: 149" testId="input-refund-amount" />
          <div className="admin-actions admin-panel-actions"><Button small onClick={() => notify(refund ? `Återbetalning ${refund} kr markerad lokalt.` : 'Ange ett belopp för återbetalning.')} testId="button-partial-refund">Delåterbetala</Button><Button small kind="primary" onClick={() => notify('Full återbetalning markerad lokalt. Ingen betalning har skickats.')} testId="button-full-refund">Återbetala hela</Button></div>
          <hr className="admin-divider" /><Button small kind="danger" onClick={() => { setCancelled(true); setStatus('Avbruten'); }} testId="button-cancel-order">{cancelled ? 'Order avbruten' : 'Avbryt order'}</Button>{cancelled && <p className="admin-inline-message" role="status" data-testid="status-order-cancel">Ordern markerades som avbruten i prototypen.</p>}
        </Panel>
      </div>
    </div>
    <OrderAdditionalDetails order={order} go={go} notify={notify} />
  </>;
}

function CategoryFiltersPanel({ productTypes, categoryFilters, onChange }: {
  productTypes: ProductTypeDefinition[];
  categoryFilters: CategoryFilterDefinition[];
  onChange: (filters: CategoryFilterDefinition[]) => void;
}) {
  const [category, setCategory] = useAdminListState('kategorifilter', 'category', 'Träning');
  const current = categoryFilters.find((filter) => filter.category === category) ?? { category, fieldIds: [] };
  const fields = productTypes.flatMap((type) => type.fields.map((field) => ({ ...field, typeName: type.name })));
  const update = (fieldIds: string[]) => {
    const next = { category, fieldIds };
    onChange(categoryFilters.some((filter) => filter.category === category)
      ? categoryFilters.map((filter) => filter.category === category ? next : filter)
      : [...categoryFilters, next]);
  };
  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.fieldIds.length) return;
    const fieldIds = [...current.fieldIds];
    [fieldIds[index], fieldIds[nextIndex]] = [fieldIds[nextIndex], fieldIds[index]];
    update(fieldIds);
  };
  return <Panel title="Kategorifilter" subtitle="Välj och ordna de produktegenskaper som kunder kan filtrera på.">
    <div className="admin-form-grid">
      <div className="admin-field"><label htmlFor="category-filter-name">Kategori</label><select id="category-filter-name" className="admin-control" value={category} onChange={(event) => setCategory(event.target.value)} data-testid="select-category-filter-name">{['Träning', 'Hälsa', 'Skönhet'].map((name) => <option key={name}>{name}</option>)}</select></div>
      <fieldset className="admin-option-set span-2"><legend>Fält som visas som filter</legend>{fields.map((field) => <label className="admin-toggle-row" key={field.id}><input type="checkbox" checked={current.fieldIds.includes(field.id)} onChange={(event) => update(event.target.checked ? [...current.fieldIds, field.id] : current.fieldIds.filter((id) => id !== field.id))} data-testid={`check-category-page-filter-${field.id}`} />{field.name} <span className="subtext">{field.typeName}</span></label>)}</fieldset>
      <div className="admin-field span-2"><span className="admin-section-label">Visningsordning</span><div className="admin-tree">{current.fieldIds.map((id, index) => {
        const field = fields.find((item) => item.id === id);
        if (!field) return null;
        return <div className="admin-tree-row" key={id}><span className="admin-tree-name">{index + 1}. {field.name}<span className="subtext">{field.typeName}</span></span><Button small disabled={index === 0} onClick={() => move(index, -1)} ariaLabel={`Flytta ${field.name} upp`} testId={`button-category-filter-up-${id}`}>↑</Button><Button small disabled={index === current.fieldIds.length - 1} onClick={() => move(index, 1)} ariaLabel={`Flytta ${field.name} ned`} testId={`button-category-filter-down-${id}`}>↓</Button></div>;
      })}{current.fieldIds.length === 0 && <div className="admin-empty">Inga filter valda för kategorin.</div>}</div></div>
    </div>
  </Panel>;
}

function Categories({ notify, go, productTypes, categoryFilters, onCategoryFiltersChange }: {
  notify: (s: string) => void;
  go: (path: string) => void;
  productTypes: ProductTypeDefinition[];
  categoryFilters: CategoryFilterDefinition[];
  onCategoryFiltersChange: (filters: CategoryFilterDefinition[]) => void;
}) {
  const [rows, setRows] = useState([{ name: 'Sporttillskott', slug: 'sporttillskott', count: 42, level: 0 }, { name: 'Pre-workout', slug: 'pre-workout', count: 8, level: 1 }, { name: 'Vitaminer och mineraler', slug: 'vitaminer-och-mineraler', count: 31, level: 0 }, { name: 'Vitaminer', slug: 'vitaminer', count: 12, level: 1 }, { name: 'Kroppsvård', slug: 'kroppsvard', count: 24, level: 0 }]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const move = (from: number, to: number) => setRows((current) => {
    if (to < 0 || to >= current.length || from === to) return current;
    const next = [...current];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  });
  return <>
     <Heading kicker="Butik / navigering" title="Kategorier" description="Styr butikens hierarki och redaktionella innehåll." actions={<><Button onClick={() => go('/admin/produkttyper')} testId="button-category-filters">Produkttyper & filter</Button><Button kind="primary" onClick={() => { setRows([...rows, { name: 'Ny kategori', slug: 'ny-kategori', count: 0, level: 0 }]); notify('Kategori tillagd lokalt.'); }} testId="button-add-category">＋ Ny kategori</Button></>} />
    <div className="admin-grid two">
      <Panel title="Kategoriträd" subtitle="Dra för att ändra ordning eller använd knapparna för tangentbord.">
        <div className="admin-tree" onDragEnd={() => setDragIndex(null)}>
          {rows.map((row, i) => <div {...recordRowProps(`kategori:${row.slug}`, row.name, [{ label: 'Namn', value: row.name }, { label: 'URL', value: row.slug }, { label: 'Antal produkter', value: String(row.count) }], go)} className={`admin-tree-row admin-row-clickable ${row.level ? 'indent' : ''}`} key={`${row.slug}-${i}`} draggable onDragStart={() => setDragIndex(i)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (dragIndex !== null) move(dragIndex, i); setDragIndex(null); }} data-testid={`category-row-${row.slug}`}>
            <span className="admin-grip" aria-hidden="true">⠿</span>
            <span className="admin-tree-name">{row.name}<span className="subtext">/{row.slug}</span></span>
            <span className="admin-tree-meta">{row.count} produkter</span>
            <Button small onClick={() => setRows(rows.map((r, ix) => ix === i ? { ...r, level: r.level ? 0 : 1 } : r))} testId={`button-indent-category-${i}`}>{row.level ? 'Flytta ut' : 'Nästla'}</Button>
            <Button small disabled={i === 0} onClick={() => move(i, i - 1)} testId={`button-move-category-up-${i}`} ariaLabel={`Flytta ${row.name} upp`} >↑</Button>
            <Button small disabled={i === rows.length - 1} onClick={() => move(i, i + 1)} testId={`button-move-category-down-${i}`} ariaLabel={`Flytta ${row.name} ned`}>↓</Button>
            <Button small onClick={() => setRows(rows.filter((_, ix) => ix !== i))} testId={`button-delete-category-${i}`}>Ta bort</Button>
          </div>)}
        </div>
        <div className="admin-actions admin-category-save"><Button small onClick={() => notify('Kategoriordningen sparades lokalt.')} testId="button-save-category-order">Spara ordning</Button></div>
      </Panel>
      <div className="admin-grid">
        <Panel title="Kategorisida" subtitle="Innehåll till publik kategorisida"><div className="admin-form-grid"><Field label="Rubrik" value="Träning och återhämtning" testId="input-category-title" /><Field label="Kort intro" value="Utrustning och tillskott för passet." multiline testId="input-category-intro" /><Field label="Supportartikel / länk" value="/support/valj-ratt-pre-workout" testId="input-category-support-link" /><Button kind="primary" onClick={() => notify('Kategorisidans innehåll sparades lokalt.')} testId="button-save-category-content">Spara innehåll</Button></div></Panel>
        <Panel title="Startsida" subtitle="Utvald kategori och innehållsmodul"><div className="admin-form-grid"><Field label="Startsiderubrik" value="Hitta din rutin" testId="input-homepage-title" /><Field label="Beskrivning" value="Små val som gör träningen enklare." multiline testId="input-homepage-description" /><label className="admin-toggle-row"><input type="checkbox" defaultChecked data-testid="check-homepage-featured" /> Visa kategorin på startsidan</label><Button onClick={() => notify('Startsidesinnehåll uppdaterades lokalt.')} testId="button-save-homepage">Spara startsida</Button></div></Panel>
        <Panel title="Supportsidor" subtitle="Redigera hjälpinnehåll och vanliga frågor"><div className="admin-form-grid"><Field label="Sidrubrik" value="Vanliga frågor om träning" testId="input-support-title" /><Field label="Ingress" value="Här hittar kunden svar om produkter, leverans och retur." multiline testId="input-support-intro" /><Field label="Fråga" value="Hur väljer jag rätt PWO+?" testId="input-support-question" /><Field label="Svar" value="Välj smak och packstorlek på produktsidan. Läs alltid innehåll och användningsråd före köp." multiline testId="input-support-answer" /><Button kind="primary" onClick={() => notify('Supportsidans exempeltext sparades lokalt.')} testId="button-save-support-page">Spara supportsida</Button></div></Panel>
      </div>
     </div>
     <CategoryFiltersPanel productTypes={productTypes} categoryFilters={categoryFilters} onChange={onCategoryFiltersChange} />
  </>;
}

function Warehouse({ notify }: { notify: (s: string) => void }) {
  const [retry, setRetry] = useState(0);
  const [warehouseType, setWarehouseType] = useState('DSV 3PL via API');
  return <>
    <Heading kicker="Order & lager" title="Lager & synk" description="Övervaka lagerkopplingar och försök om misslyckade order." actions={<Button kind="primary" onClick={() => notify('Lageranslutning skapad lokalt.')} testId="button-add-warehouse">＋ Lägg till lager</Button>} />
    <div className="admin-grid two">
      <Panel title="Anslutna lager" subtitle="Källa för lagerstatus och orderrouting">
        <Table headers={['Lager', 'Typ', 'Status', 'Senaste synk', 'Nästa försök', 'Fel och åtgärd']} testId="table-warehouses">
          <tr><td><strong>DSV Jönköping</strong><span className="subtext">Standardlager</span></td><td>3PL via API</td><td><Status testId="status-warehouse-dsv">Synkad</Status></td><td>20 nov · 10:32</td><td>20 nov · 11:02</td><td><span className="subtext">Inga fel · orderfeed svarade 200</span><Button small onClick={() => { setRetry(retry + 1); notify(`DSV-synk försök ${retry + 1} kördes lokalt.`); }} testId="button-retry-sync-dsv">Försök igen</Button></td></tr>
          <tr><td><strong>Eget lager</strong><span className="subtext">Stockholm</span></td><td>Eget lager</td><td><Status testId="status-warehouse-own">Fel</Status></td><td>20 nov · 08:14</td><td>20 nov · 10:55</td><td><span className="admin-sync-error-detail">2 fel: lagersaldo saknar platskod för SKU SHA-600; order SF-261120-0817 väntar på reservation.</span><Button small onClick={() => { setRetry(retry + 1); notify(`Eget lager: felkö markerad för nytt försök ${retry + 1}. Nästa försök 10:55.`); }} testId="button-retry-sync-own">Försök igen</Button></td></tr>
        </Table>
        <div className="admin-panel-body"><Button small onClick={() => notify('2 misslyckade orderrader markerade för lokalt nytt försök.')} testId="button-retry-failed-orders">Försök om misslyckade ordrar</Button></div>
      </Panel>
      <div className="admin-grid">
        <Panel title="Lägg till lager"><div className="admin-form-grid"><div className="admin-field span-2"><label htmlFor="warehouse-type">Lagertyp</label><select id="warehouse-type" className="admin-control" value={warehouseType} onChange={(e) => setWarehouseType(e.target.value)} data-testid="select-warehouse-type"><option>DSV 3PL via API</option><option>Eget lager</option></select></div><Field label="Visningsnamn" placeholder="Ex. DSV Jönköping" testId="input-warehouse-name" /><Field label="Lager-ID / anteckning" placeholder="Lokal referens" testId="input-warehouse-ref" /><label className="admin-toggle-row span-2"><input type="checkbox" defaultChecked data-testid="check-default-warehouse" /> Använd som standardlager</label><Button kind="primary" onClick={() => notify(`${warehouseType} registrerat som lokal prototypanslutning.`)} testId="button-save-warehouse">Lägg till</Button></div></Panel>
        <div className="admin-notice info"><div><strong>Synkstatus är simulerad</strong>Ingen extern lageranslutning eller orderöverföring görs i den här prototypen.</div></div>
      </div>
    </div>
  </>;
}

function OwnWarehouse({ notify }: { notify: (s: string) => void }) {
  const [tracking, setTracking] = useState('');
  return <><Heading kicker="Order & lager" title="Eget lager" description="Plock, pack och inleveranser för det egna lagret." actions={<Button onClick={() => window.print()} testId="button-print-packing-slip">Skriv ut packsedel</Button>} /><div className="admin-grid dashboard"><div className="admin-grid"><Panel title="Plocklista" subtitle="4 orderrader · prioriterad efter ordertid" action={<Button small onClick={() => notify('Plocklista öppnades i utskriftsvänlig vy.')} testId="button-print-pick-list">Skriv ut</Button>}><Table headers={['Order', 'Artikel', 'Plats', 'Antal', 'Plockad']} testId="table-pick-list"><tr><td>SF-261120-0842</td><td>PWO+ Blåbär 12-pack</td><td>A-03-02</td><td>1</td><td><input type="checkbox" aria-label="Markera PWO Blåbär plockad" data-testid="check-picked-0842" /></td></tr><tr><td>SF-261120-0817</td><td>D-vitamin 50 µg</td><td>B-01-04</td><td>2</td><td><input type="checkbox" aria-label="Markera D-vitamin plockad" data-testid="check-picked-0817" /></td></tr><tr><td>SF-261120-0809</td><td>Träningsband set</td><td>C-02-01</td><td>1</td><td><input type="checkbox" aria-label="Markera träningsband plockat" data-testid="check-picked-0809" /></td></tr></Table></Panel><Panel title="Inleverans" subtitle="Registrera batch och bäst före"><div className="admin-form-grid three"><Field label="Produkt / SKU" placeholder="SKU eller produkt" testId="input-inbound-sku" /><Field label="Antal" type="number" placeholder="0" testId="input-inbound-quantity" /><Field label="Batchnummer" placeholder="Batch" testId="input-inbound-batch" /><Field label="Bäst före" type="date" testId="input-inbound-expiry" /><Button kind="primary" onClick={() => notify('Inleverans registrerad i lokal lagerlista.')} testId="button-register-inbound">Registrera inleverans</Button></div></Panel></div><div className="admin-grid"><Panel title="Markera som skickad" subtitle="Order SF-261120-0842"><Field label="Transportör" value="PostNord" testId="input-carrier" /><div className="admin-field-gap" /><Field label="Spårningsnummer" value={tracking} onChange={setTracking} placeholder="Ange kolli-ID" testId="input-tracking-number" /><div className="admin-actions admin-panel-actions"><Button kind="primary" onClick={() => notify(tracking ? `Order markerad skickad med spårning ${tracking}.` : 'Ange ett spårningsnummer först.')} testId="button-confirm-shipped">Bekräfta skickad</Button></div></Panel><Panel title="Packsedel" subtitle="Förhandsgranskning"><div className="admin-metric-line"><span>Order</span><strong>SF-261120-0842</strong></div><div className="admin-metric-line"><span>Kund</span><strong>Elin Andersson</strong></div><div className="admin-metric-line"><span>Rader</span><strong>2 produkter</strong></div><div className="admin-metric-line"><span>Leveranssätt</span><strong>PostNord ombud</strong></div></Panel></div></div></>;
}

function Returns({ notify, id, go }: { notify: (s: string) => void; id?: string; go: (path: string) => void }) {
  const [search, setSearch] = useAdminListState('returer', 'search', '');
  const selected = id;
  const [statusFilter, setStatusFilter] = useAdminListState('returer', 'status', 'Alla statusar');
  const cases = [{ id: 'RET-2611-018', order: 'SF-261119-0762', customer: 'Amanda Karlsson', reason: 'Fel smak vald', status: 'Granskas', items: 'PWO+ Jordgubb 6-pack' }, { id: 'RET-2611-014', order: 'SF-261118-0711', customer: 'Johan Persson', reason: 'Skadad förpackning', status: 'Godkänd', items: 'Omega-3 Fiskolja' }, { id: 'RET-2611-009', order: 'SF-261116-0620', customer: 'Lina Berg', reason: 'Ångrat köp', status: 'Återbetald', items: 'Protein pannkakor' }];
  const active = cases.find((item) => item.id === selected) ?? cases[0];
  const filteredCases = cases.filter((item) => `${item.id} ${item.order} ${item.customer}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'Alla statusar' || item.status === statusFilter));
  return <>
    <Heading kicker="Order & lager" title="Returer" description="Inspektera returärenden, välj disposition och hantera återbetalning." />
    {!id && <div className="admin-toolbar"><div className="admin-search"><label className="admin-search-label" htmlFor="return-search">Sök returer</label><input id="return-search" className="admin-control" placeholder="Retur, order eller kund" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-returns" /></div><label className="admin-filter-label">Status<select className="admin-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} data-testid="filter-return-status"><option>Alla statusar</option><option>Granskas</option><option>Godkänd</option><option>Återbetald</option></select></label></div>}
    <div className="admin-grid">
      {!id && <Panel title="Returärenden" subtitle="Senaste ärenden"><Table headers={['Retur', 'Order', 'Kund', 'Orsak', 'Status']} testId="table-returns">{filteredCases.map((item) => <tr data-row-href={`/admin/returer/${item.id}`} key={item.id}><td><button className="admin-btn quiet small" onClick={() => go(`/admin/returer/${item.id}`)} aria-label={`Visa returärende ${item.id}`} data-testid={`button-select-return-${item.id}`}>{item.id}</button></td><td>{item.order}</td><td>{item.customer}</td><td>{item.reason}</td><td><Status testId={`status-return-${item.id}`}>{item.status}</Status></td></tr>)}{filteredCases.length === 0 && <tr><td colSpan={5}><div className="admin-empty" data-testid="empty-returns">Inga returer matchar filtren.</div></td></tr>}</Table></Panel>}
      {id && <Panel title={`Ärende ${active.id}`} subtitle={active.order}><div className="admin-metric-line"><span>Kund</span><strong>{active.customer}</strong></div><div className="admin-metric-line"><span>Returorsak</span><strong>{active.reason}</strong></div><div className="admin-metric-line"><span>Returvara</span><strong>{active.items}</strong></div><div className="admin-field admin-field-gap-top"><label htmlFor="return-disposition">Inspektionsbeslut</label><select id="return-disposition" className="admin-control" data-testid="select-return-disposition"><option>Välj disposition</option><option>Tillbaka till säljbart lager</option><option>Kassera</option></select></div><div className="admin-actions admin-panel-actions"><Button onClick={() => notify('Returen godkänd och markerad för återinläggning i lagret.')} testId="button-approve-return">Godkänn retur</Button><Button kind="primary" onClick={() => notify('Återbetalning godkänd lokalt. Ingen betalning har skickats.')} testId="button-approve-return-refund">Godkänn återbetalning</Button></div></Panel>}
    </div>
  </>;
}

function Discounts({ notify }: { notify: (s: string) => void }) {
  const [show, setShow] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Alla statusar');
  const [typeFilter, setTypeFilter] = useState('Alla typer');
  const [createType, setCreateType] = useState('Kod');
  const [discounts, setDiscounts] = useState([{ code: 'VÄLKOMMEN10', type: 'Kod', value: '10 %', validity: '1–30 nov', uses: '82 / 250', status: 'Aktiv' }, { code: '3 FÖR 2 · BARS', type: 'Kvantitet', value: '3 för 2', validity: 'Löpande', uses: '—', status: 'Aktiv' }, { code: 'NOVEMBER15', type: 'Kod', value: '15 %', validity: '1–15 nov', uses: '149 / 150', status: 'Avslutad' }]);
  const filtered = discounts.filter((discount) => (statusFilter === 'Alla statusar' || discount.status === statusFilter) && (typeFilter === 'Alla typer' || discount.type === typeFilter));
  return <>
    <Heading kicker="Butik / kampanj" title="Rabatter" description="Rabattkoder, automatiska erbjudanden och mängdrabatter." actions={<Button kind="primary" onClick={() => setShow(!show)} testId="button-create-discount">＋ Skapa rabatt</Button>} />
    {show && <div className="admin-panel admin-discount-form"><div className="admin-panel-head"><div><h2>Ny rabatt</h2><p>Alla ändringar stannar i denna prototyp.</p></div><Button small onClick={() => setShow(false)} testId="button-close-discount-form">Stäng</Button></div><div className="admin-panel-body"><div className="admin-notice info" role="note" data-testid="warning-discount-30-day-price"><div><strong>Visa 30-dagars lägsta pris</strong>Vid en rabatt ska kunden också se produktens lägsta pris under de senaste 30 dagarna.</div></div><div className="admin-form-grid three"><Field label="Namn / kod" placeholder="Ex. TRÄNA10" testId="input-discount-code" /><div className="admin-field"><label htmlFor="discount-kind">Rabattform</label><select id="discount-kind" className="admin-control" value={createType} onChange={(e) => setCreateType(e.target.value)} data-testid="select-discount-type"><option>Kod</option><option>Automatisk</option><option>Kvantitet</option></select></div><div className="admin-field"><label htmlFor="discount-value-kind">Värde</label><select id="discount-value-kind" className="admin-control" data-testid="select-discount-value"><option>Procent</option><option>Fast belopp (kr)</option></select></div><Field label="Rabattvärde" placeholder="10" testId="input-discount-value" /><Field label="Gäller från" type="date" testId="input-discount-from" /><Field label="Gäller till" type="date" testId="input-discount-to" /><Field label="Minsta ordervärde (kr)" type="number" placeholder="0" testId="input-discount-minimum" /><Field label="Max antal användningar" type="number" placeholder="Obegränsat" testId="input-discount-max-uses" /><Field label="Produkter / kategorier" placeholder="Välj produkter eller kategorier" testId="input-discount-applicable" /><label className="admin-toggle-row"><input type="checkbox" data-testid="check-discount-combinable" /> Kan kombineras med andra rabatter</label><Button kind="primary" onClick={() => { setDiscounts([{ code: createType === 'Kod' ? 'NY-RABATT' : createType === 'Automatisk' ? 'AUTOMATISK RABATT' : 'MÄNGDRABATT', type: createType, value: '10 %', validity: 'Utkast', uses: '0 / 100', status: 'Utkast' }, ...discounts]); setShow(false); notify('Rabatt skapad som lokalt utkast.'); }} testId="button-save-discount">Spara rabatt</Button></div></div></div>}
    <div className="admin-toolbar">
      <label className="admin-filter-label">Status<select className="admin-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} data-testid="filter-discount-status"><option>Alla statusar</option><option>Aktiv</option><option>Avslutad</option><option>Utkast</option></select></label>
      <label className="admin-filter-label">Typ<select className="admin-control" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} data-testid="filter-discount-type"><option>Alla typer</option><option>Kod</option><option>Automatisk</option><option>Kvantitet</option></select></label>
      <span className="admin-status info" data-testid="text-discount-count">{filtered.length} rabatter</span>
    </div>
    <div className="admin-panel"><Table headers={['Rabatt', 'Typ', 'Värde', 'Giltighet', 'Användningar', 'Status', '']} testId="table-discounts">{filtered.map((d) => <tr key={d.code}><td><strong>{d.code}</strong></td><td>{d.type}</td><td>{d.value}</td><td>{d.validity}</td><td>{d.uses}</td><td><Status testId={`status-discount-${d.code}`}>{d.status}</Status></td><td><Button small onClick={() => notify(`${d.code} öppnad för redigering.`)} testId={`button-edit-discount-${d.code}`}>Redigera</Button></td></tr>)}{filtered.length === 0 && <tr><td colSpan={7}><div className="admin-empty" data-testid="empty-discounts">Inga rabatter för de valda filtren.</div></td></tr>}</Table></div>
  </>;
}

function Settings({ notify, section, go }: { notify: (s: string) => void; section?: string; go: (path: string) => void }) {
  const tab = ({ frakt: 'Frakt', 'moms-pant': 'Moms & pant', roller: 'Behörigheter' } as Record<string, string>)[section ?? 'frakt'] ?? 'Frakt';
  const setTab = (value: string) => go(`/admin/installningar/${({ Frakt: 'frakt', 'Moms & pant': 'moms-pant', Behörigheter: 'roller' } as Record<string, string>)[value]}`);
  const tabs = ['Frakt', 'Moms & pant', 'Behörigheter'];
  return <><Heading kicker="Administration" title="Inställningar" description="Operativa regler, åtkomst och spårbarhet." /><div className="admin-panel"><div className="admin-panel-body"><div className="admin-tabs" role="group" aria-label="Inställningsavsnitt">{tabs.map((t) => <button className="admin-tab" type="button" key={t} aria-pressed={tab === t} onClick={() => setTab(t)} data-testid={`tab-settings-${t.toLowerCase().replaceAll(' ', '-')}`}>{t}</button>)}</div>
    {tab === 'Frakt' && <div className="admin-grid two"><Panel title="Fraktmetoder" subtitle="Priser i SEK"><Table headers={['Metod', 'Pris', 'Leveranstid', 'Status', '']} testId="table-shipping-methods"><tr><td>PostNord ombud</td><td>39 kr</td><td>1–3 vardagar</td><td><Status testId="status-shipping-postnord">Aktiv</Status></td><td><Button small onClick={() => notify('PostNord öppnad för redigering.')} testId="button-edit-shipping-postnord">Redigera</Button></td></tr><tr><td>Hemleverans</td><td>69 kr</td><td>1–3 vardagar</td><td><Status testId="status-shipping-home">Aktiv</Status></td><td><Button small onClick={() => notify('Hemleverans öppnad för redigering.')} testId="button-edit-shipping-home">Redigera</Button></td></tr></Table><div className="admin-panel-body"><Button small onClick={() => notify('Ny fraktmetod öppnad.')} testId="button-add-shipping">＋ Lägg till fraktmetod</Button></div></Panel><Panel title="Fri frakt" subtitle="Tröskel för varukorg"><Field label="Fri frakt från (kr)" value="599" testId="input-free-shipping-threshold" /><div className="admin-actions admin-panel-actions"><Button kind="primary" onClick={() => notify('Fraktregler sparades lokalt.')} testId="button-save-shipping-settings">Spara fraktregler</Button></div></Panel></div>}
    {tab === 'Moms & pant' && <TaxSettingsView />}
    {tab === 'Behörigheter' && <Panel title="Roller och behörigheter" subtitle="Exempelanvändare"><Table headers={['Namn', 'E-post', 'Katalog', 'Support', 'Ekonomi', 'Administration', 'Roll']} testId="table-roles"><tr><td>Ella Svensson</td><td>ella@selfit.se</td>{['check-ella-catalog', 'check-ella-support', 'check-ella-finance', 'check-ella-admin'].map((id, i) => <td key={id}><input type="checkbox" defaultChecked={i < 2} aria-label={`Behörighet ${['katalog', 'support', 'ekonomi', 'administration'][i]} för Ella Svensson`} data-testid={id} /></td>)}<td>Support</td></tr><tr><td>Martin Holm</td><td>martin@selfit.se</td>{['check-martin-catalog', 'check-martin-support', 'check-martin-finance', 'check-martin-admin'].map((id, i) => <td key={id}><input type="checkbox" defaultChecked={i !== 1} aria-label={`Behörighet ${['katalog', 'support', 'ekonomi', 'administration'][i]} för Martin Holm`} data-testid={id} /></td>)}<td>Administratör</td></tr></Table><div className="admin-panel-body"><Button small onClick={() => notify('Rollinställningar sparades lokalt.')} testId="button-save-roles">Spara behörigheter</Button><Button small onClick={() => notify('Dialog för ny medarbetare öppnades.')} testId="button-add-role-user">＋ Lägg till medarbetare</Button></div></Panel>}
  </div></div></>;
}

function AdminWorkspace() {
  const { state: operations, commit } = useOperations();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [notice, setNotice] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [productTypes, setProductTypes] = useState(defaultProductTypes);
  const [categoryFilters, setCategoryFilters] = useState(defaultCategoryFilters);
  const [mediaItems, setMediaItems] = useState(defaultMediaItems);
  const [redirectRows, setRedirectRows] = useState(defaultRedirectRows);
  const [detailTitles, setDetailTitles] = useState<Record<string, string>>({});
  const go = (path: string) => {
    const legacy: Record<string, string> = { '/admin/manuella-order': '/admin/order/ny', '/admin/inkopsordrar': '/admin/inkop', '/admin/inleveranser': '/admin/inkop?flik=inleveranser', '/admin/eget-lager': '/admin/plock-pack' };
    path = legacy[path] ?? path;
    const sameDetailGroup = location.endsWith('/ny') && location.slice(0, location.lastIndexOf('/')) === path.slice(0, path.split('?')[0].lastIndexOf('/'));
    const adminFrom = sameDetailGroup ? window.history.state?.adminFrom ?? location.slice(0, location.lastIndexOf('/')) : location + (search ? `?${search}` : '');
    setLocation(path, { replace: sameDetailGroup, state: { adminFrom } }); setMobileOpen(false); setNotice(''); window.scrollTo(0, 0);
  };
  const notify = (message: string) => setNotice(message);
  useEffect(() => {
    const action = (event: Event) => setNotice(`${(event as CustomEvent<{ label: string }>).detail.label}: klart i den lokala prototypen.`);
    window.addEventListener('selfit-admin-action', action);
    return () => window.removeEventListener('selfit-admin-action', action);
  }, []);
  const addRedirect = (oldUrl: string, newUrl: string) => {
    setRedirectRows((current) => {
      const existing = current.find((row) => row.oldUrl === oldUrl);
      if (existing) return current.map((row) => row.id === existing.id ? { ...row, newUrl } : row);
      const suggested: RedirectRow = {
        id: `redirect-${oldUrl.replace(/[^a-z0-9]+/gi, '-')}`,
        oldUrl,
        newUrl,
        type: 'Permanent (301)',
        createdAt: '2026-11-20',
      };
      return [suggested, ...current];
    });
  };
  const route = location.replace(/\/$/, '') || '/admin';
  if (route === '/admin/logga-in') return <Login onSubmit={() => undefined} />;
  const searchTerm = globalSearch.trim().toLocaleLowerCase('sv-SE');
  const matchingProducts = searchTerm
    ? productRows.filter((product) => `${product.name} ${product.brand} ${product.slug}`.toLocaleLowerCase('sv-SE').includes(searchTerm)).slice(0, 4)
    : [];
  const matchingOrders = searchTerm
    ? operations.orders.filter((order) => `${order.id} ${order.email} ${order.sku} ${order.tracking}`.toLocaleLowerCase('sv-SE').includes(searchTerm)).slice(0, 4)
    : [];
  const openSearchResult = (path: string) => {
    setGlobalSearch('');
    go(path);
  };
  const submitGlobalSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstProduct = matchingProducts[0];
    const firstOrder = matchingOrders[0];
    if (firstProduct) openSearchResult(`/admin/produkter/${firstProduct.slug}`);
    else if (firstOrder) openSearchResult(`/admin/order/${firstOrder.id}`);
  };
  const title = navGroups.flatMap((g) => g.links).find((link) => link.path === route || (link.path !== '/admin' && route.startsWith(`${link.path}/`)))?.label ?? 'Detaljer';
  const isActive = (path: string) => route === path || (path !== '/admin' && route.startsWith(`${path}/`));
  const detailOrder = route.match(/^\/admin\/order\/(.+)$/);
  const detailCustomer = route.match(/^\/admin\/kunder\/([^/]+)$/);
  const detailProduct = route.match(/^\/admin\/produkter\/(.+)$/);
  const detailMedia = route.match(/^\/admin\/media\/([^/]+)$/);
  const detailDiscount = route.match(/^\/admin\/rabatter\/([^/]+)$/);
  const detailEmail = route.match(/^\/admin\/mejlmallar\/([^/]+)$/);
  const detailType = route.match(/^\/admin\/produkttyper\/([^/]+)$/);
  const detailRedirect = route.match(/^\/admin\/omdirigeringar\/([^/]+)$/);
  const detailReturn = route.match(/^\/admin\/returer\/([^/]+)$/);
  const detailStock = route.match(/^\/admin\/saldo\/([^/]+)$/);
  const detailPurchase = route.match(/^\/admin\/inkop\/([^/]+)$/);
  const detailBatch = route.match(/^\/admin\/partier\/([^/]+)$/);
  const detailTransfer = route.match(/^\/admin\/flyttar\/([^/]+)$/);
  const detailCount = route.match(/^\/admin\/inventering\/([^/]+)$/);
  const settingsSection = route.match(/^\/admin\/installningar\/([^/]+)$/);
  const genericDetail = route.match(/^\/admin\/detalj\/(.+)$/);
  const detailParent = genericDetail ? readRowDetail(decodeURIComponent(genericDetail[1]))?.from ?? '/admin'
    : navGroups.some((group) => group.links.some((link) => link.path === route)) ? '' : route.split('/').length > 3 ? route.slice(0, route.lastIndexOf('/')) : '';
  const from = (window.history.state?.adminFrom as string | undefined);
  const backPath = from && from !== route && from.startsWith('/admin') ? from : detailParent;
  const back = () => { if (from && from !== route && from.startsWith('/admin')) window.history.back(); else go(backPath || '/admin'); };
  const parentLabel = navGroups.flatMap((group) => group.links).find((link) => link.path === (backPath || '').split('?')[0])?.label ?? 'Till listan';
  let page: ReactNode;
  if (genericDetail) page = <RowDetailView key={genericDetail[1]} id={decodeURIComponent(genericDetail[1])} notify={notify} />;
  else if (route === '/admin' || route === '/admin/') page = <Dashboard go={go} notice={notice} setNotice={notify} />;
  else if (route === '/admin/produkter') page = <ProductsListView go={go} />;
  else if (route === '/admin/produkter/ny') page = <ProductFormView key="ny" go={go} onTitleChange={(value) => setDetailTitles((titles) => titles[route] === value ? titles : { ...titles, [route]: value })} />;
  else if (detailProduct) page = <ProductFormView key={detailProduct[1]} id={decodeURIComponent(detailProduct[1])} go={go} onTitleChange={(value) => setDetailTitles((titles) => titles[route] === value ? titles : { ...titles, [route]: value })} />;
  else if (route === '/admin/kunder') page = <CustomersView go={go} />;
  else if (detailCustomer) page = <CustomerDetailView customerId={detailCustomer[1]} go={go} notify={notify} />;
  else if (route === '/admin/manuella-order' || route === '/admin/order/ny') page = <ManualOrderForm go={go} notify={notify} />;
  else if (route === '/admin/inkop' || detailPurchase || route === '/admin/inkopsordrar') page = <PurchasingView key={detailPurchase?.[1] ?? search} id={detailPurchase?.[1]} tab={new URLSearchParams(search).get('flik') ?? undefined} notify={notify} go={go} />;
  else if (route === '/admin/rapporter') page = <ReportsView />;
  else if (route === '/admin/kategorier') page = <CategoriesAdminView go={go} />;
  else if (route === '/admin/produkttyper' || detailType) page = <ProductTypesAdminView go={go} />;
  else if (route === '/admin/media' || detailMedia) page = <MediaLibraryPage />;
  else if (route === '/admin/order') page = <OperationalOrders key={search} go={go} notify={notify} />;
  else if (detailOrder) page = <OperationalOrderDetail key={detailOrder[1]} id={detailOrder[1]} go={go} notify={notify} />;
  else if (route === '/admin/lager') page = <Warehouse notify={notify} />;
  else if (route === '/admin/saldo' || detailStock) page = <StockView key={detailStock?.[1] ?? 'list'} id={detailStock?.[1]} go={go} notify={notify} />;
  else if (route === '/admin/partier' || detailBatch) page = <BatchView key={detailBatch?.[1] ?? search} id={detailBatch?.[1]} go={go} notify={notify} />;
  else if (route === '/admin/flyttar' || detailTransfer) page = <TransfersView key={detailTransfer?.[1] ?? 'list'} id={detailTransfer?.[1]} go={go} notify={notify} />;
  else if (route === '/admin/inventering' || detailCount) page = <CountsView key={detailCount?.[1] ?? 'list'} id={detailCount?.[1]} go={go} notify={notify} />;
  else if (route === '/admin/inleveranser') page = <PurchasingView tab="inleveranser" go={go} notify={notify} />;
  else if (route === '/admin/eget-lager' || route === '/admin/plock-pack') page = <PickPackView go={go} notify={notify} />;
  else if (route === '/admin/returer' || detailReturn) page = <OperationalReturns key={detailReturn?.[1] ?? 'list'} id={detailReturn?.[1]} go={go} notify={notify} />;
  else if (route === '/admin/rabatter' || detailDiscount) page = <DiscountsView id={detailDiscount?.[1]} go={go} notify={notify} onTitleChange={(value) => setDetailTitles((titles) => titles[route] === value ? titles : { ...titles, [route]: value })} />;
  else if (route === '/admin/mejlmallar' || detailEmail) page = <EmailTemplatesView id={detailEmail?.[1]} go={go} />;
  else if (route === '/admin/omdirigeringar' || detailRedirect) page = <RedirectsView id={detailRedirect?.[1]} go={go} rows={redirectRows} onRowsChange={setRedirectRows} />;
  else if (route === '/admin/andringslogg' || route === '/admin/installningar/logg') page = <AuditLogView />;
  else if (route === '/admin/installningar/foretag') page = <CompanySettingsView />;
  else if (route === '/admin/installningar/villkor') page = <PoliciesSettingsView />;
  else if (route === '/admin/kampanjer') page = <ComingSoonView group="Marknadsföring" title="Kampanjer" items={['Sätta kampanjpris på produkter, kategorier eller varumärken', 'Start- och slutdatum som slår på och av automatiskt', 'Lägsta pris senaste 30 dagarna räknas ut och visas automatiskt']} />;
  else if (route === '/admin/varumarken') page = <BrandsView />;
  else if (route === '/admin/innehall/sidor') page = <PagesListView go={go} />;
  else if (route.startsWith('/admin/innehall/sidor/')) page = <PageEditorView key={route} slug={route.split('/').pop() ?? ''} go={go} onTitleChange={(value) => setDetailTitles((titles) => titles[route] === value ? titles : { ...titles, [route]: value })} />;
  else if (route === '/admin/innehall/fragor') page = <FaqAdminView />;
  else if (route === '/admin/innehall/startsida') page = <HomepageAdminView />;
  else if (route === '/admin/innehall/topprad') page = <NavigationAdminView />;
  else if (route === '/admin/installningar' || settingsSection) page = <Settings section={settingsSection?.[1]} notify={notify} go={go} />;
  else page = <Dashboard go={go} notice={notice} setNotice={notify} />;
  const detailLabel = ({ '/admin/order/ny': 'Ny manuell order', '/admin/inkop/ny': 'Ny inköpsorder', '/admin/flyttar/ny': 'Ny lagerflytt', '/admin/inventering/ny': 'Starta inventering' } as Record<string, string>)[route] ?? detailTitles[route]
    ?? (detailStock ? operations.variants.find((v) => v.sku === decodeURIComponent(detailStock[1]))?.sku ?? 'Variant'
      : detailMedia ? mediaItems.find((item) => item.id === detailMedia[1])?.name ?? 'Bild'
      : detailProduct ? productRows.find((item) => item.slug === detailProduct[1])?.name ?? 'Produkt'
        : detailType ? productTypes.find((item) => item.id === detailType[1])?.name ?? 'Produkttyp'
          : detailEmail ? ({ order: 'Orderbekräftelse', shipped: 'Skickad', delivered: 'Levererad', return: 'Retur / återbetalning', cancelled: 'Avbruten' } as Record<string, string>)[detailEmail[1]] ?? 'Mejlmall'
            : detailRedirect ? redirectRows.find((item) => item.id === detailRedirect[1])?.oldUrl ?? 'Ny omdirigering'
              : detailCustomer ? detailCustomer[1].split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
                : genericDetail ? readRowDetail(decodeURIComponent(genericDetail[1]))?.title ?? 'Detaljer'
                  : decodeURIComponent(route.split('/').at(-1) ?? 'Detaljer'));
  return <AdminNavigationContext.Provider value={go}><div className="admin-root"><div className="admin-shell">
    <aside className="admin-sidebar"><div className="admin-brand"><span className="admin-brand-mark">S</span><div><strong>SELFIT</strong><small>Administration</small></div></div><nav aria-label="Administrationsmeny">{navGroups.map((group) => <div className="admin-nav-group" key={group.label}><span className="admin-nav-label">{group.label}</span>{group.links.map((link) => <button className="admin-nav-link" key={link.path} aria-current={isActive(link.path) ? 'page' : undefined} onClick={() => go(link.path)} data-testid={`nav-${link.path.split('/').filter(Boolean).join('-')}`}><span className="admin-nav-icon" aria-hidden="true">{link.icon}</span>{link.label}</button>)}</div>)}</nav><div className="admin-side-foot"><strong>Demo · Lokal prototyp</strong>Endast lokal exempeldata. Inga data skickas till lagret eller butiken.</div></aside>
    {mobileOpen && <div id="admin-mobile-navigation" className="admin-sidebar admin-mobile-sidebar"><nav aria-label="Mobilmeny">{navGroups.map((group) => <div className="admin-nav-group" key={group.label}><span className="admin-nav-label">{group.label}</span>{group.links.map((link) => <button className="admin-nav-link" key={link.path} aria-current={isActive(link.path) ? 'page' : undefined} onClick={() => go(link.path)} data-testid={`mobile-nav-${link.path.split('/').filter(Boolean).join('-')}`}><span className="admin-nav-icon" aria-hidden="true">{link.icon}</span>{link.label}</button>)}</div>)}</nav></div>}
    <div className="admin-workspace"><header className="admin-topbar">
      <div className="admin-topbar-left"><Button small className="admin-mobile-menu-button" onClick={() => setMobileOpen(!mobileOpen)} testId="button-mobile-menu" ariaLabel="Visa eller dölj meny" ariaExpanded={mobileOpen} ariaControls={mobileOpen ? 'admin-mobile-navigation' : undefined}>Meny</Button><span>SELFIT · administration</span><span aria-hidden="true">/</span><strong>{title}</strong></div>
      <form className="admin-top-search" role="search" onSubmit={submitGlobalSearch}>
        <label className="admin-visually-hidden" htmlFor="admin-global-search">Sök produkter och ordrar</label>
        <input id="admin-global-search" className="admin-control" type="search" value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setGlobalSearch(''); }} placeholder="Sök produkter eller ordrar" autoComplete="off" aria-controls={searchTerm ? 'admin-search-results' : undefined} aria-expanded={Boolean(searchTerm)} data-testid="input-admin-global-search" />
        {searchTerm && <div id="admin-search-results" className="admin-search-results" role="region" aria-label="Sökresultat">
          {matchingProducts.map((product) => <button key={product.slug} type="button" onClick={() => openSearchResult(`/admin/produkter/${product.slug}`)} data-testid={`admin-search-product-${product.slug}`}><strong>{product.name}</strong><span>Produkt · {product.brand}</span></button>)}
          {matchingOrders.map((order) => <button key={order.id} type="button" onClick={() => openSearchResult(`/admin/order/${order.id}`)} data-testid={`admin-search-order-${order.id}`}><strong>{order.id}</strong><span>Order · {order.email}</span></button>)}
          {matchingProducts.length === 0 && matchingOrders.length === 0 && <p role="status">Inga produkter eller ordrar matchar sökningen.</p>}
        </div>}
      </form>
      <div className="admin-topbar-right"><label className="ops-role">Visningsroll (demo)<select className="admin-control" aria-label="Visningsroll (demo)" value={operations.role} onChange={(e) => commit((d) => { d.role = e.target.value; })}>{['Admin', 'Ekonomi', 'Katalog', 'Kundservice'].map((role) => <option key={role}>{role}</option>)}</select></label><span className="admin-user-chip" aria-label="Användare Ella Svensson" data-testid="text-admin-user">ES</span></div>
    </header><main className="admin-content">{detailParent && !route.startsWith('/admin/produkter/') && !route.startsWith('/admin/rabatter/') && <div className="admin-detail-navigation"><button type="button" className="admin-btn" onClick={back} data-testid="button-detail-back">← Tillbaka</button><nav aria-label="Brödsmulor"><a href={backPath} onClick={(event) => { event.preventDefault(); back(); }}>{parentLabel}</a><span aria-hidden="true"> / </span><span aria-current="page">{detailLabel}</span></nav></div>}{notice && <div className="admin-inline-message" role="status" data-testid="status-global-notice">{notice}</div>}{page}</main></div>
  </div></div></AdminNavigationContext.Provider>;
}

export function AdminApp() { return <OperationsProvider><AdminWorkspace /></OperationsProvider>; }
export default AdminApp;
