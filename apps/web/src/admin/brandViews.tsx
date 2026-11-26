import { useEffect, useRef, useState } from 'react';

/**
 * Admin → Katalog → Varumärken.
 * Ett varumärke skapas här (eller via "Skapa nytt" i produktformuläret) innan det kan väljas på en produkt.
 */

const api = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api${path}`;

export interface Brand {
  id: string;
  slug: string;
  name: string;
  intro?: string | null;
  products: number;
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

/** Dialog för att skapa eller ändra ett varumärke. */
export function BrandDialog({ open, onClose, onCreated, brand }: { open: boolean; onClose: () => void; onCreated: (b: Brand) => void; brand?: Brand | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [intro, setIntro] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setName(brand?.name ?? '');
      setIntro(brand?.intro ?? '');
      setError('');
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, brand]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const saved = brand ? await call<Brand>('PUT', `/admin/brands/${brand.id}`, { name, intro }) : await call<Brand>('POST', '/admin/brands', { name, intro });
      onCreated({ ...saved, products: brand?.products ?? saved.products ?? 0 });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={ref}
      className="pf-dialog"
      aria-labelledby="brand-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <form onSubmit={submit}>
        <header className="pf-dialog-head">
          <h2 id="brand-dialog-title">{brand ? 'Ändra varumärke' : 'Skapa varumärke'}</h2>
          <button type="button" className="pf-icon" onClick={onClose} aria-label="Stäng">
            ✕
          </button>
        </header>
        <div className="pf-dialog-body">
          <div className="pf-field">
            <label htmlFor="brand-name">Namn</label>
            <input id="brand-name" className="pf-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="T.ex. Nike" autoFocus maxLength={60} data-testid="input-brand-name" />
            <p className="pf-help">Skriv som varumärket själv skriver det.{brand ? ' Adressen till varumärkets sida ändras inte.' : ''}</p>
          </div>
          <div className="pf-field">
            <label htmlFor="brand-intro">Kort beskrivning (valfritt)</label>
            <textarea id="brand-intro" className="pf-input" rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={400} data-testid="input-brand-intro" />
            <p className="pf-help">Visas överst på varumärkets sida i butiken.</p>
          </div>
          {error && (
            <p className="pf-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="pf-dialog-foot">
          <button type="button" className="pf-btn ghost" onClick={onClose}>
            Avbryt
          </button>
          <button type="submit" className="pf-btn primary" disabled={busy || !name.trim()} data-testid="button-save-brand">
            {busy ? 'Sparar …' : brand ? 'Spara' : 'Skapa varumärke'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export function BrandsView() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; brand: Brand | null }>({ open: false, brand: null });
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    call<Brand[]>('GET', '/admin/brands')
      .then(setBrands)
      .catch((e: Error) => setError(e.message));
  }, []);

  const remove = async (b: Brand) => {
    if (confirm !== b.id) return setConfirm(b.id);
    try {
      await call('DELETE', `/admin/brands/${b.id}`);
      setBrands((list) => (list ?? []).filter((x) => x.id !== b.id));
      setConfirm(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="pf pf-narrow">
      <div className="pf-top">
        <h1>Varumärken</h1>
        <button type="button" className="pf-btn primary pf-top-action" onClick={() => setDialog({ open: true, brand: null })} data-testid="button-new-brand">
          Skapa varumärke
        </button>
      </div>
      <p className="pf-help pf-lead">Ett varumärke måste finnas här innan du kan välja det på en produkt. Varje varumärke får en egen sida i butiken.</p>
      {error && (
        <p className="pf-error" role="alert">
          {error}
        </p>
      )}
      <section className="pf-card pf-flush">
        {brands === null ? (
          <p className="pf-empty">Laddar …</p>
        ) : brands.length === 0 ? (
          <p className="pf-empty">Inga varumärken än. Skapa ditt första.</p>
        ) : (
          <table className="pf-table pf-list" data-testid="table-brands">
            <thead>
              <tr>
                <th scope="col">Namn</th>
                <th scope="col">Produkter</th>
                <th scope="col">
                  <span className="sr-only">Åtgärder</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id}>
                  <th scope="row">
                    <strong>{b.name}</strong>
                    <span className="pf-sub">/varumarke/{b.slug}</span>
                  </th>
                  <td>{b.products}</td>
                  <td className="pf-row-actions">
                    <button type="button" className="pf-link" onClick={() => setDialog({ open: true, brand: b })} aria-label={`Ändra ${b.name}`}>
                      Ändra
                    </button>
                    {b.products === 0 ? (
                      <button type="button" className={`pf-link danger${confirm === b.id ? ' confirm' : ''}`} onClick={() => remove(b)} aria-label={`Ta bort ${b.name}`}>
                        {confirm === b.id ? 'Klicka igen för att ta bort' : 'Ta bort'}
                      </button>
                    ) : (
                      <span className="pf-sub" title="Varumärken som används av produkter kan inte tas bort.">
                        Används
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <BrandDialog
        open={dialog.open}
        brand={dialog.brand}
        onClose={() => setDialog({ open: false, brand: null })}
        onCreated={(saved) =>
          setBrands((list) => {
            const rest = (list ?? []).filter((x) => x.id !== saved.id);
            return [...rest, saved].sort((x, y) => x.name.localeCompare(y.name, 'sv'));
          })
        }
      />
    </div>
  );
}
