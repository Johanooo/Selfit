import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { categories, getCategory, getSubcategory, subcategoriesOf } from '@/data/categories';
import { getFlavour } from '@/data/products';
import { PwoCan } from '@/components/art/PwoCan';
import { MediaPicker } from './mediaViews';

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

export { ProductFormView } from './productFormView';
