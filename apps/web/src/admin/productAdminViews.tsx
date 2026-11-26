import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { categories, getCategory, getSubcategory, subcategoriesOf } from '@/data/categories';
import { getFlavour } from '@/data/products';
import { PwoCan } from '@/components/art/PwoCan';

/**
 * Admin → Produkter. Listan och formuläret läser och sparar direkt i databasen.
 */

const api = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api${path}`;
const kr = (n: number | null) => (n === null ? '–' : `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(n)} kr`);

type Status = 'draft' | 'published' | 'archived';
const STATUS: Record<Status, { label: string; tone: string }> = {
  published: { label: 'Publicerad', tone: 'good' },
  draft: { label: 'Utkast', tone: 'warn' },
  archived: { label: 'Arkiverad', tone: 'info' },
};

interface ListRow {
  id: string;
  slug: string;
  name: string;
  brand: string;
  status: Status;
  subcategory: string;
  category: string;
  image: string | null;
  canImage: string | null;
  variants: number;
  stock: number;
  priceFrom: number | null;
  updatedAt: string;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(api(path), {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Något gick fel.');
  return data as T;
}

function Thumb({ row }: { row: Pick<ListRow, 'image' | 'canImage'> }) {
  return (
    <span className="admin-thumb" aria-hidden="true">
      {row.image ? <img src={row.image} alt="" loading="lazy" /> : row.canImage ? <PwoCan flavour={row.canImage} label="" /> : <span>—</span>}
    </span>
  );
}

// ---------------------------------------------------------------- Listan

export function ProductsListView({ go }: { go: (path: string) => void }) {
  const [rows, setRows] = useState<ListRow[] | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'all' | Status>('all');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = () =>
    call<ListRow[]>('GET', '/admin/products')
      .then((r) => {
        setRows(r);
        setSelected((sel) => new Set([...sel].filter((id) => r.some((x) => x.id === id))));
      })
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const c = { all: 0, published: 0, draft: 0, archived: 0 };
    for (const r of rows ?? []) {
      c.all++;
      c[r.status]++;
    }
    return c;
  }, [rows]);

  const shown = useMemo(
    () =>
      (rows ?? []).filter(
        (r) =>
          (tab === 'all' || r.status === tab) &&
          (!cat || r.category === cat) &&
          `${r.name} ${r.brand} ${r.slug}`.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [rows, tab, cat, q],
  );

  const act = async (ids: string[], action: 'published' | 'draft' | 'archived' | 'delete' | 'duplicate') => {
    setMessage('');
    const errors: string[] = [];
    let ok = 0;
    for (const id of ids) {
      try {
        if (action === 'delete') await call('DELETE', `/admin/products/${id}`);
        else if (action === 'duplicate') await call('POST', `/admin/products/${id}/duplicate`);
        else await call('POST', `/admin/products/${id}/status`, { status: action });
        ok++;
      } catch (e) {
        const name = rows?.find((r) => r.id === id)?.name ?? id;
        errors.push(`${name}: ${(e as Error).message}`);
      }
    }
    const verb = { published: 'publicerades', draft: 'avpublicerades', archived: 'arkiverades', delete: 'togs bort', duplicate: 'kopierades' }[action];
    setMessage([ok ? `${ok} ${ok === 1 ? 'produkt' : 'produkter'} ${verb}.` : '', ...errors].filter(Boolean).join(' '));
    setConfirmDelete(null);
    setSelected(new Set());
    load();
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allShown = shown.length > 0 && shown.every((r) => selected.has(r.id));
  const sel = [...selected];

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">Katalog</p>
          <h1>Produkter</h1>
          <p>Allt du sparar här syns direkt i butiken. Utkast och arkiverade produkter är dolda för kunderna.</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-btn primary" onClick={() => go('/admin/produkter/ny')} data-testid="button-add-product">
            ＋ Ny produkt
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-inline-message" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="admin-inline-message" role="status" data-testid="status-products-message">
          {message}
        </div>
      )}

      <div className="admin-tabs" role="group" aria-label="Filtrera på status">
        {(['all', 'published', 'draft', 'archived'] as const).map((t) => (
          <button key={t} type="button" className="admin-tab" aria-pressed={tab === t} onClick={() => setTab(t)} data-testid={`tab-products-${t}`}>
            {t === 'all' ? 'Alla' : t === 'published' ? 'Publicerade' : t === 'draft' ? 'Utkast' : 'Arkiverade'}{' '}
            <span className="admin-tab-count">{counts[t]}</span>
          </button>
        ))}
      </div>

      <div className="admin-toolbar admin-product-toolbar">
        <div className="admin-search">
          <label className="admin-search-label" htmlFor="product-search">
            Sök produkter
          </label>
          <input id="product-search" className="admin-control" placeholder="Namn, varumärke eller adress" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search-products" />
        </div>
        <label className="admin-filter-label">
          Kategori
          <select className="admin-control" value={cat} onChange={(e) => setCat(e.target.value)} data-testid="filter-product-category">
            <option value="">Alla kategorier</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {sel.length > 0 && (
        <div className="admin-bulkbar" role="region" aria-label="Åtgärder för valda produkter">
          <strong>{sel.length} valda</strong>
          <button type="button" className="admin-btn small" onClick={() => act(sel, 'published')}>
            Publicera
          </button>
          <button type="button" className="admin-btn small" onClick={() => act(sel, 'draft')}>
            Avpublicera
          </button>
          <button type="button" className="admin-btn small" onClick={() => act(sel, 'archived')}>
            Arkivera
          </button>
          <button type="button" className={`admin-btn small ${confirmDelete === 'bulk' ? 'danger' : ''}`} onClick={() => (confirmDelete === 'bulk' ? act(sel, 'delete') : setConfirmDelete('bulk'))}>
            {confirmDelete === 'bulk' ? 'Klicka igen för att ta bort' : 'Ta bort'}
          </button>
          <button type="button" className="admin-btn small quiet" onClick={() => setSelected(new Set())}>
            Avmarkera
          </button>
        </div>
      )}

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table" data-testid="table-products">
            <thead>
              <tr>
                <th scope="col" className="admin-check-col">
                  <input type="checkbox" aria-label="Markera alla" checked={allShown} onChange={() => setSelected(allShown ? new Set() : new Set(shown.map((r) => r.id)))} />
                </th>
                <th scope="col">Produkt</th>
                <th scope="col">Kategori</th>
                <th scope="col">Varianter</th>
                <th scope="col">Lager</th>
                <th scope="col">Pris från</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Åtgärder</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows === null && (
                <tr>
                  <td colSpan={8} className="admin-muted">
                    Laddar …
                  </td>
                </tr>
              )}
              {rows && shown.length === 0 && (
                <tr>
                  <td colSpan={8} className="admin-muted" data-testid="empty-products">
                    Inga produkter här. {tab === 'all' && !q ? 'Klicka på ”Ny produkt” för att börja.' : 'Prova en annan flik eller sökning.'}
                  </td>
                </tr>
              )}
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className="admin-check-col">
                    <input type="checkbox" aria-label={`Markera ${r.name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                  </td>
                  <td>
                    <button type="button" className="admin-product-cell" onClick={() => go(`/admin/produkter/${r.id}`)} data-testid={`link-product-${r.slug}`}>
                      <Thumb row={r} />
                      <span>
                        <strong>{r.name}</strong>
                        <span className="subtext">
                          {r.brand} · /produkt/{r.slug}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td>{getSubcategory(r.subcategory)?.name ?? <span className="admin-status warn">Saknas</span>}</td>
                  <td>{r.variants}</td>
                  <td>{r.stock} st</td>
                  <td className="num">{kr(r.priceFrom)}</td>
                  <td>
                    <span className={`admin-status ${STATUS[r.status].tone}`} data-testid={`status-product-${r.slug}`}>
                      {STATUS[r.status].label}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" className="admin-btn small" onClick={() => go(`/admin/produkter/${r.id}`)} data-testid={`button-edit-product-${r.slug}`}>
                        Redigera
                      </button>
                      {r.status === 'published' && (
                        <button type="button" className="admin-btn small" onClick={() => act([r.id], 'draft')}>
                          Avpublicera
                        </button>
                      )}
                      {r.status === 'draft' && (
                        <button type="button" className="admin-btn small" onClick={() => act([r.id], 'published')} data-testid={`button-publish-${r.slug}`}>
                          Publicera
                        </button>
                      )}
                      {r.status === 'archived' && (
                        <button type="button" className="admin-btn small" onClick={() => act([r.id], 'draft')} data-testid={`button-restore-${r.slug}`}>
                          Återställ
                        </button>
                      )}
                      <details className="admin-more">
                        <summary className="admin-btn small" aria-label={`Fler åtgärder för ${r.name}`}>
                          ⋯
                        </summary>
                        <div className="admin-more-menu">
                          <button type="button" onClick={() => act([r.id], 'duplicate')}>
                            Kopiera
                          </button>
                          {r.status !== 'archived' && (
                            <button type="button" onClick={() => act([r.id], 'archived')}>
                              Arkivera
                            </button>
                          )}
                          {r.status === 'archived' && (
                            <button type="button" onClick={() => act([r.id], 'published')}>
                              Publicera igen
                            </button>
                          )}
                          {r.status === 'published' && (
                            <a href={`/produkt/${r.slug}`} target="_blank" rel="noopener">
                              Visa i butiken
                            </a>
                          )}
                          {r.status !== 'published' && (
                            <button type="button" className="danger" onClick={() => (confirmDelete === r.id ? act([r.id], 'delete') : setConfirmDelete(r.id))} data-testid={`button-delete-${r.slug}`}>
                              {confirmDelete === r.id ? 'Klicka igen för att ta bort' : 'Ta bort'}
                            </button>
                          )}
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------- Formuläret

type ProductType = 'kosttillskott' | 'livsmedel' | 'dryck' | 'kroppsvard' | 'klader' | 'redskap';
const TYPES: { value: ProductType; label: string; food: boolean }[] = [
  { value: 'kosttillskott', label: 'Kosttillskott', food: true },
  { value: 'livsmedel', label: 'Livsmedel', food: true },
  { value: 'dryck', label: 'Dryck', food: true },
  { value: 'kroppsvard', label: 'Kroppsvård', food: false },
  { value: 'klader', label: 'Kläder', food: false },
  { value: 'redskap', label: 'Träningsutrustning', food: false },
];

interface FormVariant {
  id?: string;
  options: Record<string, string>;
  flavour?: string | null;
  pack?: number | null;
  price: number;
  stock: number;
  ean: string;
  sku: string;
  offered: boolean;
  netAmount?: number | null;
  netUnit?: 'l' | 'kg' | 'st' | null;
}
interface Form {
  id?: string;
  slug?: string;
  status?: Status;
  hasOrders?: boolean;
  name: string;
  brand: string;
  productType: ProductType;
  subcategory: string;
  tagline: string;
  description: string;
  usage: string;
  ingredients: string;
  allergens: string[];
  warnings: string[];
  facts: { label: string; value: string }[];
  nutrition: { servingLabel?: string; rows: { label: string; per100: string; perServing?: string }[] } | null;
  images: { src: string; alt?: string }[];
  sizeLabel: string;
  vat: 'vat-food' | 'vat-standard';
  deposit: boolean;
  optionNames: string[];
  variants: FormVariant[];
  isNew: boolean;
}

const emptyVariant = (): FormVariant => ({ options: {}, price: 0, stock: 0, ean: '', sku: '', offered: true });
const emptyForm = (): Form => ({
  name: '',
  brand: 'SELFIT',
  productType: 'kosttillskott',
  subcategory: '',
  tagline: '',
  description: '',
  usage: '',
  ingredients: '',
  allergens: [],
  warnings: [],
  facts: [],
  nutrition: null,
  images: [],
  sizeLabel: '',
  vat: 'vat-food',
  deposit: false,
  optionNames: [],
  variants: [emptyVariant()],
  isNew: true,
});

/** Namn på en variant, t.ex. "M · Svart" eller "Blåbär · 12-pack". */
function variantLabel(v: FormVariant, names: string[]) {
  if (names.length) return names.map((n) => v.options[n]).filter(Boolean).join(' · ') || 'Ny variant';
  const parts = [getFlavour(v.flavour ?? undefined)?.name, v.pack ? `${v.pack}-pack` : ''].filter(Boolean);
  return parts.join(' · ') || 'Standard';
}

/** Problem som hindrar publicering (samma regler som servern). */
function problems(f: Form) {
  const out: string[] = [];
  if (!f.name.trim()) out.push('Ge produkten ett namn.');
  if (!getSubcategory(f.subcategory)) out.push('Välj kategori.');
  const sell = f.variants.filter((v) => v.offered);
  if (!sell.length) out.push('Minst en variant måste säljas.');
  if (sell.some((v) => !(v.price > 0))) out.push('Ange pris för alla varianter som säljs.');
  if (f.optionNames.length && sell.some((v) => f.optionNames.some((n) => !v.options[n]?.trim()))) out.push('Fyll i alla alternativ för varje variant.');
  return out;
}

/** Förminskar bilden i webbläsaren (max 1600 px, WebP) innan den laddas upp. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.86));
    return blob ?? file;
  } catch {
    return file;
  }
}

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="admin-panel admin-form-section" aria-labelledby={`sec-${n}`}>
      <header className="admin-panel-head">
        <div>
          <h2 id={`sec-${n}`}>
            <span className="admin-step" aria-hidden="true">
              {n}
            </span>{' '}
            {title}
          </h2>
          {hint && <p>{hint}</p>}
        </div>
      </header>
      <div className="admin-panel-body">{children}</div>
    </section>
  );
}

function F({ id, label, hint, required, wide, children }: { id: string; label: string; hint?: string; required?: boolean; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`admin-field${wide ? ' span-2' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="admin-required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && <span className="admin-field-hint">{hint}</span>}
    </div>
  );
}

export function ProductFormView({ id, go, onTitleChange }: { id?: string; go: (path: string) => void; onTitleChange?: (t: string) => void }) {
  const [form, setForm] = useState<Form | null>(id ? null : emptyForm());
  const [base, setBase] = useState(id ? '' : JSON.stringify(emptyForm()));
  const [brands, setBrands] = useState<string[]>([]);
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'saved' | 'error'; text?: string }>(() => {
    // Meddelandet från när produkten skapades (sidan byter adress efter första sparningen).
    const flash = sessionStorage.getItem('admin-product-flash');
    sessionStorage.removeItem('admin-product-flash');
    return flash ? { kind: 'saved', text: flash } : { kind: 'idle' };
  });
  const [uploading, setUploading] = useState(0);
  const [drag, setDrag] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [optionDraft, setOptionDraft] = useState<{ name: string; values: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(api('/brands'))
      .then((r) => (r.ok ? r.json() : []))
      .then((b: { name: string }[]) => setBrands(b.map((x) => x.name)))
      .catch(() => undefined);
    if (!id) return;
    call<Form>('GET', `/admin/products/${id}`)
      .then((p) => {
        setForm(p);
        setBase(JSON.stringify(p));
        setOptionDraft(p.optionNames.map((n) => ({ name: n, values: [...new Set(p.variants.map((v) => v.options[n]).filter(Boolean))].join(', ') })));
      })
      .catch((e: Error) => setStatus({ kind: 'error', text: e.message }));
  }, [id]);

  useEffect(() => {
    if (form) onTitleChange?.(form.name || 'Ny produkt');
  }, [form?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = form !== null && JSON.stringify(form) !== base;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (!form) return <p>{status.text ?? 'Laddar …'}</p>;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm({ ...form, [k]: v });
    setConfirmLeave(false);
    if (status.kind === 'saved') setStatus({ kind: 'idle' });
  };
  const type = TYPES.find((t) => t.value === form.productType) ?? TYPES[0];
  const legacy = !form.optionNames.length && form.variants.some((v) => v.flavour || v.pack);
  const hasVariants = legacy || form.optionNames.length > 0 || optionDraft.length > 0;
  const issues = problems(form);
  const prices = form.variants.filter((v) => v.offered && v.price > 0).map((v) => v.price);
  const sub = getSubcategory(form.subcategory);

  const setVariant = (i: number, patch: Partial<FormVariant>) => set('variants', form.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  /** Skapar alla kombinationer av alternativen. Befintliga varianter behåller pris och lager. */
  const applyOptions = (draft = optionDraft) => {
    const opts = draft
      .map((o) => ({ name: o.name.trim(), values: [...new Set(o.values.split(',').map((v) => v.trim()).filter(Boolean))] }))
      .filter((o) => o.name && o.values.length);
    if (!opts.length) {
      setForm({ ...form, optionNames: [], variants: [{ ...(form.variants[0] ?? emptyVariant()), options: {} }] });
      return;
    }
    let combos: Record<string, string>[] = [{}];
    for (const o of opts) combos = combos.flatMap((c) => o.values.map((v) => ({ ...c, [o.name]: v })));
    const template = form.variants[0] ?? emptyVariant();
    const variants = combos.map((options) => {
      const same = form.variants.find((v) => opts.every((o) => v.options[o.name] === options[o.name]));
      return same ? { ...same, options } : { ...emptyVariant(), price: template.price, options };
    });
    setForm({ ...form, optionNames: opts.map((o) => o.name), variants });
  };

  const upload = async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setUploading((n) => n + list.length);
    const added: { src: string; alt: string }[] = [];
    for (const file of list) {
      try {
        const blob = await shrink(file);
        const fd = new FormData();
        const typeOk = ['image/webp', 'image/jpeg', 'image/png'].includes(blob.type);
        fd.append('file', new File([blob], file.name, { type: typeOk ? blob.type : 'image/png' }));
        const res = await fetch(api('/admin/uploads'), { method: 'POST', body: fd });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        added.push({ src: body.src, alt: form.name });
      } catch (e) {
        setStatus({ kind: 'error', text: `Kunde inte ladda upp ${file.name}. ${(e as Error).message ?? ''}` });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    setForm((f) => (f ? { ...f, images: [...f.images, ...added] } : f));
  };

  const moveImage = (i: number, dir: -1 | 1) => {
    const imgs = [...form.images];
    const [x] = imgs.splice(i, 1);
    imgs.splice(i + dir, 0, x);
    set('images', imgs);
  };

  const save = async (nextStatus?: 'draft' | 'published') => {
    if (nextStatus === 'published' && issues.length) {
      setStatus({ kind: 'error', text: `Kan inte publicera ännu: ${issues.join(' ')}` });
      return;
    }
    setStatus({ kind: 'saving' });
    try {
      const body = { ...form, status: nextStatus };
      const saved = form.id ? await call<Form>('PUT', `/admin/products/${form.id}`, body) : await call<Form>('POST', '/admin/products', body);
      setForm(saved);
      setBase(JSON.stringify(saved));
      const text = saved.status === 'published' ? 'Sparat och publicerat. Produkten syns i butiken.' : 'Sparat som utkast. Produkten syns inte i butiken förrän du publicerar.';
      setStatus({ kind: 'saved', text });
      if (!form.id && saved.id) {
        sessionStorage.setItem('admin-product-flash', text);
        go(`/admin/produkter/${saved.id}`);
      }
    } catch (e) {
      setStatus({ kind: 'error', text: (e as Error).message });
    }
  };

  const changeStatus = async (s: Status) => {
    if (!form.id) return;
    try {
      const saved = await call<Form>('POST', `/admin/products/${form.id}/status`, { status: s });
      setForm({ ...form, status: saved.status });
      setBase(JSON.stringify({ ...JSON.parse(base), status: saved.status }));
      setStatus({ kind: 'saved', text: `Status ändrad till ${STATUS[s].label.toLowerCase()}.` });
    } catch (e) {
      setStatus({ kind: 'error', text: (e as Error).message });
    }
  };

  const remove = async () => {
    if (!form.id) return go('/admin/produkter');
    if (!confirmDelete) return setConfirmDelete(true);
    try {
      await call('DELETE', `/admin/products/${form.id}`);
      go('/admin/produkter');
    } catch (e) {
      setConfirmDelete(false);
      setStatus({ kind: 'error', text: (e as Error).message });
    }
  };

  const leave = () => {
    if (dirty && !confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    go('/admin/produkter');
  };

  const st = form.status ?? 'draft';

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">Katalog · Produkter</p>
          <h1>{form.name || 'Ny produkt'}</h1>
          <p>
            {form.id ? <span className={`admin-status ${STATUS[st].tone}`}>{STATUS[st].label}</span> : 'Inget sparas förrän du trycker Spara utkast eller Publicera.'}
            {st === 'published' && form.slug && (
              <>
                {' '}
                ·{' '}
                <a href={`/produkt/${form.slug}`} target="_blank" rel="noopener">
                  Visa i butiken
                </a>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="admin-product-form">
        <div className="admin-product-form-main">
          <Section n={1} title="Grundinfo">
            <div className="admin-form-grid">
              <F id="p-name" label="Produktnamn" required wide>
                <input id="p-name" className="admin-control" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="T.ex. Kreatin Gummies" data-testid="input-product-name" />
              </F>
              <F id="p-brand" label="Varumärke" required hint="Välj i listan eller skriv ett nytt.">
                <input id="p-brand" className="admin-control" list="brand-list" value={form.brand} onChange={(e) => set('brand', e.target.value)} data-testid="input-product-brand" />
                <datalist id="brand-list">
                  {brands.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </F>
              <F id="p-type" label="Typ av produkt" hint="Styr vilka fält som visas och vilken moms som gäller.">
                <select
                  id="p-type"
                  className="admin-control"
                  value={form.productType}
                  onChange={(e) => {
                    const t = TYPES.find((x) => x.value === e.target.value) ?? TYPES[0];
                    setForm({ ...form, productType: t.value, vat: t.food ? 'vat-food' : 'vat-standard', deposit: t.value === 'dryck' ? form.deposit : false });
                  }}
                  data-testid="select-product-type"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </F>
              <F id="p-cat" label="Kategori" required wide>
                <select id="p-cat" className="admin-control" value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} data-testid="select-product-category">
                  <option value="">Välj kategori …</option>
                  {categories.map((c) => (
                    <optgroup key={c.slug} label={c.name}>
                      {subcategoriesOf(c.slug).map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </F>
              <F id="p-tagline" label="Kort text" wide hint="En mening som visas under namnet i listor och på produktsidan.">
                <input id="p-tagline" className="admin-control" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="T.ex. 5 g kreatin per dos, god smak av blåbär" data-testid="input-product-tagline" />
              </F>
            </div>
          </Section>

          <Section n={2} title="Bilder" hint="Den första bilden blir huvudbild. Bilderna förminskas automatiskt.">
            <div
              className={`admin-dropzone${drag ? ' is-drag' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                upload(e.dataTransfer.files);
              }}
            >
              <p>Dra in bilder hit, eller</p>
              <button type="button" className="admin-btn" onClick={() => fileRef.current?.click()} data-testid="button-choose-images">
                Välj bilder
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} data-testid="input-product-images" />
              {uploading > 0 && (
                <p role="status">
                  Laddar upp {uploading} {uploading === 1 ? 'bild' : 'bilder'} …
                </p>
              )}
            </div>
            {form.images.length > 0 && (
              <ul className="admin-image-list">
                {form.images.map((img, i) => (
                  <li key={img.src}>
                    <img src={img.src} alt="" />
                    {i === 0 && <span className="admin-status good">Huvudbild</span>}
                    <input
                      className="admin-control"
                      aria-label={`Bildtext för bild ${i + 1}`}
                      placeholder="Bildtext (läses upp för synskadade)"
                      value={img.alt ?? ''}
                      onChange={(e) => set('images', form.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                    />
                    <div className="admin-actions">
                      <button type="button" className="admin-btn small" disabled={i === 0} onClick={() => moveImage(i, -1)} aria-label="Flytta bilden åt vänster">
                        ←
                      </button>
                      <button type="button" className="admin-btn small" disabled={i === form.images.length - 1} onClick={() => moveImage(i, 1)} aria-label="Flytta bilden åt höger">
                        →
                      </button>
                      <button type="button" className="admin-btn small danger" onClick={() => set('images', form.images.filter((_, j) => j !== i))} aria-label={`Ta bort bild ${i + 1}`}>
                        Ta bort
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section n={3} title="Pris och lager">
            {!legacy && (
              <label className="admin-toggle-row admin-variant-toggle">
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setOptionDraft([{ name: form.productType === 'klader' ? 'Storlek' : 'Smak', values: '' }]);
                    } else {
                      setOptionDraft([]);
                      setForm({ ...form, optionNames: [], variants: [{ ...(form.variants[0] ?? emptyVariant()), options: {} }] });
                    }
                  }}
                  data-testid="check-has-variants"
                />
                Produkten har varianter, t.ex. storlek, färg eller smak
              </label>
            )}

            {!legacy && optionDraft.length > 0 && (
              <div className="admin-options">
                <p className="admin-field-hint">Skriv vad kunden ska välja och vilka val som finns. Tryck sedan på ”Skapa varianter”.</p>
                {optionDraft.map((o, i) => (
                  <div className="admin-option-row" key={i}>
                    <F id={`opt-name-${i}`} label={`Alternativ ${i + 1}`}>
                      <input
                        id={`opt-name-${i}`}
                        className="admin-control"
                        value={o.name}
                        placeholder="T.ex. Storlek"
                        onChange={(e) => setOptionDraft(optionDraft.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                        data-testid={`input-option-name-${i}`}
                      />
                    </F>
                    <F id={`opt-values-${i}`} label="Val" hint="Skilj med komma, t.ex. S, M, L, XL">
                      <input
                        id={`opt-values-${i}`}
                        className="admin-control"
                        value={o.values}
                        placeholder="S, M, L"
                        onChange={(e) => setOptionDraft(optionDraft.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))}
                        data-testid={`input-option-values-${i}`}
                      />
                    </F>
                    <button
                      type="button"
                      className="admin-btn small danger"
                      aria-label={`Ta bort alternativ ${i + 1}`}
                      onClick={() => {
                        const d = optionDraft.filter((_, j) => j !== i);
                        setOptionDraft(d);
                        applyOptions(d);
                      }}
                    >
                      Ta bort
                    </button>
                  </div>
                ))}
                <div className="admin-actions">
                  {optionDraft.length < 3 && (
                    <button type="button" className="admin-btn small" onClick={() => setOptionDraft([...optionDraft, { name: optionDraft.length === 1 && form.productType === 'klader' ? 'Färg' : '', values: '' }])}>
                      ＋ Lägg till alternativ
                    </button>
                  )}
                  <button type="button" className="admin-btn small primary" onClick={() => applyOptions()} data-testid="button-apply-options">
                    Skapa varianter
                  </button>
                </div>
              </div>
            )}

            {legacy || form.optionNames.length > 0 ? (
              <>
                <div className="admin-table-wrap">
                  <table className="admin-table admin-variant-table" data-testid="table-variants">
                    <thead>
                      <tr>
                        <th scope="col">Variant</th>
                        <th scope="col">Pris (kr)</th>
                        <th scope="col">Lager (st)</th>
                        <th scope="col">Streckkod (EAN)</th>
                        <th scope="col">Säljs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.variants.map((v, i) => {
                        const label = variantLabel(v, form.optionNames);
                        return (
                          <tr key={v.id ?? `${label}-${i}`} className={v.offered ? '' : 'is-off'}>
                            <th scope="row">{label}</th>
                            <td>
                              <input className="admin-control" type="number" min={0} inputMode="decimal" aria-label={`Pris för ${label}`} value={v.price || ''} onChange={(e) => setVariant(i, { price: Number(e.target.value) })} data-testid={`input-variant-price-${i}`} />
                            </td>
                            <td>
                              <input className="admin-control" type="number" min={0} aria-label={`Lager för ${label}`} value={v.stock} onChange={(e) => setVariant(i, { stock: Math.max(0, Math.round(Number(e.target.value))) })} data-testid={`input-variant-stock-${i}`} />
                            </td>
                            <td>
                              <input className="admin-control" inputMode="numeric" aria-label={`Streckkod för ${label}`} value={v.ean} onChange={(e) => setVariant(i, { ean: e.target.value.replace(/\D/g, '') })} />
                            </td>
                            <td>
                              <input type="checkbox" aria-label={`${label} säljs`} checked={v.offered} onChange={(e) => setVariant(i, { offered: e.target.checked })} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {form.variants.length > 1 && (
                  <button type="button" className="admin-btn small" onClick={() => set('variants', form.variants.map((v) => ({ ...v, price: form.variants[0].price })))}>
                    Använd första radens pris på alla
                  </button>
                )}
              </>
            ) : (
              optionDraft.length === 0 && (
                <div className="admin-form-grid three">
                  <F id="p-price" label="Pris (kr)" required hint="Inklusive moms.">
                    <input id="p-price" className="admin-control" type="number" min={0} inputMode="decimal" value={form.variants[0].price || ''} onChange={(e) => setVariant(0, { price: Number(e.target.value) })} data-testid="input-product-price" />
                  </F>
                  <F id="p-stock" label="Lager (st)">
                    <input id="p-stock" className="admin-control" type="number" min={0} value={form.variants[0].stock} onChange={(e) => setVariant(0, { stock: Math.max(0, Math.round(Number(e.target.value))) })} data-testid="input-product-stock" />
                  </F>
                  <F id="p-ean" label="Streckkod (EAN)">
                    <input id="p-ean" className="admin-control" inputMode="numeric" value={form.variants[0].ean} onChange={(e) => setVariant(0, { ean: e.target.value.replace(/\D/g, '') })} />
                  </F>
                </div>
              )
            )}

            <div className="admin-form-grid admin-price-extra">
              <F id="p-size" label="Storlek eller mängd" hint="Visas i butiken, t.ex. 500 g, 60 kapslar eller 330 ml.">
                <input id="p-size" className="admin-control" value={form.sizeLabel} onChange={(e) => set('sizeLabel', e.target.value)} />
              </F>
              <F id="p-vat" label="Moms">
                <select id="p-vat" className="admin-control" value={form.vat} onChange={(e) => set('vat', e.target.value as Form['vat'])}>
                  <option value="vat-food">Livsmedel (lägre moms)</option>
                  <option value="vat-standard">Normal moms (25 %)</option>
                </select>
              </F>
              {form.productType === 'dryck' && (
                <label className="admin-toggle-row span-2">
                  <input type="checkbox" checked={form.deposit} onChange={(e) => set('deposit', e.target.checked)} /> Pant (1 kr per burk eller flaska)
                </label>
              )}
            </div>
          </Section>

          <Section n={4} title="Produktinformation" hint={type.food ? 'Livsmedel och kosttillskott ska visa samma information som förpackningen.' : undefined}>
            <div className="admin-form-grid">
              <F id="p-desc" label="Beskrivning" wide hint="Tom rad = nytt stycke.">
                <textarea id="p-desc" className="admin-control" rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} data-testid="input-product-description" />
              </F>
              {type.food && (
                <>
                  <F id="p-usage" label="Användning och dosering" wide>
                    <textarea id="p-usage" className="admin-control" rows={3} value={form.usage} onChange={(e) => set('usage', e.target.value)} />
                  </F>
                  <F id="p-ingr" label="Ingredienser" wide hint="Skriv som på förpackningen.">
                    <textarea id="p-ingr" className="admin-control" rows={3} value={form.ingredients} onChange={(e) => set('ingredients', e.target.value)} />
                  </F>
                  <F id="p-allergens" label="Allergener" hint="Skilj med komma, t.ex. mjölk, soja. Markeras i fetstil i ingredienslistan.">
                    <input id="p-allergens" className="admin-control" value={form.allergens.join(', ')} onChange={(e) => set('allergens', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} />
                  </F>
                  <F id="p-warn" label="Varningstexter" hint="En per rad, t.ex. ”Rekommenderad daglig dos bör inte överskridas.”">
                    <textarea id="p-warn" className="admin-control" rows={3} value={form.warnings.join('\n')} onChange={(e) => set('warnings', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} />
                  </F>
                </>
              )}
            </div>

            {type.food && (
              <div className="admin-subsection">
                <h3>Näringsvärde</h3>
                {form.nutrition?.rows.length ? (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th scope="col">Näringsämne</th>
                          <th scope="col">Per 100 g/ml</th>
                          <th scope="col">
                            <input className="admin-control" aria-label="Rubrik för portion" value={form.nutrition.servingLabel ?? ''} placeholder="Per portion" onChange={(e) => set('nutrition', { ...form.nutrition!, servingLabel: e.target.value })} />
                          </th>
                          <th scope="col">
                            <span className="sr-only">Ta bort</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.nutrition.rows.map((r, i) => {
                          const upd = (patch: Partial<typeof r>) => set('nutrition', { ...form.nutrition!, rows: form.nutrition!.rows.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                          return (
                            <tr key={i}>
                              <td>
                                <input className="admin-control" aria-label="Näringsämne" value={r.label} onChange={(e) => upd({ label: e.target.value })} />
                              </td>
                              <td>
                                <input className="admin-control" aria-label={`${r.label} per 100`} value={r.per100} onChange={(e) => upd({ per100: e.target.value })} />
                              </td>
                              <td>
                                <input className="admin-control" aria-label={`${r.label} per portion`} value={r.perServing ?? ''} onChange={(e) => upd({ perServing: e.target.value })} />
                              </td>
                              <td>
                                <button type="button" className="admin-btn small danger" aria-label={`Ta bort ${r.label}`} onClick={() => set('nutrition', { ...form.nutrition!, rows: form.nutrition!.rows.filter((_, j) => j !== i) })}>
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="admin-muted">Inget näringsvärde ännu.</p>
                )}
                <div className="admin-actions">
                  {!form.nutrition?.rows.length && (
                    <button
                      type="button"
                      className="admin-btn small primary"
                      onClick={() =>
                        set('nutrition', {
                          servingLabel: 'Per portion',
                          rows: ['Energi', 'Fett', '– varav mättat fett', 'Kolhydrat', '– varav sockerarter', 'Protein', 'Salt'].map((label) => ({ label, per100: '', perServing: '' })),
                        })
                      }
                    >
                      Lägg till näringstabell
                    </button>
                  )}
                  <button type="button" className="admin-btn small" onClick={() => set('nutrition', { servingLabel: form.nutrition?.servingLabel, rows: [...(form.nutrition?.rows ?? []), { label: '', per100: '', perServing: '' }] })}>
                    ＋ Lägg till rad
                  </button>
                </div>
              </div>
            )}

            <div className="admin-subsection">
              <h3>Fakta</h3>
              <p className="admin-field-hint">Korta fakta i en tabell, t.ex. ”Material: 100 % bomull” eller ”Antal doser: 30”.</p>
              {form.facts.map((fct, i) => (
                <div className="admin-fact-row" key={i}>
                  <input className="admin-control" aria-label="Egenskap" placeholder="Egenskap" value={fct.label} onChange={(e) => set('facts', form.facts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input className="admin-control" aria-label="Värde" placeholder="Värde" value={fct.value} onChange={(e) => set('facts', form.facts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  <button type="button" className="admin-btn small danger" aria-label="Ta bort raden" onClick={() => set('facts', form.facts.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="admin-btn small" onClick={() => set('facts', [...form.facts, { label: '', value: '' }])}>
                ＋ Lägg till fakta
              </button>
            </div>
          </Section>

          <Section n={5} title="Synlighet">
            <label className="admin-toggle-row">
              <input type="checkbox" checked={form.isNew} onChange={(e) => set('isNew', e.target.checked)} /> Visa som nyhet (märket ”Nyhet”)
            </label>
            {form.id && (
              <div className="admin-actions admin-status-actions">
                {st === 'published' && (
                  <button type="button" className="admin-btn" onClick={() => changeStatus('draft')}>
                    Avpublicera (gör till utkast)
                  </button>
                )}
                {st !== 'archived' && (
                  <button type="button" className="admin-btn" onClick={() => changeStatus('archived')} data-testid="button-archive-product">
                    Arkivera
                  </button>
                )}
                {st === 'archived' && (
                  <button type="button" className="admin-btn" onClick={() => changeStatus('draft')} data-testid="button-restore-product">
                    Återställ till utkast
                  </button>
                )}
                {st !== 'published' && !form.hasOrders && (
                  <button type="button" className={`admin-btn ${confirmDelete ? 'danger' : ''}`} onClick={remove} data-testid="button-delete-product">
                    {confirmDelete ? 'Klicka igen för att ta bort för gott' : 'Ta bort produkten'}
                  </button>
                )}
              </div>
            )}
            {form.hasOrders && <p className="admin-field-hint">Produkten finns på ordrar och kan därför bara arkiveras, inte tas bort.</p>}
          </Section>
        </div>

        <aside className="admin-product-preview" aria-label="Förhandsvisning">
          <p className="admin-kicker">Så ser den ut i butiken</p>
          <div className="admin-preview-card">
            <div className="admin-preview-media">
              {form.images[0] ? <img src={form.images[0].src} alt="" /> : legacy && form.variants[0]?.flavour ? <PwoCan flavour={form.variants[0].flavour} label="" /> : <span>Ingen bild ännu</span>}
              {form.isNew && <span className="admin-preview-badge">Nyhet</span>}
            </div>
            <p className="admin-preview-brand">{form.brand || 'Varumärke'}</p>
            <p className="admin-preview-name">{form.name || 'Produktnamn'}</p>
            <p className="admin-preview-tag">{form.tagline || form.sizeLabel || 'Kort text'}</p>
            <p className="admin-preview-price">
              {prices.length ? `${prices.length > 1 && Math.min(...prices) !== Math.max(...prices) ? 'från ' : ''}${kr(Math.min(...prices))}` : 'Pris saknas'}
            </p>
            <p className="admin-muted">{sub ? `${getCategory(sub.parent)?.name} › ${sub.name}` : 'Ingen kategori vald'}</p>
          </div>
          {issues.length > 0 ? (
            <div className="admin-checklist" data-testid="publish-checklist">
              <p>
                <strong>Innan du kan publicera:</strong>
              </p>
              <ul>
                {issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="admin-checklist ok">✓ Redo att publicera</p>
          )}
        </aside>
      </div>

      <div className="admin-savebar">
        <p role="status" className={`admin-savebar-msg ${status.kind}`} data-testid="status-product-save">
          {status.kind === 'saving'
            ? 'Sparar …'
            : confirmLeave
              ? 'Du har osparade ändringar. Klicka Tillbaka igen för att lämna utan att spara.'
              : status.text ?? (dirty ? 'Du har ändringar som inte är sparade.' : form.id ? 'Allt är sparat.' : 'Fyll i och spara.')}
        </p>
        <div className="admin-actions">
          <button type="button" className="admin-btn" onClick={leave} data-testid="button-product-back">
            Tillbaka
          </button>
          {st === 'published' ? (
            <button type="button" className="admin-btn primary" onClick={() => save('published')} disabled={!dirty || status.kind === 'saving'} data-testid="button-save-product">
              Spara ändringar
            </button>
          ) : (
            <>
              <button type="button" className="admin-btn" onClick={() => save('draft')} disabled={(!dirty && Boolean(form.id)) || status.kind === 'saving'} data-testid="button-save-draft">
                Spara utkast
              </button>
              <button type="button" className="admin-btn primary" onClick={() => save('published')} disabled={status.kind === 'saving'} data-testid="button-publish-product">
                Publicera
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
