import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearch } from 'wouter';
import { categories, subcategoriesOf } from '@/data/categories';
import { freeShippingPhrase, shipping } from '@/data/shipping';

/**
 * Admin → Marknadsföring → Rabatter. Upplägget följer Shopify:
 * välj typ av rabatt, fyll i korten till vänster, sammanfattningen till höger visar vad kunden får.
 */

const api = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api${path}`;
const fmt = (n: number) => new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(n);

export async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(api(path), {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Något gick fel.');
  return data as T;
}

type Kind = 'products' | 'order' | 'shipping';
type State = 'active' | 'scheduled' | 'expired' | 'disabled';
interface Customer {
  id: string;
  name: string | null;
  email: string;
  orders?: number;
}
interface Discount {
  id?: string;
  method: 'code' | 'automatic';
  code: string;
  title: string;
  kind: Kind;
  valueType: 'percent' | 'fixed';
  value: number;
  appliesTo: { type: 'all' | 'categories' | 'products'; categories: string[]; products: string[] };
  eligibility: { type: 'all' | 'new' | 'returning' | 'specific'; customerIds: string[] };
  customers: Customer[];
  minType: 'none' | 'amount' | 'quantity';
  minValue: number;
  usageLimit: number | null;
  oncePerCustomer: boolean;
  startsAt: string;
  endsAt: string | null;
  enabled: boolean;
  combineWithCampaigns: boolean;
  used?: number;
  state?: State;
  label?: string;
}

const KINDS: Record<Kind, { title: string; text: string; icon: string }> = {
  products: { title: 'Rabatt på produkter', text: 'Procent eller kronor på vissa produkter eller kategorier.', icon: '🏷️' },
  order: { title: 'Rabatt på ordern', text: 'Procent eller kronor på hela köpet.', icon: '🧾' },
  shipping: { title: 'Fri frakt', text: 'Kunden slipper betala frakt.', icon: '📦' },
};
const STATE: Record<State, string> = { active: 'Aktiv', scheduled: 'Schemalagd', expired: 'Avslutad', disabled: 'Avstängd' };
const WHO: Record<Discount['eligibility']['type'], string> = {
  all: 'Alla kunder',
  new: 'Nya kunder (har inte handlat förut)',
  returning: 'Återkommande kunder (har handlat förut)',
  specific: 'Utvalda kunder',
};

/** Slumpar en kod utan tecken som är lätta att blanda ihop (0/O, 1/I/L). */
export function randomCode(length = 10) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

/** ISO ↔ värdet i ett datetime-local-fält (svensk tid i webbläsaren). */
const toLocal = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocal = (v: string) => new Date(v).toISOString();
const showDate = (iso: string) => new Date(iso).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' });

const emptyDiscount = (kind: Kind): Discount => ({
  method: 'code',
  code: '',
  title: '',
  kind,
  valueType: 'percent',
  value: 0,
  appliesTo: { type: 'all', categories: [], products: [] },
  eligibility: { type: 'all', customerIds: [] },
  customers: [],
  minType: 'none',
  minValue: 0,
  usageLimit: null,
  oncePerCustomer: false,
  startsAt: new Date().toISOString(),
  endsAt: null,
  enabled: true,
  combineWithCampaigns: false,
});

const valueText = (d: Pick<Discount, 'kind' | 'valueType' | 'value'>) =>
  d.kind === 'shipping' ? 'Fri frakt' : d.value > 0 ? (d.valueType === 'percent' ? `${fmt(d.value)} %` : `${fmt(d.value)} kr`) : '–';

/** Punktlistan i sammanfattningen, som hos Shopify. */
function details(d: Discount, productNames: Map<string, string>, catNames: Map<string, string>) {
  const out: string[] = [];
  if (d.kind === 'shipping') out.push('Fri frakt på hela ordern');
  else if (d.value > 0) {
    const v = valueText(d);
    if (d.kind === 'order') out.push(`${v} på hela ordern`);
    else if (d.appliesTo.type === 'all') out.push(`${v} på alla produkter`);
    else if (d.appliesTo.type === 'categories') out.push(`${v} på ${d.appliesTo.categories.map((c) => catNames.get(c) ?? c).join(', ') || 'valda kategorier'}`);
    else out.push(`${v} på ${d.appliesTo.products.map((p) => productNames.get(p) ?? p).join(', ') || 'valda produkter'}`);
  }
  out.push(d.eligibility.type === 'specific' ? `Bara för ${d.customers.map((c) => c.name || c.email).join(', ') || 'utvalda kunder'}` : WHO[d.eligibility.type]);
  out.push(d.minType === 'amount' && d.minValue ? `Köp för minst ${fmt(d.minValue)} kr` : d.minType === 'quantity' && d.minValue ? `Köp minst ${d.minValue} artiklar` : 'Inget krav på minsta köp');
  const limits = [d.usageLimit ? `Kan användas ${d.usageLimit} gånger totalt` : '', d.oncePerCustomer ? 'En gång per kund' : ''].filter(Boolean);
  out.push(limits.length ? limits.join(' · ') : 'Inga begränsningar för användning');
  out.push('Kan inte kombineras med andra rabatter');
  if (d.kind !== 'shipping') out.push(d.combineWithCampaigns ? 'Gäller även varor med kampanjpris' : 'Gäller inte varor med kampanjpris');
  const start = new Date(d.startsAt) <= new Date() ? 'Gäller från i dag' : `Gäller från ${showDate(d.startsAt)}`;
  out.push(d.endsAt ? `${start} till ${showDate(d.endsAt)}` : start);
  return out;
}

export function Card({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="pf-card">
      {(title || action) && (
        <header className="pf-card-head">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Radio({ name, checked, onChange, children, testId }: { name: string; checked: boolean; onChange: () => void; children: ReactNode; testId?: string }) {
  return (
    <label className="pf-radio">
      <input type="radio" name={name} checked={checked} onChange={onChange} data-testid={testId} />
      <span>{children}</span>
    </label>
  );
}

// ---------------------------------------------------------------- Lista

function TypeDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (k: Kind) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="pf-dialog"
      aria-labelledby="dtype-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header className="pf-dialog-head">
        <h2 id="dtype-title">Välj typ av rabatt</h2>
        <button type="button" className="pf-icon" onClick={onClose} aria-label="Stäng">
          ✕
        </button>
      </header>
      <div className="dc-types">
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <button key={k} type="button" className="dc-type" onClick={() => onPick(k)} data-testid={`button-discount-type-${k}`}>
            <span className="dc-type-icon" aria-hidden="true">
              {KINDS[k].icon}
            </span>
            <span>
              <strong>{KINDS[k].title}</strong>
              <span>{KINDS[k].text}</span>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </dialog>
  );
}

function DiscountList({ go }: { go: (path: string) => void }) {
  const [rows, setRows] = useState<Discount[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'all' | State>('all');
  const [q, setQ] = useState('');
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    call<Discount[]>('GET', '/admin/discounts')
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows?.length ?? 0 };
    for (const r of rows ?? []) c[r.state!] = (c[r.state!] ?? 0) + 1;
    return c;
  }, [rows]);
  const shown = (rows ?? []).filter((r) => (tab === 'all' || r.state === tab) && `${r.code} ${r.title}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="pf">
      <div className="pf-top">
        <h1>Rabatter</h1>
        <button type="button" className="pf-btn primary pf-top-action" onClick={() => setPicking(true)} data-testid="button-create-discount">
          Skapa rabatt
        </button>
      </div>
      {error && (
        <p className="pf-error" role="alert">
          {error}
        </p>
      )}
      <section className="pf-card pf-flush">
        <div className="dc-toolbar">
          <div className="dc-tabs" role="tablist" aria-label="Filtrera rabatter">
            {(['all', 'active', 'scheduled', 'expired', 'disabled'] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)} data-testid={`tab-discounts-${t}`}>
                {t === 'all' ? 'Alla' : STATE[t]} <span>{counts[t] ?? 0}</span>
              </button>
            ))}
          </div>
          <input className="pf-input dc-search" type="search" placeholder="Sök kod eller titel" aria-label="Sök rabatter" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {rows === null ? (
          <p className="pf-empty">Laddar …</p>
        ) : rows.length === 0 ? (
          <div className="pf-empty dc-empty">
            <p>
              <strong>Inga rabatter än</strong>
            </p>
            <p>Skapa en rabattkod som kunden skriver i kassan, eller en automatisk rabatt som dras direkt i varukorgen.</p>
            <button type="button" className="pf-btn primary" onClick={() => setPicking(true)}>
              Skapa rabatt
            </button>
          </div>
        ) : (
          <table className="pf-table pf-list" data-testid="table-discounts">
            <thead>
              <tr>
                <th scope="col">Rabatt</th>
                <th scope="col">Status</th>
                <th scope="col">Metod</th>
                <th scope="col">Använd</th>
                <th scope="col">Gäller</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="dc-row" onClick={() => go(`/admin/rabatter/${r.id}`)}>
                  <th scope="row">
                    <a
                      href={`/admin/rabatter/${r.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        go(`/admin/rabatter/${r.id}`);
                      }}
                    >
                      <strong>{r.method === 'code' ? r.code : r.title}</strong>
                    </a>
                    <span className="pf-sub">
                      {r.label}
                      {r.eligibility.type !== 'all' ? ` · ${WHO[r.eligibility.type].split(' (')[0]}` : ''}
                    </span>
                  </th>
                  <td>
                    <span className={`pf-badge ${r.state === 'active' ? 'published' : r.state === 'expired' || r.state === 'disabled' ? 'archived' : ''}`}>{STATE[r.state!]}</span>
                  </td>
                  <td>{r.method === 'code' ? 'Kod' : 'Automatisk'}</td>
                  <td>
                    {r.used ?? 0}
                    {r.usageLimit ? ` / ${r.usageLimit}` : ''}
                  </td>
                  <td className="pf-sub">
                    {new Date(r.startsAt).toLocaleDateString('sv-SE')} – {r.endsAt ? new Date(r.endsAt).toLocaleDateString('sv-SE') : 'tills vidare'}
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="pf-empty">
                    Inga rabatter matchar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
      <TypeDialog open={picking} onClose={() => setPicking(false)} onPick={(k) => go(`/admin/rabatter/ny?typ=${k}`)} />
    </div>
  );
}

// ---------------------------------------------------------------- Formulär

function CustomerPicker({ selected, onChange }: { selected: Customer[]; onChange: (c: Customer[]) => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Customer[] | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      call<Customer[]>('GET', `/admin/discount-customers?q=${encodeURIComponent(q)}`)
        .then(setHits)
        .catch(() => setHits([]));
    }, 200);
    return () => window.clearTimeout(t);
  }, [q, open]);
  const ids = new Set(selected.map((c) => c.id));
  return (
    <div className="pf-field dc-picker">
      <label htmlFor="dc-customer-search">Kunder</label>
      <input
        id="dc-customer-search"
        className="pf-input"
        type="search"
        placeholder="Sök på namn eller e-post"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        data-testid="input-discount-customer-search"
      />
      {open && (
        <ul className="dc-menu" role="listbox" aria-label="Kunder">
          {hits === null ? (
            <li className="dc-menu-empty">Söker …</li>
          ) : hits.length === 0 ? (
            <li className="dc-menu-empty">{q ? 'Ingen kund matchar.' : 'Inga kunder än. Kunder skapas när någon handlar.'}</li>
          ) : (
            hits.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={ids.has(c.id)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onChange(ids.has(c.id) ? selected.filter((x) => x.id !== c.id) : [...selected, c])}
                  data-testid={`option-customer-${c.id}`}
                >
                  <span className="dc-check" aria-hidden="true">
                    {ids.has(c.id) ? '✓' : ''}
                  </span>
                  <span>
                    <strong>{c.name || c.email}</strong>
                    <span className="pf-sub">
                      {c.email} · {c.orders ?? 0} {c.orders === 1 ? 'order' : 'ordrar'}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {selected.length > 0 && (
        <div className="pf-chips dc-chips">
          {selected.map((c) => (
            <span key={c.id} className="pf-chip">
              {c.name || c.email}
              <button type="button" aria-label={`Ta bort ${c.name || c.email}`} onClick={() => onChange(selected.filter((x) => x.id !== c.id))}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChecklistPicker({ id, label, options, selected, onChange, placeholder }: { id: string; label: string; options: { value: string; label: string; group?: string }[]; selected: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [q, setQ] = useState('');
  const set = new Set(selected);
  const shown = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));
  let lastGroup = '';
  return (
    <div className="pf-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="pf-input" type="search" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="dc-checklist" role="group" aria-label={label}>
        {shown.map((o) => {
          const head = o.group && o.group !== lastGroup ? o.group : '';
          lastGroup = o.group ?? '';
          return (
            <div key={o.value}>
              {head && <p className="dc-group">{head}</p>}
              <label className="pf-toggle">
                <input type="checkbox" checked={set.has(o.value)} onChange={(e) => onChange(e.target.checked ? [...selected, o.value] : selected.filter((v) => v !== o.value))} /> {o.label}
              </label>
            </div>
          );
        })}
        {shown.length === 0 && <p className="pf-help">Inget matchar.</p>}
      </div>
      {selected.length > 0 && <p className="pf-help">{selected.length} valda</p>}
    </div>
  );
}

function DiscountForm({ id, go, onTitleChange }: { id: string; go: (path: string) => void; onTitleChange: (t: string) => void }) {
  const search = new URLSearchParams(useSearch());
  const isNew = id === 'ny';
  const startKind = (['products', 'order', 'shipping'] as const).find((k) => k === search.get('typ')) ?? 'order';
  const [d, setD] = useState<Discount | null>(isNew ? emptyDiscount(startKind) : null);
  const [base, setBase] = useState(isNew ? JSON.stringify(emptyDiscount(startKind)) : '');
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'saved' | 'error'; text?: string }>(() => {
    const flash = sessionStorage.getItem('admin-discount-flash');
    sessionStorage.removeItem('admin-discount-flash');
    return flash ? { kind: 'saved', text: flash } : { kind: 'idle' };
  });
  const [products, setProducts] = useState<{ slug: string; name: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasEnd, setHasEnd] = useState(false);

  useEffect(() => {
    call<{ slug: string; name: string; status: string }[]>('GET', '/admin/products')
      .then((list) => setProducts(list.filter((p) => p.status !== 'archived').map((p) => ({ slug: p.slug, name: p.name }))))
      .catch(() => undefined);
    if (isNew) return;
    call<Discount>('GET', `/admin/discounts/${id}`)
      .then((x) => {
        setD(x);
        setBase(JSON.stringify(x));
        setHasEnd(Boolean(x.endsAt));
      })
      .catch((e: Error) => setStatus({ kind: 'error', text: e.message }));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (d) onTitleChange(isNew ? 'Skapa rabatt' : d.method === 'code' ? d.code : d.title);
  }, [d?.code, d?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  const productNames = useMemo(() => new Map(products.map((p) => [p.slug, p.name])), [products]);
  const catOptions = useMemo(
    () => categories.flatMap((c) => [{ value: c.slug, label: `Allt i ${c.name}`, group: c.name }, ...subcategoriesOf(c.slug).map((s) => ({ value: s.slug, label: s.name, group: c.name }))]),
    [],
  );
  const catNames = useMemo(() => new Map(catOptions.map((o) => [o.value, o.label.replace(/^Allt i /, '')])), [catOptions]);

  if (!d) return <p>{status.text ?? 'Laddar …'}</p>;

  const dirty = JSON.stringify(d) !== base;
  const set = (patch: Partial<Discount>) => {
    setD({ ...d, ...patch });
    if (status.kind !== 'saving') setStatus({ kind: 'idle' });
    setConfirmDelete(false);
  };
  const used = d.used ?? 0;
  const codeLocked = !isNew && used > 0;

  const save = async () => {
    setStatus({ kind: 'saving' });
    try {
      const body = { ...d, endsAt: hasEnd ? d.endsAt : null, usageLimit: d.usageLimit || null };
      const saved = isNew ? await call<Discount>('POST', '/admin/discounts', body) : await call<Discount>('PUT', `/admin/discounts/${id}`, body);
      const text = saved.state === 'active' ? 'Sparat. Rabatten gäller nu i butiken.' : saved.state === 'scheduled' ? `Sparat. Rabatten börjar gälla ${showDate(saved.startsAt)}.` : 'Sparat. Rabatten gäller inte i butiken just nu.';
      if (isNew) {
        sessionStorage.setItem('admin-discount-flash', text);
        go(`/admin/rabatter/${saved.id}`);
        return;
      }
      setD(saved);
      setBase(JSON.stringify(saved));
      setStatus({ kind: 'saved', text });
    } catch (e) {
      setStatus({ kind: 'error', text: (e as Error).message });
    }
  };

  const remove = async () => {
    if (!confirmDelete) return setConfirmDelete(true);
    try {
      await call('DELETE', `/admin/discounts/${id}`);
      go('/admin/rabatter');
    } catch (e) {
      setConfirmDelete(false);
      setStatus({ kind: 'error', text: (e as Error).message });
    }
  };

  const kind = KINDS[d.kind];

  return (
    <div className="pf">
      <div className="pf-top">
        <button type="button" className="pf-back" onClick={() => go('/admin/rabatter')} aria-label="Tillbaka till rabatter" data-testid="button-discount-back">
          ←
        </button>
        <h1>{isNew ? 'Skapa rabatt' : d.method === 'code' ? d.code : d.title}</h1>
        {d.state && <span className={`pf-badge ${d.state === 'active' ? 'published' : d.state === 'scheduled' ? '' : 'archived'}`}>{STATE[d.state]}</span>}
      </div>

      <div className="pf-grid">
        <div className="pf-main">
          <Card title={kind.title}>
            <div className="pf-field">
              <span className="pf-label">Metod</span>
              <div className="dc-seg" role="radiogroup" aria-label="Metod">
                {(['code', 'automatic'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={d.method === m}
                    className={d.method === m ? 'is-on' : ''}
                    disabled={codeLocked}
                    onClick={() => set({ method: m, eligibility: m === 'automatic' ? { type: 'all', customerIds: [] } : d.eligibility, customers: m === 'automatic' ? [] : d.customers })}
                    data-testid={`seg-discount-method-${m}`}
                  >
                    {m === 'code' ? 'Rabattkod' : 'Automatisk rabatt'}
                  </button>
                ))}
              </div>
            </div>
            {d.method === 'code' ? (
              <div className="pf-field">
                <div className="dc-label-row">
                  <label htmlFor="dc-code">Rabattkod</label>
                  {!codeLocked && (
                    <button type="button" className="pf-link" onClick={() => set({ code: randomCode() })} data-testid="button-generate-code">
                      Generera slumpmässig kod
                    </button>
                  )}
                </div>
                <input
                  id="dc-code"
                  className="pf-input dc-code"
                  value={d.code}
                  disabled={codeLocked}
                  onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                  placeholder="T.ex. VALKOMMEN10"
                  maxLength={32}
                  autoComplete="off"
                  data-testid="input-discount-code"
                />
                <p className="pf-help">{codeLocked ? 'Koden har använts och kan inte bytas.' : 'Kunden skriver koden i varukorgen.'}</p>
              </div>
            ) : (
              <div className="pf-field">
                <label htmlFor="dc-title">Titel</label>
                <input id="dc-title" className="pf-input" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="T.ex. Black Week" maxLength={80} data-testid="input-discount-title" />
                <p className="pf-help">Kunden ser titeln i varukorgen. Rabatten dras automatiskt när villkoren är uppfyllda.</p>
              </div>
            )}
          </Card>

          {d.kind !== 'shipping' && (
            <Card title="Rabattvärde">
              <div className="dc-value-row">
                <select className="pf-input" aria-label="Typ av värde" value={d.valueType} onChange={(e) => set({ valueType: e.target.value as Discount['valueType'] })} data-testid="select-discount-value-type">
                  <option value="percent">Procent</option>
                  <option value="fixed">Fast belopp</option>
                </select>
                <div className="pf-affix">
                  <input
                    className="pf-input"
                    type="number"
                    min={0}
                    max={d.valueType === 'percent' ? 100 : undefined}
                    inputMode="decimal"
                    aria-label={d.valueType === 'percent' ? 'Procent' : 'Belopp i kronor'}
                    value={d.value || ''}
                    placeholder="0"
                    onChange={(e) => set({ value: Number(e.target.value) })}
                    data-testid="input-discount-value"
                  />
                  <span>{d.valueType === 'percent' ? '%' : 'kr'}</span>
                </div>
              </div>
              {d.kind === 'products' && (
                <>
                  <div className="pf-field">
                    <label htmlFor="dc-applies">Gäller för</label>
                    <select
                      id="dc-applies"
                      className="pf-input"
                      value={d.appliesTo.type}
                      onChange={(e) => set({ appliesTo: { ...d.appliesTo, type: e.target.value as Discount['appliesTo']['type'] } })}
                      data-testid="select-discount-applies"
                    >
                      <option value="all">Alla produkter</option>
                      <option value="categories">Vissa kategorier</option>
                      <option value="products">Vissa produkter</option>
                    </select>
                  </div>
                  {d.appliesTo.type === 'categories' && (
                    <ChecklistPicker id="dc-cats" label="Kategorier" placeholder="Sök kategori" options={catOptions} selected={d.appliesTo.categories} onChange={(v) => set({ appliesTo: { ...d.appliesTo, categories: v } })} />
                  )}
                  {d.appliesTo.type === 'products' && (
                    <ChecklistPicker
                      id="dc-products"
                      label="Produkter"
                      placeholder="Sök produkt"
                      options={products.map((p) => ({ value: p.slug, label: p.name }))}
                      selected={d.appliesTo.products}
                      onChange={(v) => set({ appliesTo: { ...d.appliesTo, products: v } })}
                    />
                  )}
                </>
              )}
              {d.valueType === 'fixed' && <p className="pf-help">Ett fast belopp dras en gång per order, aldrig mer än varorna kostar.</p>}
              <label className="pf-toggle">
                <input type="checkbox" checked={d.combineWithCampaigns} onChange={(e) => set({ combineWithCampaigns: e.target.checked })} data-testid="check-discount-campaigns" /> Gäller även varor som redan har kampanjpris
              </label>
              <p className="pf-help">Av som standard: varor med kampanjpris (Marknadsföring → Kampanjer) får då ingen extra rabatt.</p>
            </Card>
          )}

          <Card title="Vem får använda rabatten">
            {d.method === 'automatic' ? (
              <p className="pf-help">Automatiska rabatter gäller alla kunder. Vill du ge rabatt till vissa kunder, välj Rabattkod.</p>
            ) : (
              <>
                <div className="dc-radios">
                  {(Object.keys(WHO) as Discount['eligibility']['type'][]).map((w) => (
                    <Radio key={w} name="dc-who" checked={d.eligibility.type === w} onChange={() => set({ eligibility: { ...d.eligibility, type: w } })} testId={`radio-discount-who-${w}`}>
                      {WHO[w]}
                    </Radio>
                  ))}
                </div>
                {d.eligibility.type === 'specific' && (
                  <CustomerPicker selected={d.customers} onChange={(c) => set({ customers: c, eligibility: { type: 'specific', customerIds: c.map((x) => x.id) } })} />
                )}
                {d.eligibility.type !== 'all' && <p className="pf-help">Vi kontrollerar kundens e-postadress i kassan innan rabatten dras.</p>}
              </>
            )}
          </Card>

          <Card title="Minsta köpkrav">
            <div className="dc-radios">
              <Radio name="dc-min" checked={d.minType === 'none'} onChange={() => set({ minType: 'none', minValue: 0 })}>
                Inget krav
              </Radio>
              <Radio name="dc-min" checked={d.minType === 'amount'} onChange={() => set({ minType: 'amount' })} testId="radio-discount-min-amount">
                Minsta köpbelopp (kr)
              </Radio>
              {d.minType === 'amount' && (
                <div className="pf-affix dc-indent">
                  <input className="pf-input" type="number" min={0} aria-label="Minsta köpbelopp" value={d.minValue || ''} onChange={(e) => set({ minValue: Number(e.target.value) })} data-testid="input-discount-min-amount" />
                  <span>kr</span>
                </div>
              )}
              <Radio name="dc-min" checked={d.minType === 'quantity'} onChange={() => set({ minType: 'quantity' })}>
                Minsta antal artiklar
              </Radio>
              {d.minType === 'quantity' && (
                <input className="pf-input dc-indent" type="number" min={1} aria-label="Minsta antal artiklar" value={d.minValue || ''} onChange={(e) => set({ minValue: Math.round(Number(e.target.value)) })} />
              )}
            </div>
            {d.kind === 'products' && d.appliesTo.type !== 'all' && d.minType !== 'none' && <p className="pf-help">Räknas bara på de produkter rabatten gäller.</p>}
            {d.kind === 'shipping' && (
              <p className="pf-help" data-testid="hint-discount-free-shipping">
                {freeShippingPhrase()
                  ? `Obs: ordrar över ${shipping.freeFrom} kr har redan ${freeShippingPhrase()} (Inställningar → Frakt). ${d.minType === 'amount' && d.minValue >= shipping.freeFrom ? 'Med det här köpkravet gör rabatten bara skillnad för fraktsätt som kostar något över gränsen.' : 'Rabatten gör nytta för ordrar under gränsen.'}`
                  : 'Rabatten gör alla fraktsätt gratis.'}
              </p>
            )}
          </Card>

          {d.method === 'code' && (
            <Card title="Hur många gånger">
              <label className="pf-toggle">
                <input type="checkbox" checked={d.usageLimit !== null} onChange={(e) => set({ usageLimit: e.target.checked ? 100 : null })} data-testid="check-discount-limit" /> Begränsa hur många gånger koden kan användas totalt
              </label>
              {d.usageLimit !== null && (
                <input className="pf-input dc-indent dc-small" type="number" min={1} aria-label="Antal gånger totalt" value={d.usageLimit || ''} onChange={(e) => set({ usageLimit: Math.max(1, Math.round(Number(e.target.value))) })} />
              )}
              <label className="pf-toggle">
                <input type="checkbox" checked={d.oncePerCustomer} onChange={(e) => set({ oncePerCustomer: e.target.checked })} data-testid="check-discount-once" /> En gång per kund
              </label>
            </Card>
          )}

          <Card title="Schema">
            <div className="pf-row two">
              <div className="pf-field">
                <label htmlFor="dc-start">Startar</label>
                <input id="dc-start" className="pf-input" type="datetime-local" value={toLocal(d.startsAt)} onChange={(e) => e.target.value && set({ startsAt: fromLocal(e.target.value) })} />
              </div>
              {hasEnd ? (
                <div className="pf-field">
                  <label htmlFor="dc-end">Slutar</label>
                  <input id="dc-end" className="pf-input" type="datetime-local" value={d.endsAt ? toLocal(d.endsAt) : ''} onChange={(e) => set({ endsAt: e.target.value ? fromLocal(e.target.value) : null })} data-testid="input-discount-end" />
                </div>
              ) : (
                <div className="pf-field dc-end-add">
                  <button
                    type="button"
                    className="pf-add small"
                    onClick={() => {
                      setHasEnd(true);
                      const end = new Date(Math.max(Date.now(), new Date(d.startsAt).getTime()) + 7 * 864e5);
                      end.setHours(23, 59, 0, 0);
                      set({ endsAt: end.toISOString() });
                    }}
                    data-testid="button-discount-add-end"
                  >
                    ＋ Ange slutdatum
                  </button>
                </div>
              )}
            </div>
            {hasEnd && (
              <button
                type="button"
                className="pf-link"
                onClick={() => {
                  setHasEnd(false);
                  set({ endsAt: null });
                }}
              >
                Ta bort slutdatum
              </button>
            )}
          </Card>
        </div>

        <aside className="pf-side">
          <Card>
            <div className="dc-summary">
              <p className="dc-summary-code">{d.method === 'code' ? d.code || 'Ingen rabattkod än' : d.title || 'Ingen titel än'}</p>
              <p className="pf-sub">{d.method === 'code' ? 'Kod' : 'Automatisk'}</p>
              <h3>Typ</h3>
              <p>
                {kind.icon} {kind.title}
              </p>
              <h3>Detaljer</h3>
              <ul data-testid="list-discount-summary">
                {details(d, productNames, catNames).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              {!isNew && (
                <>
                  <h3>Användning</h3>
                  <p>
                    {used} {used === 1 ? 'gång' : 'gånger'}
                    {d.usageLimit ? ` av ${d.usageLimit}` : ''}
                  </p>
                </>
              )}
            </div>
          </Card>
          <Card title="Status">
            <label className="pf-toggle">
              <input type="checkbox" checked={d.enabled} onChange={(e) => set({ enabled: e.target.checked })} data-testid="check-discount-enabled" /> Rabatten är påslagen
            </label>
            <p className="pf-help">Stäng av för att pausa rabatten utan att ta bort den.</p>
          </Card>
          {!isNew && (
            <Card title="Fler åtgärder">
              {used > 0 ? (
                <p className="pf-help">Rabatten har använts och kan inte tas bort. Stäng av den i stället.</p>
              ) : (
                <button type="button" className={`pf-link danger${confirmDelete ? ' confirm' : ''}`} onClick={remove} data-testid="button-delete-discount">
                  {confirmDelete ? 'Klicka igen för att ta bort för gott' : 'Ta bort rabatten'}
                </button>
              )}
            </Card>
          )}
        </aside>
      </div>

      <div className={`pf-savebar${dirty || isNew ? ' is-dirty' : ''}`}>
        <p role="status" className={`pf-savebar-msg ${status.kind}`} data-testid="status-discount-save">
          {status.kind === 'saving' ? 'Sparar …' : (status.text ?? (isNew ? 'Ny rabatt – inget är sparat än' : dirty ? 'Osparade ändringar' : 'Allt är sparat'))}
        </p>
        <div className="pf-savebar-actions">
          {dirty && !isNew && (
            <button type="button" className="pf-btn ghost" onClick={() => setD(JSON.parse(base))}>
              Ångra
            </button>
          )}
          <button type="button" className="pf-btn primary" onClick={save} disabled={status.kind === 'saving' || (!dirty && !isNew)} data-testid="button-save-discount">
            {isNew ? 'Spara rabatt' : 'Spara'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DiscountsView({ id, go, onTitleChange }: { id?: string; go: (path: string) => void; notify?: (m: string) => void; onTitleChange: (value: string) => void }) {
  return id ? <DiscountForm key={id} id={id} go={go} onTitleChange={onTitleChange} /> : <DiscountList go={go} />;
}
