import { useEffect, useState } from 'react';
import { replaceCategories } from '@/data/categories';
import { CONTENTS_LABEL, replaceProductTypes, USAGE_LABEL, type ProductTypeDef, type ProductTypeFields } from '@/data/productTypes';
import type { Category, Subcategory } from '@/data/types';
import { MediaPicker, uploadImage } from './mediaViews';

/**
 * Admin → Katalog → Produkttyper och fält, och Kategorier.
 * Allt sparas i databasen och syns direkt i butiken och i produktformuläret.
 */

const api = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api${path}`;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

type TypeRow = ProductTypeDef & { products: number; categories: number };
type CatRow = Category & { products: number };
type SubRow = Subcategory & { products: number };
type Taxonomy = { productTypes: TypeRow[]; categories: CatRow[]; subcategories: SubRow[] };

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(api(path), { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Något gick fel.');
  return data;
}

function useTaxonomy() {
  const [data, setData] = useState<Taxonomy | null>(null);
  const [error, setError] = useState('');
  const load = () =>
    fetch(api('/admin/taxonomy'))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Taxonomy) => {
        setData(d);
        // Produktformuläret och menyn i Admin använder de nya listorna direkt.
        replaceProductTypes(d.productTypes);
        replaceCategories(d.categories, d.subcategories);
      })
      .catch(() => setError('Kunde inte hämta produkttyper och kategorier. Kontrollera att servern är igång.'));
  useEffect(() => {
    load();
  }, []);
  return { data, error, reload: load };
}

const vatLabel = (v: string) => (v === 'vat-food' ? 'Livsmedelsmoms (6 %)' : 'Normalmoms 25 %');

function Message({ msg }: { msg: { kind: 'ok' | 'error'; text: string } | null }) {
  if (!msg) return null;
  return (
    <p className={`admin-inline-message ${msg.kind === 'error' ? 'is-error' : ''}`} role={msg.kind === 'error' ? 'alert' : 'status'}>
      {msg.text}
    </p>
  );
}

// ======================================================================= Produkttyper

const emptyFields: ProductTypeFields = { usage: 'usage', contents: 'material', allergens: false, nutrition: false, warnings: false, sizeGuide: false, deposit: false, supplementWarning: false };

function TypeEditor({ initial, onSave, onCancel, templates }: { initial: { name: string; vat: ProductTypeDef['vat']; fields: ProductTypeFields }; onSave: (v: typeof initial) => Promise<void>; onCancel: () => void; templates?: TypeRow[] }) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const f = v.fields;
  const setF = (patch: Partial<ProductTypeFields>) => setV({ ...v, fields: { ...f, ...patch } });
  const check = (key: keyof ProductTypeFields, label: string, hint: string) => (
    <label className="admin-toggle-row type-check">
      <input type="checkbox" checked={Boolean(f[key])} onChange={(e) => setF({ [key]: e.target.checked } as Partial<ProductTypeFields>)} data-testid={`check-type-${key}`} />
      <span>
        {label}
        <small>{hint}</small>
      </span>
    </label>
  );
  return (
    <div className="type-editor">
      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor="type-name">Namn</label>
          <input id="type-name" className="admin-control" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="T.ex. Receptfria läkemedel" data-testid="input-type-name" />
        </div>
        <div className="admin-field">
          <label htmlFor="type-vat">Moms</label>
          <select id="type-vat" className="admin-control" value={v.vat} onChange={(e) => setV({ ...v, vat: e.target.value as ProductTypeDef['vat'] })} data-testid="select-type-vat">
            <option value="vat-standard">Normalmoms 25 % (kläder, utrustning, kroppsvård, läkemedel)</option>
            <option value="vat-food">Livsmedelsmoms (mat, alkoholfri dryck, kosttillskott)</option>
          </select>
        </div>
        {templates && templates.length > 0 && (
          <div className="admin-field span-2">
            <label htmlFor="type-template">Utgå från en befintlig typ (valfritt)</label>
            <select
              id="type-template"
              className="admin-control"
              defaultValue=""
              onChange={(e) => {
                const t = templates.find((x) => x.id === e.target.value);
                if (t) setV({ ...v, vat: t.vat, fields: { ...t.fields } });
              }}
            >
              <option value="">Välj typ att kopiera fälten från …</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="admin-field">
          <label htmlFor="type-contents">Innehåll</label>
          <select id="type-contents" className="admin-control" value={f.contents} onChange={(e) => setF({ contents: e.target.value as ProductTypeFields['contents'] })}>
            <option value="ingredients">Ingredienser (mat och dryck)</option>
            <option value="material">Material (kläder, utrustning)</option>
            <option value="inci">Innehåll INCI (kroppsvård)</option>
            <option value="off">Inget innehållsfält</option>
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="type-usage">Användning</label>
          <select id="type-usage" className="admin-control" value={f.usage} onChange={(e) => setF({ usage: e.target.value as ProductTypeFields['usage'] })}>
            <option value="usage">Användning och dosering</option>
            <option value="care">Skötselråd (kläder)</option>
            <option value="off">Inget fält</option>
          </select>
        </div>
      </div>
      <div className="type-checks">
        {check('allergens', 'Allergener', 'Markeras i fetstil i ingredienserna.')}
        {check('nutrition', 'Näringsvärde', 'Tabell med energi, fett, protein …')}
        {check('warnings', 'Varningstexter', 'T.ex. hög koffeinhalt eller läs bipacksedeln.')}
        {check('sizeGuide', 'Storleksguide', 'Länk vid storleksvalet.')}
        {check('deposit', 'Pant', 'Kan väljas på produkten, t.ex. burkar.')}
        {check('supplementWarning', 'Lagtext för kosttillskott', 'Visas automatiskt på produktsidan.')}
      </div>
      <div className="admin-actions">
        <button
          type="button"
          className="admin-btn primary small"
          disabled={busy || !v.name.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await onSave(v);
            } finally {
              setBusy(false);
            }
          }}
          data-testid="button-save-type"
        >
          Spara
        </button>
        <button type="button" className="admin-btn small" onClick={onCancel}>
          Avbryt
        </button>
      </div>
    </div>
  );
}

function fieldSummary(t: ProductTypeDef) {
  const f = t.fields;
  return [
    f.contents !== 'off' ? CONTENTS_LABEL[f.contents].replace(' och näringsvärde', '') : '',
    f.usage !== 'off' ? USAGE_LABEL[f.usage] : '',
    f.allergens ? 'Allergener' : '',
    f.nutrition ? 'Näringsvärde' : '',
    f.warnings ? 'Varningar' : '',
    f.sizeGuide ? 'Storleksguide' : '',
    f.deposit ? 'Pant' : '',
    f.supplementWarning ? 'Lagtext kosttillskott' : '',
  ].filter(Boolean);
}

export function ProductTypesAdminView({ go }: { go: (path: string) => void }) {
  const { data, error, reload } = useTaxonomy();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  if (error) return <div className="admin-inline-message" role="alert">{error}</div>;
  if (!data) return <p>Laddar …</p>;

  const save = async (id: string | null, v: { name: string; vat: ProductTypeDef['vat']; fields: ProductTypeFields }) => {
    try {
      if (id) await call('PUT', `/admin/product-types/${id}`, v);
      else await call('POST', '/admin/product-types', v);
      setMsg({ kind: 'ok', text: id ? `${v.name} sparad.` : `${v.name} skapad. Koppla den till en kategori under Kategorier.` });
      setEditing(null);
      await reload();
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    }
  };
  const remove = async (t: TypeRow) => {
    if (confirmDelete !== t.id) return setConfirmDelete(t.id);
    try {
      await call('DELETE', `/admin/product-types/${t.id}`);
      setMsg({ kind: 'ok', text: `${t.name} borttagen.` });
      await reload();
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    }
    setConfirmDelete(null);
  };

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">Katalog</p>
          <h1>Produkttyper och fält</h1>
          <p>
            Typen bestämmer momsen och vilka fält produkten har. Varje huvudkategori har en typ, och nya produkter får kategorins typ.{' '}
            <button type="button" className="admin-link-btn" onClick={() => go('/admin/kategorier')}>
              Till Kategorier
            </button>
          </p>
        </div>
        <button type="button" className="admin-btn primary" onClick={() => setEditing('new')} disabled={editing === 'new'} data-testid="button-new-type">
          ＋ Ny produkttyp
        </button>
      </div>
      <Message msg={msg} />
      {editing === 'new' && (
        <section className="admin-panel">
          <header className="admin-panel-head">
            <div>
              <h2>Ny produkttyp</h2>
            </div>
          </header>
          <div className="admin-panel-body">
            <TypeEditor initial={{ name: '', vat: 'vat-standard', fields: emptyFields }} templates={data.productTypes} onSave={(v) => save(null, v)} onCancel={() => setEditing(null)} />
          </div>
        </section>
      )}
      <ul className="type-list">
        {data.productTypes.map((t) => (
          <li key={t.id} className={`admin-panel type-row${editing === t.id ? ' is-open' : ''}`} data-testid={`type-${t.id}`}>
            <div className="type-row-head">
              <div>
                <p className="type-name">
                  {t.name} {t.builtIn && <span className="faq-admin-cat">Standard</span>}
                </p>
                <p className="type-meta">
                  <span className={`tax-badge ${t.vat === 'vat-food' ? '' : 'tax-badge--future'}`}>{vatLabel(t.vat)}</span> {t.products} produkter · {t.categories} kategorier
                </p>
                <p className="type-fields">
                  {fieldSummary(t).map((x) => (
                    <span key={x} className="faq-admin-cat">
                      {x}
                    </span>
                  ))}
                </p>
              </div>
              <div className="admin-actions">
                <button type="button" className="admin-btn small" onClick={() => setEditing(editing === t.id ? null : t.id)} data-testid={`button-edit-type-${t.id}`}>
                  {editing === t.id ? 'Stäng' : 'Ändra'}
                </button>
                {!t.builtIn && (
                  <button type="button" className="admin-btn small danger" onClick={() => remove(t)} data-testid={`button-delete-type-${t.id}`}>
                    {confirmDelete === t.id ? 'Klicka igen' : 'Ta bort'}
                  </button>
                )}
              </div>
            </div>
            {editing === t.id && (
              <div className="admin-panel-body">
                <TypeEditor initial={{ name: t.name, vat: t.vat, fields: { ...t.fields } }} onSave={(v) => save(t.id, v)} onCancel={() => setEditing(null)} />
                {t.products > 0 && <p className="admin-field-hint">Ändrar du momsen rättas den på typens {t.products} produkter direkt. Redan lagda ordrar påverkas inte.</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

// ======================================================================= Kategorier

type CatForm = { name: string; parent: string | null; productType: string | null; short: string; intro: string; image: string; imageAlt: string; hidden: boolean };

function CategoryEditor({ initial, isMain, types, onSave, onCancel }: { initial: CatForm; isMain: boolean; types: TypeRow[]; onSave: (v: CatForm) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  return (
    <div className="admin-form-grid cat-editor">
      <div className="admin-field">
        <label htmlFor="cat-name">Namn</label>
        <input id="cat-name" className="admin-control" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} data-testid="input-cat-name" />
      </div>
      {isMain ? (
        <div className="admin-field">
          <label htmlFor="cat-type">Produkttyp</label>
          <select id="cat-type" className="admin-control" value={v.productType ?? ''} onChange={(e) => setV({ ...v, productType: e.target.value || null })} data-testid="select-cat-type">
            <option value="">Välj typ …</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {vatLabel(t.vat)}
              </option>
            ))}
          </select>
          <span className="admin-field-hint">Nya produkter i kategorin får den här typen, och därmed moms och fält.</span>
        </div>
      ) : (
        <div className="admin-field">
          <span className="admin-field-hint">Underkategorier följer huvudkategorins produkttyp.</span>
        </div>
      )}
      {isMain && (
        <div className="admin-field span-2">
          <label htmlFor="cat-short">Kort text</label>
          <input id="cat-short" className="admin-control" value={v.short} onChange={(e) => setV({ ...v, short: e.target.value })} placeholder="T.ex. Protein, kreatin, vitaminer och mer." />
        </div>
      )}
      <div className="admin-field span-2">
        <label htmlFor="cat-intro">Text överst på kategorisidan</label>
        <textarea id="cat-intro" className="admin-control" rows={2} value={v.intro} onChange={(e) => setV({ ...v, intro: e.target.value })} />
      </div>
      {isMain && (
        <div className="admin-field span-2">
          <span className="admin-label">Bild för kategorirutan (valfri)</span>
          <div className="cat-image">
            {v.image ? <img src={v.image.startsWith('/') ? base + v.image : v.image} alt="" /> : <span className="cat-image-empty">Ingen bild – en produktbild används</span>}
            <div className="admin-actions">
              <button type="button" className="admin-btn small" onClick={() => setPicker(true)}>
                Välj bild
              </button>
              <label className="admin-btn small">
                {uploading ? 'Laddar upp …' : 'Ladda upp'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    try {
                      const item = await uploadImage(file, v.name);
                      setV((cur) => ({ ...cur, image: item.src, imageAlt: cur.imageAlt || cur.name }));
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </label>
              {v.image && (
                <button type="button" className="admin-btn small" onClick={() => setV({ ...v, image: '', imageAlt: '' })}>
                  Ta bort bild
                </button>
              )}
            </div>
          </div>
          <MediaPicker open={picker} onClose={() => setPicker(false)} already={[]} onPick={(items) => items[0] && setV({ ...v, image: items[0].src, imageAlt: items[0].alt || v.name })} />
        </div>
      )}
      <label className="admin-toggle-row span-2">
        <input type="checkbox" checked={!v.hidden} onChange={(e) => setV({ ...v, hidden: !e.target.checked })} data-testid="check-cat-visible" /> Visas i butikens meny
      </label>
      <div className="admin-actions span-2">
        <button
          type="button"
          className="admin-btn primary small"
          disabled={busy || !v.name.trim() || (isMain && !v.productType)}
          onClick={async () => {
            setBusy(true);
            try {
              await onSave(v);
            } finally {
              setBusy(false);
            }
          }}
          data-testid="button-save-cat"
        >
          Spara
        </button>
        <button type="button" className="admin-btn small" onClick={onCancel}>
          Avbryt
        </button>
      </div>
    </div>
  );
}

export function CategoriesAdminView({ go }: { go: (path: string) => void }) {
  const { data, error, reload } = useTaxonomy();
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  if (error) return <div className="admin-inline-message" role="alert">{error}</div>;
  if (!data) return <p>Laddar …</p>;
  const typeName = (id?: string) => data.productTypes.find((t) => t.id === id)?.name ?? 'Ingen typ';
  const typeVat = (id?: string) => data.productTypes.find((t) => t.id === id)?.vat;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      setMsg({ kind: 'ok', text: ok });
      setEditing(null);
      setConfirmDelete(null);
      await reload();
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    }
  };
  const remove = (slug: string, name: string) => {
    if (confirmDelete !== slug) return setConfirmDelete(slug);
    run(() => call('DELETE', `/admin/categories/${slug}`), `${name} borttagen.`);
  };
  const formFor = (c?: CatRow | SubRow, parent: string | null = null): CatForm => ({
    name: c?.name ?? '',
    parent,
    productType: c && 'productType' in c ? c.productType ?? null : null,
    short: c && 'short' in c ? c.short : '',
    intro: c?.intro ?? '',
    image: c && 'image' in c ? c.image ?? '' : '',
    imageAlt: c && 'imageAlt' in c ? c.imageAlt ?? '' : '',
    hidden: Boolean(c?.hidden),
  });

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">Katalog</p>
          <h1>Kategorier</h1>
          <p>
            Butikens meny. Varje huvudkategori har en produkttyp som styr moms och fält.{' '}
            <button type="button" className="admin-link-btn" onClick={() => go('/admin/produkttyper')}>
              Produkttyper och fält
            </button>
          </p>
        </div>
        <button type="button" className="admin-btn primary" onClick={() => setEditing('new-main')} disabled={editing === 'new-main'} data-testid="button-new-category">
          ＋ Ny huvudkategori
        </button>
      </div>
      <Message msg={msg} />
      {editing === 'new-main' && (
        <section className="admin-panel">
          <header className="admin-panel-head">
            <div>
              <h2>Ny huvudkategori</h2>
            </div>
          </header>
          <div className="admin-panel-body">
            <CategoryEditor initial={formFor()} isMain types={data.productTypes} onSave={(v) => run(() => call('POST', '/admin/categories', v), `${v.name} skapad.`)} onCancel={() => setEditing(null)} />
          </div>
        </section>
      )}
      <ol className="cat-tree">
        {data.categories.map((c, i) => {
          const subs = data.subcategories.filter((sc) => sc.parent === c.slug);
          const isOpen = open === c.slug;
          return (
            <li key={c.slug} className={`admin-panel cat-node${c.hidden ? ' is-hidden' : ''}`} data-testid={`cat-${c.slug}`}>
              <div className="cat-node-head">
                <button type="button" className="home-block-toggle" onClick={() => setOpen(isOpen ? null : c.slug)} aria-expanded={isOpen}>
                  <span className="cat-node-arrow">{isOpen ? '▾' : '▸'}</span>
                  <span className="home-block-name">{c.name}</span>
                  <span className={`tax-badge ${typeVat(c.productType) === 'vat-food' ? '' : 'tax-badge--future'}`}>{typeName(c.productType)}</span>
                  <span className="admin-field-hint">
                    {subs.length} underkategorier · {c.products} produkter
                  </span>
                  {c.hidden && <span className="faq-admin-cat faq-admin-cat--hidden">Dold</span>}
                </button>
                <div className="admin-actions">
                  <button type="button" className="admin-btn small" onClick={() => run(() => call('POST', `/admin/categories/${c.slug}/move`, { dir: -1 }), 'Ordningen sparad.')} disabled={i === 0} aria-label={`Flytta ${c.name} upp`}>
                    ↑
                  </button>
                  <button type="button" className="admin-btn small" onClick={() => run(() => call('POST', `/admin/categories/${c.slug}/move`, { dir: 1 }), 'Ordningen sparad.')} disabled={i === data.categories.length - 1} aria-label={`Flytta ${c.name} ner`}>
                    ↓
                  </button>
                  <button type="button" className="admin-btn small" onClick={() => setEditing(editing === c.slug ? null : c.slug)} data-testid={`button-edit-cat-${c.slug}`}>
                    Ändra
                  </button>
                  <button type="button" className="admin-btn small danger" onClick={() => remove(c.slug, c.name)}>
                    {confirmDelete === c.slug ? 'Klicka igen' : '✕'}
                  </button>
                </div>
              </div>
              {editing === c.slug && (
                <div className="admin-panel-body">
                  <CategoryEditor initial={formFor(c)} isMain types={data.productTypes} onSave={(v) => run(() => call('PUT', `/admin/categories/${c.slug}`, v), `${v.name} sparad.`)} onCancel={() => setEditing(null)} />
                </div>
              )}
              {isOpen && (
                <div className="cat-subs">
                  <ol>
                    {subs.map((sc, j) => (
                      <li key={sc.slug} className={sc.hidden ? 'is-hidden' : ''}>
                        <div className="cat-sub-head">
                          <span className="home-block-name">{sc.name}</span>
                          <span className="admin-field-hint">
                            /kategori/{sc.slug} · {sc.products} produkter
                          </span>
                          {sc.hidden && <span className="faq-admin-cat faq-admin-cat--hidden">Dold</span>}
                          <div className="admin-actions">
                            <button type="button" className="admin-btn small" onClick={() => run(() => call('POST', `/admin/categories/${sc.slug}/move`, { dir: -1 }), 'Ordningen sparad.')} disabled={j === 0} aria-label={`Flytta ${sc.name} upp`}>
                              ↑
                            </button>
                            <button type="button" className="admin-btn small" onClick={() => run(() => call('POST', `/admin/categories/${sc.slug}/move`, { dir: 1 }), 'Ordningen sparad.')} disabled={j === subs.length - 1} aria-label={`Flytta ${sc.name} ner`}>
                              ↓
                            </button>
                            <button type="button" className="admin-btn small" onClick={() => setEditing(editing === sc.slug ? null : sc.slug)} data-testid={`button-edit-cat-${sc.slug}`}>
                              Ändra
                            </button>
                            <button type="button" className="admin-btn small danger" onClick={() => remove(sc.slug, sc.name)}>
                              {confirmDelete === sc.slug ? 'Klicka igen' : '✕'}
                            </button>
                          </div>
                        </div>
                        {editing === sc.slug && (
                          <CategoryEditor initial={formFor(sc, c.slug)} isMain={false} types={data.productTypes} onSave={(v) => run(() => call('PUT', `/admin/categories/${sc.slug}`, { ...v, parent: c.slug }), `${v.name} sparad.`)} onCancel={() => setEditing(null)} />
                        )}
                      </li>
                    ))}
                  </ol>
                  {editing === `new-sub-${c.slug}` ? (
                    <CategoryEditor
                      initial={formFor(undefined, c.slug)}
                      isMain={false}
                      types={data.productTypes}
                      onSave={(v) => run(() => call('POST', '/admin/categories', { ...v, parent: c.slug }), `${v.name} skapad under ${c.name}.`)}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <button type="button" className="admin-btn small" onClick={() => setEditing(`new-sub-${c.slug}`)} data-testid={`button-new-sub-${c.slug}`}>
                      ＋ Ny underkategori i {c.name}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="admin-field-hint">Kategorier med produkter kan inte tas bort, men de kan döljas. Tomma kategorier syns inte i butiken förrän de får sin första produkt.</p>
    </>
  );
}
