import { useEffect, useMemo, useState } from 'react';
import { call } from './discountViews';

/**
 * Admin → Papperskorg. Det som tas bort med ✕ hamnar här och kan läggas tillbaka i 30 dagar.
 * Sedan töms det automatiskt.
 */

interface Entry {
  id: string;
  kind: string;
  kindName: string;
  objectId: string;
  label: string;
  detail: string;
  deletedAt: string;
  deletedBy: string;
  expiresAt: string;
}

/** Var man hittar det igen efter att det lagts tillbaka. */
const WHERE: Record<string, { label: string; path: string }> = {
  product: { label: 'Produkter', path: '/admin/produkter' },
  brand: { label: 'Varumärken', path: '/admin/varumarken' },
  category: { label: 'Kategorier', path: '/admin/kategorier' },
  productType: { label: 'Produkttyper', path: '/admin/produkttyper' },
  discount: { label: 'Rabatter', path: '/admin/rabatter' },
  campaign: { label: 'Kampanjer', path: '/admin/kampanjer' },
  media: { label: 'Mediebibliotek', path: '/admin/media' },
  deposit: { label: 'Moms och pant', path: '/admin/installningar/moms-pant' },
};

const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5));
const showDate = (iso: string) => new Date(iso).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' });

export function TrashView({ go }: { go: (path: string) => void }) {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [kind, setKind] = useState('all');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string; link?: { label: string; path: string } } | null>(null);
  const [confirm, setConfirm] = useState<string>('');
  const [busy, setBusy] = useState('');

  const load = () =>
    call<Entry[]>('GET', '/admin/trash')
      .then(setRows)
      .catch((e: Error) => setMessage({ kind: 'error', text: e.message }));
  useEffect(() => {
    void load();
  }, []);

  const kinds = useMemo(() => {
    const m = new Map<string, { name: string; n: number }>();
    for (const r of rows ?? []) m.set(r.kind, { name: r.kindName, n: (m.get(r.kind)?.n ?? 0) + 1 });
    return [...m.entries()];
  }, [rows]);
  const shown = (rows ?? []).filter((r) => kind === 'all' || r.kind === kind);

  const restore = async (r: Entry) => {
    setBusy(r.id);
    setConfirm('');
    try {
      const res = await call<{ note: string | null }>('POST', `/admin/trash/${r.id}/restore`);
      setMessage({ kind: 'ok', text: `${r.kindName} ”${r.label}” är tillbakalagd.${res.note ? ` ${res.note}` : ''}`, link: WHERE[r.kind] });
      await load();
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message });
    } finally {
      setBusy('');
    }
  };

  const remove = async (r: Entry) => {
    if (confirm !== r.id) return setConfirm(r.id);
    setBusy(r.id);
    try {
      await call('DELETE', `/admin/trash/${r.id}`);
      setMessage({ kind: 'ok', text: `${r.kindName} ”${r.label}” är raderad för gott.` });
      setConfirm('');
      await load();
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message });
    } finally {
      setBusy('');
    }
  };

  const emptyAll = async () => {
    if (confirm !== 'all') return setConfirm('all');
    setBusy('all');
    try {
      const res = await call<{ deleted: number }>('DELETE', '/admin/trash');
      setMessage({ kind: 'ok', text: `Papperskorgen är tömd (${res.deleted} st raderade för gott).` });
      setConfirm('');
      await load();
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message });
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="pf">
      <div className="pf-top">
        <h1>Papperskorg</h1>
        {rows && rows.length > 0 && (
          <button type="button" className={`pf-btn ghost pf-top-action${confirm === 'all' ? ' danger' : ''}`} onClick={emptyAll} disabled={busy === 'all'} data-testid="button-empty-trash">
            {confirm === 'all' ? 'Klicka igen för att radera allt för gott' : 'Töm papperskorgen'}
          </button>
        )}
      </div>
      <p className="pf-help">Det du tar bort i Admin hamnar här och kan läggas tillbaka i 30 dagar. Sedan raderas det automatiskt.</p>
      {message && (
        <p className={message.kind === 'error' ? 'pf-error' : 'admin-inline-message'} role={message.kind === 'error' ? 'alert' : 'status'} data-testid="status-trash">
          {message.text}{' '}
          {message.link && (
            <a
              href={message.link.path}
              onClick={(e) => {
                e.preventDefault();
                go(message.link!.path);
              }}
            >
              Gå till {message.link.label} →
            </a>
          )}
        </p>
      )}
      <section className="pf-card pf-flush">
        {kinds.length > 1 && (
          <div className="dc-toolbar">
            <div className="dc-tabs" role="tablist" aria-label="Filtrera">
              <button type="button" role="tab" aria-selected={kind === 'all'} className={kind === 'all' ? 'is-on' : ''} onClick={() => setKind('all')}>
                Alla <span>{rows?.length ?? 0}</span>
              </button>
              {kinds.map(([k, v]) => (
                <button key={k} type="button" role="tab" aria-selected={kind === k} className={kind === k ? 'is-on' : ''} onClick={() => setKind(k)}>
                  {v.name} <span>{v.n}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {rows === null ? (
          <p className="pf-empty">Laddar …</p>
        ) : rows.length === 0 ? (
          <div className="pf-empty dc-empty">
            <p>
              <strong>Papperskorgen är tom</strong>
            </p>
            <p>När du tar bort en produkt, kategori, varumärke, rabatt, kampanj, bild eller pant hamnar den här.</p>
          </div>
        ) : (
          <table className="pf-table pf-list" data-testid="table-trash">
            <thead>
              <tr>
                <th scope="col">Namn</th>
                <th scope="col">Typ</th>
                <th scope="col">Borttagen</th>
                <th scope="col">Raderas om</th>
                <th scope="col">
                  <span className="admin-visually-hidden">Åtgärder</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} data-testid={`row-trash-${r.id}`}>
                  <th scope="row">
                    <strong>{r.label}</strong>
                    {r.detail && <span className="pf-sub">{r.detail}</span>}
                  </th>
                  <td>{r.kindName}</td>
                  <td className="pf-sub">
                    {showDate(r.deletedAt)} · {r.deletedBy}
                  </td>
                  <td className="pf-sub">{daysLeft(r.expiresAt)} dagar</td>
                  <td className="trash-actions">
                    <button type="button" className="pf-btn" onClick={() => restore(r)} disabled={busy === r.id} data-testid={`button-restore-${r.id}`}>
                      Lägg tillbaka
                    </button>
                    <button type="button" className={`pf-link danger${confirm === r.id ? ' confirm' : ''}`} onClick={() => remove(r)} disabled={busy === r.id} data-testid={`button-delete-forever-${r.id}`}>
                      {confirm === r.id ? 'Klicka igen' : 'Radera för gott'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
