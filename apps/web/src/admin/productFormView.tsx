import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { categories, getCategory, getSubcategory, subcategoriesOf } from '@/data/categories';
import { kindForCategory } from '@/lib/productKind';
import { isFoodType, productTypes } from '@/data/productTypes';
import { getFlavour } from '@/data/products';
import { PwoCan } from '@/components/art/PwoCan';
import { MediaPicker, uploadImage } from './mediaViews';
import { BrandDialog, type Brand } from './brandViews';

const RichTextEditor = lazy(() => import('./RichTextEditor'));

/**
 * Admin → Produkter → Skapa/redigera produkt.
 * Upplägget följer Shopify: innehållet i en bred kolumn, status och organisation i en smal kolumn.
 */

const api = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api${path}`;
const kr = (n: number) => `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(n)} kr`;

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

type Status = 'draft' | 'published' | 'archived';
type ProductType = string;
/** Produkttyperna (från Admin → Produkttyper och fält). Läses vid varje visning så att nya typer syns direkt. */
const typeList = () => productTypes.map((t) => ({ value: t.id, label: t.name, food: isFoodType(t), def: t }));

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
  status: Status;
  hasOrders?: boolean;
  name: string;
  brandId: string;
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
  sizeGuide?: '' | 'klader' | 'skor';
}

const emptyVariant = (): FormVariant => ({ options: {}, price: 0, stock: 0, ean: '', sku: '', offered: true });
const emptyForm = (): Form => ({
  status: 'draft',
  name: '',
  brandId: '',
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
  sizeGuide: '',
});

const STATUS_LABEL: Record<Status, string> = { draft: 'Utkast', published: 'Aktiv', archived: 'Arkiverad' };

function variantLabel(v: FormVariant, names: string[]) {
  if (names.length) return names.map((n) => v.options[n]).filter(Boolean).join(' / ') || 'Ny variant';
  return [getFlavour(v.flavour ?? undefined)?.name, v.pack ? `${v.pack}-pack` : ''].filter(Boolean).join(' / ') || 'Standard';
}

function problems(f: Form) {
  const out: string[] = [];
  if (!f.name.trim()) out.push('Titel');
  if (!f.brandId) out.push('Varumärke');
  if (!getSubcategory(f.subcategory)) out.push('Kategori');
  const sell = f.variants.filter((v) => v.offered);
  if (!sell.length) out.push('Minst en variant som säljs');
  else if (sell.some((v) => !(v.price > 0))) out.push(f.optionNames.length || sell.length > 1 ? 'Pris på alla varianter' : 'Pris');
  if (f.optionNames.length && sell.some((v) => f.optionNames.some((n) => !v.options[n]?.trim()))) out.push('Värden för alla alternativ');
  return out;
}

/** Fält där varje värde blir en bricka: skriv och tryck Enter eller komma. */
function ChipInput({ id, values, onChange, placeholder, testId }: { id: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; testId?: string }) {
  const [text, setText] = useState('');
  const commit = (raw: string) => {
    const add = raw.split(',').map((x) => x.trim()).filter((x) => x && !values.some((v) => v.toLowerCase() === x.toLowerCase()));
    if (add.length) onChange([...values, ...add]);
    setText('');
  };
  return (
    <div className="pf-chips">
      {values.map((v) => (
        <span key={v} className="pf-chip">
          {v}
          <button type="button" aria-label={`Ta bort ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
            ✕
          </button>
        </span>
      ))}
      <input
        id={id}
        className="pf-chip-input"
        value={text}
        placeholder={values.length ? 'Lägg till fler …' : placeholder}
        onChange={(e) => (e.target.value.includes(',') ? commit(e.target.value) : setText(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(text);
          } else if (e.key === 'Backspace' && !text && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={() => commit(text)}
        data-testid={testId}
      />
    </div>
  );
}

/** Textruta där varje rad blir ett värde. Texten sparas fritt medan man skriver. */
function LinesInput({ id, values, onChange }: { id: string; values: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(values.join('\n'));
  const parsed = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
  useEffect(() => {
    if (parsed(text).join('\n') !== values.join('\n')) setText(values.join('\n'));
  }, [values.join('\n')]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <textarea
      id={id}
      className="pf-input"
      rows={3}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parsed(e.target.value));
      }}
    />
  );
}

function Card({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`pf-card ${className}`}>
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

function Field({ id, label, help, children }: { id: string; label: string; help?: string; children: ReactNode }) {
  return (
    <div className="pf-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {help && <p className="pf-help">{help}</p>}
    </div>
  );
}

export function ProductFormView({ id, go, onTitleChange }: { id?: string; go: (path: string) => void; onTitleChange?: (t: string) => void }) {
  const [form, setForm] = useState<Form | null>(id ? null : emptyForm());
  const [showAllCats, setShowAllCats] = useState(false);
  const [base, setBase] = useState(id ? '' : JSON.stringify(emptyForm()));
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandDialog, setBrandDialog] = useState(false);
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'saved' | 'error'; text?: string }>(() => {
    const flash = sessionStorage.getItem('admin-product-flash');
    sessionStorage.removeItem('admin-product-flash');
    return flash ? { kind: 'saved', text: flash } : { kind: 'idle' };
  });
  const [uploading, setUploading] = useState(0);
  const [drag, setDrag] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [optionDraft, setOptionDraft] = useState<{ name: string; values: string[]; input: string }[]>([]);
  const [showMore, setShowMore] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    call<Brand[]>('GET', '/admin/brands')
      .then((b) => {
        setBrands(b);
        if (!id) {
          const selfit = b.find((x) => x.slug === 'selfit');
          if (selfit) {
            setForm((f) => (f && !f.brandId ? { ...f, brandId: selfit.id } : f));
            setBase((old) => JSON.stringify({ ...JSON.parse(old), brandId: selfit.id }));
          }
        }
      })
      .catch(() => undefined);
    if (!id) return;
    call<Form>('GET', `/admin/products/${id}`)
      .then((p) => {
        setForm(p);
        setBase(JSON.stringify(p));
        setOptionDraft(p.optionNames.map((n) => ({ name: n, values: [...new Set(p.variants.map((v) => v.options[n]).filter(Boolean))], input: '' })));
        setShowMore(Boolean(p.usage || p.ingredients || p.nutrition?.rows.length || p.facts.length || p.warnings.length));
      })
      .catch((e: Error) => setStatus({ kind: 'error', text: e.message }));
  }, [id]);

  useEffect(() => {
    if (form) onTitleChange?.(form.name || 'Skapa produkt');
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
    if (status.kind !== 'saving') setStatus({ kind: 'idle' });
  };
  const sub = getSubcategory(form.subcategory);
  const TYPES = typeList();
  const type = TYPES.find((t) => t.value === form.productType) ?? TYPES[0];
  const tf = type.def.fields;
  /** Kategorier som hör till vald produkttyp. Kategorier utan känd typ visas alltid. */
  const fitsType = (catSlug: string) => {
    const k = kindForCategory(catSlug);
    return !k || k === form.productType;
  };
  const visibleCats = showAllCats ? categories : categories.filter((c) => fitsType(c.slug) || c.slug === sub?.parent);
  const changeType = (value: string) => {
    const t = TYPES.find((x) => x.value === value) ?? TYPES[0];
    const keepSub = !getSubcategory(form.subcategory) || (() => {
      const k = kindForCategory(getSubcategory(form.subcategory)?.parent);
      return !k || k === t.value;
    })();
    setForm({
      ...form,
      productType: t.value,
      subcategory: keepSub ? form.subcategory : '',
      vat: t.food ? 'vat-food' : 'vat-standard',
      deposit: t.def.fields.deposit ? form.deposit : false,
      sizeGuide: t.def.fields.sizeGuide ? form.sizeGuide || 'klader' : '',
    });
  };
  const legacy = !form.optionNames.length && form.variants.some((v) => v.flavour || v.pack);
  const hasVariants = legacy || form.optionNames.length > 0;
  const missing = problems(form);
  const prices = form.variants.filter((v) => v.offered && v.price > 0).map((v) => v.price);
  const brand = brands.find((b) => b.id === form.brandId);
  const setVariant = (i: number, patch: Partial<FormVariant>) => set('variants', form.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  /** Skapar alla kombinationer av alternativen. Befintliga varianter behåller pris och lager. */
  const applyOptions = (draft: typeof optionDraft) => {
    setOptionDraft(draft);
    const opts = draft.map((o) => ({ name: o.name.trim(), values: o.values })).filter((o) => o.name && o.values.length);
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

  const addValue = (i: number) => {
    const o = optionDraft[i];
    const vals = o.input.split(',').map((v) => v.trim()).filter((v) => v && !o.values.includes(v));
    if (!vals.length) return;
    applyOptions(optionDraft.map((x, j) => (j === i ? { ...x, values: [...x.values, ...vals], input: '' } : x)));
  };

  const upload = async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setUploading((n) => n + list.length);
    const added: { src: string; alt: string }[] = [];
    for (const file of list) {
      try {
        const m = await uploadImage(file, form.name);
        added.push({ src: m.src, alt: form.name });
      } catch (e) {
        setStatus({ kind: 'error', text: `Kunde inte ladda upp ${file.name}. ${(e as Error).message}` });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    setForm((f) => (f ? { ...f, images: [...f.images, ...added] } : f));
  };

  const makeMain = (i: number) => {
    const imgs = [...form.images];
    const [x] = imgs.splice(i, 1);
    set('images', [x, ...imgs]);
  };

  const save = async () => {
    if (form.status === 'published' && missing.length) {
      setStatus({ kind: 'error', text: `Produkten kan inte vara aktiv ännu. Fyll i: ${missing.join(', ')}.` });
      return;
    }
    setStatus({ kind: 'saving' });
    try {
      const saved = form.id ? await call<Form>('PUT', `/admin/products/${form.id}`, form) : await call<Form>('POST', '/admin/products', form);
      // Statusen sparas separat när den ändrats (aktiv kräver att allt är ifyllt).
      let result = saved;
      if (saved.status !== form.status) result = await call<Form>('POST', `/admin/products/${saved.id}/status`, { status: form.status });
      setForm(result);
      setBase(JSON.stringify(result));
      const text = result.status === 'published' ? 'Sparat. Produkten syns i butiken.' : result.status === 'archived' ? 'Sparat. Produkten är arkiverad och syns inte i butiken.' : 'Sparat som utkast. Produkten syns inte i butiken förrän du sätter status Aktiv.';
      setStatus({ kind: 'saved', text });
      if (!form.id && result.id) {
        sessionStorage.setItem('admin-product-flash', text);
        go(`/admin/produkter/${result.id}`);
      }
    } catch (e) {
      setStatus({ kind: 'error', text: (e as Error).message });
    }
  };

  const duplicate = async () => {
    if (!form.id) return;
    try {
      const copy = await call<Form>('POST', `/admin/products/${form.id}/duplicate`);
      sessionStorage.setItem('admin-product-flash', `Kopia skapad som utkast. Ändra det som skiljer och spara.`);
      go(`/admin/produkter/${copy.id}`);
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
    if (dirty && !confirmLeave) return setConfirmLeave(true);
    go('/admin/produkter');
  };

  const savedStatus = (JSON.parse(base || '{}') as Partial<Form>).status ?? 'draft';

  return (
    <div className="pf">
      <div className="pf-top">
        <button type="button" className="pf-back" onClick={leave} aria-label="Tillbaka till produkter" data-testid="button-product-back">
          ←
        </button>
        <h1>{form.id ? form.name || 'Namnlös produkt' : 'Skapa produkt'}</h1>
        {form.id && <span className={`pf-badge ${savedStatus}`}>{STATUS_LABEL[savedStatus]}</span>}
        {form.id && savedStatus === 'published' && form.slug && (
          <a className="pf-view" href={`/produkt/${form.slug}`} target="_blank" rel="noopener">
            Visa i butiken ↗
          </a>
        )}
      </div>

      <div className="pf-grid">
        <div className="pf-main">
          <Card>
            <Field id="p-name" label="Titel">
              <input id="p-name" className="pf-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="T.ex. Kreatin Gummies" data-testid="input-product-name" />
            </Field>
            <Field id="p-tagline" label="Kort text" help="Visas under namnet i produktlistor.">
              <input id="p-tagline" className="pf-input" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="T.ex. 5 g kreatin per dos" data-testid="input-product-tagline" />
            </Field>
            <div className="pf-field">
              <span className="pf-label" id="p-desc-label">Beskrivning</span>
              <Suspense fallback={<div className="rte rte-loading">Laddar textredigeraren …</div>}>
                <RichTextEditor id="p-desc" value={form.description} onChange={(v) => set('description', v)} />
              </Suspense>
            </div>

            <div className="pf-field">
              <span className="pf-label">Media</span>
              {form.images.length > 0 && (
                <ul className="pf-media">
                  {form.images.map((img, i) => (
                    <li key={img.src} className={i === 0 ? 'is-main' : ''}>
                      <img src={img.src} alt={img.alt ?? ''} />
                      <div className="pf-media-tools">
                        {i > 0 && (
                          <button type="button" onClick={() => makeMain(i)} aria-label={`Gör bild ${i + 1} till huvudbild`}>
                            Gör till huvudbild
                          </button>
                        )}
                        <button type="button" onClick={() => set('images', form.images.filter((_, j) => j !== i))} aria-label={`Ta bort bild ${i + 1}`}>
                          Ta bort
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div
                className={`pf-drop${drag ? ' is-drag' : ''}${form.images.length ? ' small' : ''}`}
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
                <div className="pf-drop-actions">
                  <button type="button" className="pf-btn" onClick={() => fileRef.current?.click()} data-testid="button-choose-images">
                    Ladda upp ny
                  </button>
                  <button type="button" className="pf-link" onClick={() => setPickerOpen(true)} data-testid="button-open-media">
                    Välj befintlig
                  </button>
                </div>
                <p>{uploading > 0 ? `Laddar upp ${uploading} …` : 'Dra in bilder hit. Den första blir huvudbild.'}</p>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} data-testid="input-product-images" />
              </div>
            </div>

            <div className="pf-row two">
            <Field id="p-type" label="Produkttyp" help="Styr vilka fält och kategorier som visas.">
              <select id="p-type" className="pf-input" value={form.productType} onChange={(e) => changeType(e.target.value)} data-testid="select-product-type">
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="p-cat" label="Kategori" help="Bestämmer var produkten visas i butikens meny.">
              <select
                id="p-cat"
                className="pf-input"
                value={form.subcategory}
                onChange={(e) => {
                  // Väljs en kategori från en annan typ (via "Visa alla") följer typen med.
                  const parent = getSubcategory(e.target.value)?.parent;
                  const k = kindForCategory(parent);
                  const t = TYPES.find((x) => x.value === k);
                  if (!t) return set('subcategory', e.target.value);
                  setForm({
                    ...form,
                    subcategory: e.target.value,
                    productType: t.value,
                    vat: t.food ? 'vat-food' : 'vat-standard',
                    deposit: t.def.fields.deposit ? form.deposit : false,
                    sizeGuide: t.def.fields.sizeGuide ? (form.sizeGuide || (/sko/.test(e.target.value) ? 'skor' : 'klader')) : '',
                  });
                }}
                data-testid="select-product-category"
              >
                <option value="">Välj en kategori</option>
                {visibleCats.map((c) => (
                  <optgroup key={c.slug} label={c.name}>
                    {subcategoriesOf(c.slug).map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            </div>
            <label className="pf-toggle pf-toggle--small">
              <input type="checkbox" checked={showAllCats} onChange={(e) => setShowAllCats(e.target.checked)} data-testid="check-show-all-categories" /> Visa kategorier för alla produkttyper
            </label>
          </Card>

          <MediaPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            already={form.images.map((i) => i.src)}
            onPick={(picked) => set('images', [...form.images, ...picked.map((m) => ({ src: m.src, alt: m.alt || form.name }))])}
          />

          {!hasVariants && (
            <Card title="Pris och lager">
              <div className="pf-row">
                <Field id="p-price" label="Pris">
                  <div className="pf-affix">
                    <input id="p-price" className="pf-input" type="number" min={0} inputMode="decimal" value={form.variants[0].price || ''} placeholder="0" onChange={(e) => setVariant(0, { price: Number(e.target.value) })} data-testid="input-product-price" />
                    <span>kr</span>
                  </div>
                </Field>
                <Field id="p-stock" label="Antal i lager">
                  <input id="p-stock" className="pf-input" type="number" min={0} value={form.variants[0].stock} onChange={(e) => setVariant(0, { stock: Math.max(0, Math.round(Number(e.target.value))) })} data-testid="input-product-stock" />
                </Field>
                <Field id="p-ean" label="Streckkod (EAN)">
                  <input id="p-ean" className="pf-input" inputMode="numeric" value={form.variants[0].ean} onChange={(e) => setVariant(0, { ean: e.target.value.replace(/\D/g, '') })} />
                </Field>
              </div>
              <p className="pf-help">Priset anges inklusive moms.</p>
            </Card>
          )}

          <Card title="Varianter">
            {legacy ? (
              <p className="pf-help">Den här produkten har smak och förpackning. Ändra pris och lager per variant i tabellen.</p>
            ) : optionDraft.length === 0 ? (
              <button
                type="button"
                className="pf-add"
                onClick={() => setOptionDraft([{ name: tf.sizeGuide ? 'Storlek' : 'Smak', values: [], input: '' }])}
                data-testid="check-has-variants"
              >
                ＋ Lägg till alternativ som storlek, färg eller smak
              </button>
            ) : (
              <div className="pf-options">
                {optionDraft.map((o, i) => (
                  <div className="pf-option" key={i}>
                    <div className="pf-option-head">
                      <Field id={`opt-name-${i}`} label="Alternativ">
                        <input
                          id={`opt-name-${i}`}
                          className="pf-input"
                          value={o.name}
                          placeholder="T.ex. Storlek"
                          onChange={(e) => setOptionDraft(optionDraft.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                          onBlur={() => applyOptions(optionDraft)}
                          data-testid={`input-option-name-${i}`}
                        />
                      </Field>
                      <button type="button" className="pf-link danger" onClick={() => applyOptions(optionDraft.filter((_, j) => j !== i))} aria-label={`Ta bort alternativet ${o.name}`}>
                        Ta bort
                      </button>
                    </div>
                    <div className="pf-field">
                      <label htmlFor={`opt-values-${i}`}>Val</label>
                      <div className="pf-chips">
                        {o.values.map((v) => (
                          <span key={v} className="pf-chip">
                            {v}
                            <button type="button" aria-label={`Ta bort ${v}`} onClick={() => applyOptions(optionDraft.map((x, j) => (j === i ? { ...x, values: x.values.filter((y) => y !== v) } : x)))}>
                              ✕
                            </button>
                          </span>
                        ))}
                        <input
                          id={`opt-values-${i}`}
                          className="pf-chip-input"
                          value={o.input}
                          placeholder={o.values.length ? 'Lägg till fler …' : 'Skriv ett val och tryck Enter, t.ex. S'}
                          onChange={(e) => setOptionDraft(optionDraft.map((x, j) => (j === i ? { ...x, input: e.target.value } : x)))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              addValue(i);
                            }
                          }}
                          onBlur={() => addValue(i)}
                          data-testid={`input-option-values-${i}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {optionDraft.length < 3 && (
                  <button type="button" className="pf-add small" onClick={() => setOptionDraft([...optionDraft, { name: optionDraft.length === 1 && tf.sizeGuide ? 'Färg' : '', values: [], input: '' }])}>
                    ＋ Lägg till ett alternativ till
                  </button>
                )}
              </div>
            )}

            {hasVariants && (
              <>
                <div className="pf-table-wrap">
                  <table className="pf-table" data-testid="table-variants">
                    <thead>
                      <tr>
                        <th scope="col">Variant</th>
                        <th scope="col">Pris</th>
                        <th scope="col">I lager</th>
                        <th scope="col">Streckkod</th>
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
                              <div className="pf-affix">
                                <input className="pf-input" type="number" min={0} inputMode="decimal" aria-label={`Pris för ${label}`} value={v.price || ''} placeholder="0" onChange={(e) => setVariant(i, { price: Number(e.target.value) })} data-testid={`input-variant-price-${i}`} />
                                <span>kr</span>
                              </div>
                            </td>
                            <td>
                              <input className="pf-input" type="number" min={0} aria-label={`Lager för ${label}`} value={v.stock} onChange={(e) => setVariant(i, { stock: Math.max(0, Math.round(Number(e.target.value))) })} data-testid={`input-variant-stock-${i}`} />
                            </td>
                            <td>
                              <input className="pf-input" inputMode="numeric" aria-label={`Streckkod för ${label}`} value={v.ean} onChange={(e) => setVariant(i, { ean: e.target.value.replace(/\D/g, '') })} />
                            </td>
                            <td className="pf-center">
                              <input type="checkbox" className="pf-check" aria-label={`${label} säljs`} checked={v.offered} onChange={(e) => setVariant(i, { offered: e.target.checked })} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {form.variants.length > 1 && (
                  <button type="button" className="pf-link" onClick={() => set('variants', form.variants.map((v) => ({ ...v, price: form.variants[0].price })))}>
                    Använd första radens pris på alla varianter
                  </button>
                )}
              </>
            )}
          </Card>

          <Card
            title={type.food ? 'Innehåll och märkning' : `${tf.contents === 'material' ? 'Material' : 'Innehåll'}${tf.usage === 'care' ? ', skötsel' : tf.usage === 'usage' ? ' och användning' : ''}${tf.sizeGuide ? ' och storlek' : ''}`}
            action={
              <button type="button" className="pf-link" onClick={() => setShowMore((s) => !s)} aria-expanded={showMore} data-testid="button-toggle-more">
                {showMore ? 'Dölj' : 'Visa'}
              </button>
            }
          >
            {!showMore ? (
              <p className="pf-help">
                {type.food
                  ? 'Ingredienser, näringsvärde, användning och varningstexter. Ska stämma med förpackningen.'
                  : 'Fälten som typen ' + type.label + ' har, och fakta som mått och vikt.'}
              </p>
            ) : (
              <>
                {type.food && (
                  <>
                    <Field id="p-usage" label="Användning och dosering">
                      <textarea id="p-usage" className="pf-input" rows={3} value={form.usage} onChange={(e) => set('usage', e.target.value)} />
                    </Field>
                    <Field id="p-ingr" label="Ingredienser" help="Skriv som på förpackningen.">
                      <textarea id="p-ingr" className="pf-input" rows={3} value={form.ingredients} onChange={(e) => set('ingredients', e.target.value)} />
                    </Field>
                    <div className="pf-row two">
                      {tf.allergens && <Field id="p-allergens" label="Allergener" help="Tryck Enter eller komma efter varje. Visas i fetstil i ingredienserna.">
                        <ChipInput id="p-allergens" values={form.allergens} onChange={(v) => set('allergens', v)} placeholder="T.ex. mjölk" testId="input-product-allergens" />
                      </Field>}
                      {tf.warnings && <Field id="p-warn" label="Varningstexter" help="En per rad.">
                        <LinesInput id="p-warn" values={form.warnings} onChange={(v) => set('warnings', v)} />
                      </Field>}
                    </div>
                    {tf.nutrition && <div className="pf-field">
                      <span className="pf-label">Näringsvärde</span>
                      {form.nutrition?.rows.length ? (
                        <div className="pf-table-wrap">
                          <table className="pf-table">
                            <thead>
                              <tr>
                                <th scope="col">Näringsämne</th>
                                <th scope="col">Per 100 g/ml</th>
                                <th scope="col">
                                  <input className="pf-input" aria-label="Rubrik för portion" value={form.nutrition.servingLabel ?? ''} placeholder="Per portion" onChange={(e) => set('nutrition', { ...form.nutrition!, servingLabel: e.target.value })} />
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
                                      <input className="pf-input" aria-label="Näringsämne" value={r.label} onChange={(e) => upd({ label: e.target.value })} />
                                    </td>
                                    <td>
                                      <input className="pf-input" aria-label={`${r.label} per 100`} value={r.per100} onChange={(e) => upd({ per100: e.target.value })} />
                                    </td>
                                    <td>
                                      <input className="pf-input" aria-label={`${r.label} per portion`} value={r.perServing ?? ''} onChange={(e) => upd({ perServing: e.target.value })} />
                                    </td>
                                    <td>
                                      <button type="button" className="pf-icon" aria-label={`Ta bort ${r.label}`} onClick={() => set('nutrition', { ...form.nutrition!, rows: form.nutrition!.rows.filter((_, j) => j !== i) })}>
                                        ✕
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                      <div className="pf-inline">
                        {!form.nutrition?.rows.length ? (
                          <button
                            type="button"
                            className="pf-add small"
                            onClick={() =>
                              set('nutrition', {
                                servingLabel: 'Per portion',
                                rows: ['Energi', 'Fett', '– varav mättat fett', 'Kolhydrat', '– varav sockerarter', 'Protein', 'Salt'].map((label) => ({ label, per100: '', perServing: '' })),
                              })
                            }
                          >
                            ＋ Lägg till näringstabell
                          </button>
                        ) : (
                          <button type="button" className="pf-link" onClick={() => set('nutrition', { ...form.nutrition!, rows: [...form.nutrition!.rows, { label: '', per100: '', perServing: '' }] })}>
                            ＋ Lägg till rad
                          </button>
                        )}
                      </div>
                    </div>}
                  </>
                )}
                {!type.food && (
                  <>
                    {tf.contents !== 'off' && (
                      <Field id="p-contents" label={tf.contents === 'material' ? 'Material' : tf.contents === 'inci' ? 'Innehåll (INCI)' : 'Ingredienser'} help={tf.contents === 'material' ? 'T.ex. 88 % polyester, 12 % elastan.' : 'Skriv som på förpackningen.'}>
                        <textarea id="p-contents" className="pf-input" rows={2} value={form.ingredients} onChange={(e) => set('ingredients', e.target.value)} data-testid="input-product-material" />
                      </Field>
                    )}
                    {tf.usage !== 'off' && (
                      <Field id="p-usage2" label={tf.usage === 'care' ? 'Skötselråd' : 'Användning'} help={tf.usage === 'care' ? 'T.ex. Tvättas i 40 °C. Torktumla inte.' : undefined}>
                        <textarea id="p-usage2" className="pf-input" rows={2} value={form.usage} onChange={(e) => set('usage', e.target.value)} data-testid="input-product-care" />
                      </Field>
                    )}
                    {tf.warnings && (
                      <Field id="p-warn2" label="Varningstexter" help="En per rad.">
                        <LinesInput id="p-warn2" values={form.warnings} onChange={(v) => set('warnings', v)} />
                      </Field>
                    )}
                  </>
                )}
                {tf.sizeGuide && (
                  <Field id="p-sizeguide" label="Storleksguide" help="Visas som en länk vid storleksvalet på produktsidan.">
                    <select id="p-sizeguide" className="pf-input" value={form.sizeGuide ?? ''} onChange={(e) => set('sizeGuide', e.target.value as Form['sizeGuide'])} data-testid="select-product-sizeguide">
                      <option value="">Ingen storleksguide</option>
                      <option value="klader">Kläder (bröst, midja, höft)</option>
                      <option value="skor">Skor (EU, UK, US, fotlängd)</option>
                    </select>
                  </Field>
                )}
                <div className="pf-field">
                  <span className="pf-label">Fakta</span>
                  {form.facts.map((fct, i) => (
                    <div className="pf-fact" key={i}>
                      <input className="pf-input" aria-label="Egenskap" placeholder="T.ex. Material" value={fct.label} onChange={(e) => set('facts', form.facts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                      <input className="pf-input" aria-label="Värde" placeholder="T.ex. 100 % bomull" value={fct.value} onChange={(e) => set('facts', form.facts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                      <button type="button" className="pf-icon" aria-label="Ta bort raden" onClick={() => set('facts', form.facts.filter((_, j) => j !== i))}>
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="pf-inline">
                    <button type="button" className="pf-link" onClick={() => set('facts', [...form.facts, { label: '', value: '' }])}>
                      ＋ Lägg till fakta
                    </button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        <aside className="pf-side">
          <Card title="Status">
            <select className="pf-input" aria-label="Status" value={form.status} onChange={(e) => set('status', e.target.value as Status)} data-testid="select-product-status">
              <option value="draft">Utkast</option>
              <option value="published">Aktiv</option>
              <option value="archived">Arkiverad</option>
            </select>
            <p className="pf-help">
              {form.status === 'published' ? 'Syns i butiken när du sparat.' : form.status === 'archived' ? 'Dold i butiken och i vanliga listor.' : 'Dold i butiken tills du väljer Aktiv.'}
            </p>
            {form.status === 'published' && missing.length > 0 && (
              <div className="pf-missing" data-testid="publish-checklist">
                <strong>Fyll i innan den kan bli aktiv:</strong>
                <ul>
                  {missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card title="Produktorganisation">
            <Field id="p-brand" label="Varumärke">
              <select
                id="p-brand"
                className="pf-input"
                value={form.brandId}
                onChange={(e) => (e.target.value === '__new' ? setBrandDialog(true) : set('brandId', e.target.value))}
                data-testid="select-product-brand"
              >
                <option value="">Välj varumärke</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
                <option value="__new">＋ Skapa nytt varumärke …</option>
              </select>
            </Field>
            <Field id="p-size" label="Storlek eller mängd" help="T.ex. 500 g, 60 kapslar, 330 ml.">
              <input id="p-size" className="pf-input" value={form.sizeLabel} onChange={(e) => set('sizeLabel', e.target.value)} />
            </Field>
            <div className="pf-field">
              <span className="pf-label">Moms</span>
              <p className="pf-vat" data-testid="text-product-vat">
                {type.def.vat === 'vat-food' ? 'Livsmedelsmoms (6 % till och med 2027, sedan 12 %)' : 'Normalmoms 25 %'}
              </p>
              <p className="pf-help">Följer produkttypen automatiskt. Livsmedel, alkoholfria drycker och kosttillskott har lägre moms.</p>
            </div>
            {tf.deposit && (
              <label className="pf-toggle">
                <input type="checkbox" checked={form.deposit} onChange={(e) => set('deposit', e.target.checked)} /> Pant, 1 kr per burk
              </label>
            )}
            <label className="pf-toggle">
              <input type="checkbox" checked={form.isNew} onChange={(e) => set('isNew', e.target.checked)} /> Visa som nyhet
            </label>
          </Card>

          <Card title="Förhandsvisning" className="pf-preview-card">
            <div className="pf-preview">
              <div className="pf-preview-media">
                {form.images[0] ? <img src={form.images[0].src} alt="" /> : legacy && form.variants[0]?.flavour ? <PwoCan flavour={form.variants[0].flavour} label="" /> : <span>Ingen bild</span>}
                {form.isNew && <span className="pf-preview-badge">Nyhet</span>}
              </div>
              <p className="pf-preview-brand">{brand?.name ?? 'Varumärke'}</p>
              <p className="pf-preview-name">{form.name || 'Titel'}</p>
              <p className="pf-preview-tag">{form.tagline || form.sizeLabel || ' '}</p>
              <p className="pf-preview-price">{prices.length ? `${new Set(prices).size > 1 ? 'från ' : ''}${kr(Math.min(...prices))}` : '– kr'}</p>
              <p className="pf-help">{sub ? `${getCategory(sub.parent)?.name} › ${sub.name}` : 'Ingen kategori vald'}</p>
            </div>
          </Card>

          {form.id && (
            <Card title="Fler åtgärder">
              <div className="pf-side-actions">
                <button type="button" className="pf-link" onClick={duplicate} data-testid="button-duplicate-product">
                  Kopiera produkten
                </button>
                {savedStatus !== 'published' && !form.hasOrders && (
                  <button type="button" className={`pf-link danger${confirmDelete ? ' confirm' : ''}`} onClick={remove} data-testid="button-delete-product">
                    {confirmDelete ? 'Klicka igen för att ta bort för gott' : 'Ta bort produkten'}
                  </button>
                )}
                {savedStatus === 'published' && <p className="pf-help">En aktiv produkt måste göras till utkast eller arkiveras innan den kan tas bort.</p>}
                {form.hasOrders && <p className="pf-help">Produkten finns på ordrar och kan bara arkiveras.</p>}
              </div>
            </Card>
          )}
        </aside>
      </div>

      <BrandDialog
        open={brandDialog}
        onClose={() => setBrandDialog(false)}
        onCreated={(b) => {
          setBrands((list) => [...list, b].sort((x, y) => x.name.localeCompare(y.name, 'sv')));
          set('brandId', b.id);
        }}
      />

      <div className={`pf-savebar${dirty ? ' is-dirty' : ''}`}>
        <p role="status" className={`pf-savebar-msg ${status.kind}`} data-testid="status-product-save">
          {status.kind === 'saving'
            ? 'Sparar …'
            : confirmLeave
              ? 'Osparade ändringar. Klicka ← igen för att lämna utan att spara.'
              : status.text ?? (dirty ? 'Osparade ändringar' : form.id ? 'Allt är sparat' : 'Ny produkt – inget är sparat än')}
        </p>
        <div className="pf-savebar-actions">
          {dirty && form.id && (
            <button type="button" className="pf-btn ghost" onClick={() => setForm(JSON.parse(base))}>
              Ångra
            </button>
          )}
          <button type="button" className="pf-btn primary" onClick={save} disabled={status.kind === 'saving' || (!dirty && Boolean(form.id))} data-testid="button-save-product">
            Spara
          </button>
        </div>
      </div>
    </div>
  );
}
