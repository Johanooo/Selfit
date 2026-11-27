import { useEffect, useMemo, useState } from 'react';
import { getDefaultPage, type Faq, type PageContent } from '@/data/pageTemplates';
import { defaultSettings, type SiteSettings } from '@/data/siteDefaults';
import { renderPage } from '@/data/support';
import { RichText } from '@/components/RichText';
import { BodyEditor, useSavedPages } from './pagesViews';

/**
 * Admin → Innehåll → Vanliga frågor.
 * Frågorna sparas på sidan "vanliga-fragor" och visas i butikens kundservice.
 */

const SLUG = 'vanliga-fragor';
const api = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api${path}`;

export function FaqAdminView() {
  const original = getDefaultPage(SLUG)!;
  const { saved, error: loadError, reload } = useSavedPages();
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [page, setPage] = useState<PageContent | null>(null);
  const [base, setBase] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'saved' | 'error'; text?: string }>({ kind: 'idle' });

  useEffect(() => {
    fetch(api('/settings'))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSettings(d))
      .catch(() => undefined);
  }, []);

  const savedPage = saved?.find((p) => p.slug === SLUG);
  useEffect(() => {
    if (saved === null || page) return;
    const start = savedPage ?? original;
    const copy: PageContent = JSON.parse(JSON.stringify({ slug: SLUG, title: start.title, summary: start.summary, sections: start.sections, faq: start.faq ?? [] }));
    setPage(copy);
    setBase(JSON.stringify(copy));
  }, [saved, savedPage, original, page]);

  const preview = useMemo(() => (page ? renderPage(page, settings) : null), [page, settings]);

  if (loadError) return <div className="admin-inline-message" role="alert">{loadError}</div>;
  if (!page || !preview) return <p>Laddar …</p>;

  const faq = page.faq ?? [];
  const dirty = JSON.stringify(page) !== base;
  const categories = [...new Set(faq.map((f) => f.category?.trim()).filter((c): c is string => Boolean(c)))];
  const setFaq = (next: Faq[]) => setPage({ ...page, faq: next });
  const update = (i: number, patch: Partial<Faq>) => setFaq(faq.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...faq];
    const [f] = next.splice(i, 1);
    next.splice(i + dir, 0, f);
    setFaq(next);
    if (open === i) setOpen(i + dir);
  };
  const remove = (i: number) => {
    if (confirmDelete !== i) return setConfirmDelete(i);
    setFaq(faq.filter((_, j) => j !== i));
    setConfirmDelete(null);
    setOpen(null);
  };
  const add = () => {
    setFaq([...faq, { q: '', a: '', category: categories[0] ?? '' }]);
    setOpen(faq.length);
    setSearch('');
  };
  const missing = faq.findIndex((f) => !f.q.trim() || !f.a.trim());

  const save = async () => {
    if (missing >= 0) {
      setOpen(missing);
      return setStatus({ kind: 'error', text: `Fråga ${missing + 1} saknar ${faq[missing].q.trim() ? 'svar' : 'fråga'}.` });
    }
    setStatus({ kind: 'saving' });
    // Tomma rubriker och "visas" sparas inte, så att datan hålls ren.
    const clean = faq.map((f) => ({ q: f.q.trim(), a: f.a.trim(), ...(f.category?.trim() ? { category: f.category.trim() } : {}), ...(f.hidden ? { hidden: true } : {}) }));
    try {
      const res = await fetch(api(`/admin/pages/${SLUG}`), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: page.title, summary: page.summary, sections: page.sections, faq: clean }),
      });
      const body = await res.json();
      if (!res.ok) return setStatus({ kind: 'error', text: body.error ?? 'Kunde inte spara.' });
      const next = { ...page, faq: clean };
      setPage(next);
      setBase(JSON.stringify(next));
      setStatus({ kind: 'saved', text: 'Sparat. Frågorna är uppdaterade i butiken.' });
      reload();
    } catch {
      setStatus({ kind: 'error', text: 'Kunde inte spara. Kontrollera att servern är igång.' });
    }
  };

  const resetToOriginal = async () => {
    if (!confirmReset) return setConfirmReset(true);
    await fetch(api(`/admin/pages/${SLUG}`), { method: 'DELETE' }).catch(() => undefined);
    const copy: PageContent = JSON.parse(JSON.stringify({ ...original, faq: original.faq ?? [] }));
    setPage(copy);
    setBase(JSON.stringify(copy));
    setConfirmReset(false);
    setOpen(null);
    setStatus({ kind: 'saved', text: 'Originalfrågorna är återställda.' });
    reload();
  };

  const term = search.trim().toLowerCase();
  const matches = (f: Faq) => !term || `${f.q} ${f.a} ${f.category ?? ''}`.toLowerCase().includes(term);
  const shownCount = faq.filter((f) => !f.hidden).length;

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">Innehåll</p>
          <h1>Vanliga frågor</h1>
          <p>
            {faq.length} frågor, {shownCount} visas i butiken på{' '}
            <a href={`/support/${SLUG}`} target="_blank" rel="noopener">
              /support/{SLUG}
            </a>{' '}
            och i Kundservice.
          </p>
        </div>
      </div>

      <details className="admin-help">
        <summary>Så fungerar det</summary>
        <ul>
          <li>Klicka på en fråga för att ändra den. Pilarna ändrar ordningen, och samma ordning visas i butiken.</li>
          <li><strong>Rubrik</strong> grupperar frågorna, t.ex. "Frakt och leverans". Lämna tom om du inte vill ha grupper.</li>
          <li>Bocka ur <strong>Visas i butiken</strong> för att dölja en fråga utan att ta bort den.</li>
          <li>Länkar och fält som <code>{'{öppet köp}'}</code> fungerar i svaren, precis som på Sidor.</li>
        </ul>
      </details>

      <div className="admin-page-editor">
        <div className="admin-page-editor-form">
          <div className="faq-admin-toolbar">
            <input
              className="admin-control"
              type="search"
              placeholder="Sök bland frågorna"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Sök bland frågorna"
              data-testid="input-faq-search"
            />
            <button type="button" className="admin-btn primary" onClick={add} data-testid="button-add-faq">
              ＋ Ny fråga
            </button>
          </div>

          <datalist id="faq-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <ol className="faq-admin-list">
            {faq.map((f, i) =>
              !matches(f) ? null : (
                <li key={i} className={`admin-panel faq-admin-item${f.hidden ? ' is-hidden' : ''}${open === i ? ' is-open' : ''}`} data-testid={`faq-admin-${i}`}>
                  <div className="faq-admin-row">
                    <button type="button" className="faq-admin-toggle" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} data-testid={`button-open-faq-${i}`}>
                      <span className="faq-admin-num">{i + 1}</span>
                      <span className="faq-admin-q">{f.q || <em>Ny fråga</em>}</span>
                      {f.category && <span className="faq-admin-cat">{f.category}</span>}
                      {f.hidden && <span className="faq-admin-cat faq-admin-cat--hidden">Dold</span>}
                    </button>
                    <div className="admin-actions">
                      <button type="button" className="admin-btn small" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Flytta fråga ${i + 1} upp`}>
                        ↑
                      </button>
                      <button type="button" className="admin-btn small" onClick={() => move(i, 1)} disabled={i === faq.length - 1} aria-label={`Flytta fråga ${i + 1} ner`}>
                        ↓
                      </button>
                    </div>
                  </div>
                  {open === i && (
                    <div className="admin-panel-body admin-form-grid">
                      <div className="admin-field span-2">
                        <label htmlFor={`faq-${i}-q`}>Fråga</label>
                        <input id={`faq-${i}-q`} className="admin-control" value={f.q} onChange={(e) => update(i, { q: e.target.value })} placeholder="T.ex. Hur lång är leveranstiden?" data-testid={`input-faq-${i}-q`} />
                      </div>
                      <div className="admin-field span-2">
                        <label htmlFor={`faq-${i}-a`}>Svar</label>
                        <BodyEditor id={`faq-${i}-a`} value={f.a} onChange={(v) => update(i, { a: v })} rows={4} />
                      </div>
                      <div className="admin-field">
                        <label htmlFor={`faq-${i}-cat`}>Rubrik</label>
                        <input id={`faq-${i}-cat`} className="admin-control" list="faq-categories" value={f.category ?? ''} onChange={(e) => update(i, { category: e.target.value })} placeholder="T.ex. Frakt och leverans" data-testid={`input-faq-${i}-category`} />
                      </div>
                      <label className="admin-toggle-row faq-admin-visible">
                        <input type="checkbox" checked={!f.hidden} onChange={(e) => update(i, { hidden: !e.target.checked })} data-testid={`check-faq-${i}-visible`} /> Visas i butiken
                      </label>
                      <div className="admin-field span-2 faq-admin-delete">
                        <button type="button" className="admin-btn small danger" onClick={() => remove(i)} data-testid={`button-delete-faq-${i}`}>
                          {confirmDelete === i ? 'Klicka igen för att ta bort' : 'Ta bort frågan'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ),
            )}
          </ol>
          {faq.length === 0 && <p className="admin-inline-message">Inga frågor än. Klicka på "Ny fråga".</p>}
          {term && !faq.some(matches) && <p className="admin-inline-message">Inga frågor matchar sökningen.</p>}
        </div>

        <aside className="admin-page-preview" aria-label="Förhandsvisning">
          <p className="admin-kicker">Så visas det i butiken</p>
          <div className="admin-page-preview-body faq-admin-preview">
            {(() => {
              const visible = (preview.faq ?? []).filter((f) => !f.hidden);
              const groups = new Map<string, Faq[]>();
              const hasCats = visible.some((f) => f.category?.trim());
              for (const f of visible) {
                const key = hasCats ? f.category?.trim() || 'Övrigt' : '';
                groups.set(key, [...(groups.get(key) ?? []), f]);
              }
              return [...groups.entries()]
                .sort(([a], [b]) => Number(a === 'Övrigt') - Number(b === 'Övrigt'))
                .map(([name, list]) => (
                  <div key={name} className="faq-admin-preview-group">
                    {name && <p className="faq-admin-preview-title">{name}</p>}
                    {list.map((f, i) => (
                      <details key={i}>
                        <summary>{f.q || 'Ny fråga'}</summary>
                        <p>
                          <RichText text={f.a} />
                        </p>
                      </details>
                    ))}
                  </div>
                ));
            })()}
          </div>
        </aside>
      </div>

      <div className="admin-savebar">
        <p role="status" className={`admin-savebar-msg ${status.kind}`}>
          {status.kind === 'saving' ? 'Sparar …' : status.text ?? (dirty ? 'Du har ändringar som inte är sparade.' : 'Allt är sparat.')}
        </p>
        <div className="admin-actions">
          {savedPage && (
            <button type="button" className={`admin-btn ${confirmReset ? 'danger' : ''}`} onClick={resetToOriginal} data-testid="button-reset-faq">
              {confirmReset ? 'Klicka igen för att återställa' : 'Återställ originalfrågorna'}
            </button>
          )}
          <button type="button" className="admin-btn primary" onClick={save} disabled={!dirty || status.kind === 'saving'} data-testid="button-save-faq">
            Spara
          </button>
        </div>
      </div>
    </>
  );
}
