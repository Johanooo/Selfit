import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultPages, getDefaultPage, type PageContent, type PageSection } from '@/data/pageTemplates';
import { defaultSettings, type SiteSettings } from '@/data/siteDefaults';
import { renderPage, TEXT_FIELDS } from '@/data/support';
import { SupportSections } from '@/components/SupportSections';

/**
 * Admin → Innehåll → Sidor: skriv om butikens sidor (köpvillkor, integritet, retur …).
 * Ändringar sparas i databasen och syns direkt i butiken.
 */

const api = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api${path}`;
type Saved = PageContent & { updatedAt: string };

export function useSavedPages() {
  const [saved, setSaved] = useState<Saved[] | null>(null);
  const [error, setError] = useState('');
  const load = () =>
    fetch(api('/pages'))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setSaved)
      .catch(() => setError('Kunde inte hämta sidorna. Kontrollera att servern är igång.'));
  useEffect(() => {
    load();
  }, []);
  return { saved, error, reload: load };
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function PagesListView({ go }: { go: (path: string) => void }) {
  const { saved, error } = useSavedPages();
  const bySlug = new Map((saved ?? []).map((p) => [p.slug, p]));
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">Innehåll</p>
          <h1>Sidor</h1>
          <p>Villkor, kundservice och Om SELFIT. Klicka på en sida för att ändra texten.</p>
        </div>
      </div>
      {error && <div className="admin-inline-message" role="alert">{error}</div>}
      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table" data-testid="table-pages">
            <thead>
              <tr>
                <th scope="col">Sida</th>
                <th scope="col">Adress i butiken</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Åtgärd</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {defaultPages.map((d) => {
                const s = bySlug.get(d.slug);
                return (
                  <tr key={d.slug}>
                    <td>
                      <strong>{s?.title ?? d.title}</strong>
                    </td>
                    <td className="admin-muted">/support/{d.slug}</td>
                    <td>
                      {s ? (
                        <span className="admin-status info">Ändrad {fmtDate(s.updatedAt)}</span>
                      ) : (
                        <span className="admin-status">Originaltext</span>
                      )}
                    </td>
                    <td>
                      <button type="button" className="admin-btn small" onClick={() => go(`/admin/innehall/sidor/${d.slug}`)} data-testid={`button-edit-page-${d.slug}`}>
                        Redigera
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/** Mål för länkar som man kan välja i redigeraren. */
const LINK_TARGETS: { label: string; href: string }[] = [
  ...defaultPages.map((p) => ({ label: p.title, href: `/support/${p.slug}` })),
  { label: 'Anmäl retur (formulär)', href: '/retur' },
  { label: 'Spåra order', href: '/ordersparning' },
  { label: 'Cookieinställningar (öppnar valen)', href: '#cookieinstallningar' },
];

function insertAt(el: HTMLTextAreaElement, make: (selected: string) => string, set: (v: string) => void) {
  const { selectionStart: a, selectionEnd: b, value } = el;
  const text = make(value.slice(a, b));
  const next = value.slice(0, a) + text + value.slice(b);
  set(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(a + text.length, a + text.length);
  });
}

export function BodyEditor({ id, value, onChange, fields = true, rows }: { id: string; value: string; onChange: (v: string) => void; fields?: boolean; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [target, setTarget] = useState(LINK_TARGETS[0].href);
  const [url, setUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const openLink = () => {
    const el = ref.current;
    setLinkText(el ? el.value.slice(el.selectionStart, el.selectionEnd) : '');
    setLinkOpen((o) => !o);
  };
  const addLink = () => {
    const el = ref.current;
    const href = target === 'url' ? url.trim() : target;
    if (!el || !href) return;
    const label = linkText.trim() || LINK_TARGETS.find((t) => t.href === href)?.label || href;
    insertAt(el, () => `[${label}](${href})`, onChange);
    setLinkOpen(false);
    setUrl('');
  };
  const addList = () => {
    const el = ref.current;
    if (el) insertAt(el, (sel) => (sel ? sel.split('\n').map((l) => `- ${l.replace(/^[-•*]\s+/, '')}`).join('\n') : '\n- '), onChange);
  };

  return (
    <div className="admin-editor">
      <div className="admin-editor-toolbar" role="toolbar" aria-label="Textverktyg" aria-controls={id}>
        <button type="button" className="admin-btn small" onClick={openLink} aria-expanded={linkOpen} data-testid={`${id}-link`}>
          🔗 Länk
        </button>
        <button type="button" className="admin-btn small" onClick={addList} data-testid={`${id}-list`}>
          • Punktlista
        </button>
        {fields && (
        <select
          className="admin-control admin-editor-field"
          aria-label="Infoga fält"
          value=""
          onChange={(e) => {
            const el = ref.current;
            if (el && e.target.value) insertAt(el, () => `{${e.target.value}}`, onChange);
          }}
          data-testid={`${id}-field`}
        >
          <option value="">Infoga fält …</option>
          {(['Företag', 'Villkor', 'Frakt'] as const).map((g) => (
            <optgroup key={g} label={g}>
              {TEXT_FIELDS.filter((f) => f.group === g).map((f) => (
                <option key={f.token} value={f.token}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        )}
      </div>
      {linkOpen && (
        <div className="admin-editor-link">
          <label>
            Länktext
            <input className="admin-control" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="T.ex. integritetspolicy" />
          </label>
          <label>
            Länka till
            <select className="admin-control" value={target} onChange={(e) => setTarget(e.target.value)}>
              {LINK_TARGETS.map((t) => (
                <option key={t.href} value={t.href}>
                  {t.label}
                </option>
              ))}
              <option value="url">Annan webbadress …</option>
            </select>
          </label>
          {target === 'url' && (
            <label>
              Webbadress
              <input className="admin-control" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.arn.se" />
            </label>
          )}
          <div className="admin-actions">
            <button type="button" className="admin-btn small primary" onClick={addLink} data-testid={`${id}-link-insert`}>
              Lägg in länk
            </button>
            <button type="button" className="admin-btn small" onClick={() => setLinkOpen(false)}>
              Avbryt
            </button>
          </div>
        </div>
      )}
      <textarea
        id={id}
        ref={ref}
        className="admin-control admin-editor-text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows ?? Math.min(18, Math.max(4, value.split('\n').length + 1))}
        data-testid={`${id}-text`}
      />
    </div>
  );
}

export function PageEditorView({ slug, go, onTitleChange }: { slug: string; go: (path: string) => void; onTitleChange?: (t: string) => void }) {
  const original = getDefaultPage(slug);
  const { saved, error: loadError, reload } = useSavedPages();
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [page, setPage] = useState<PageContent | null>(null);
  const [base, setBase] = useState('');
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'saved' | 'error'; text?: string }>({ kind: 'idle' });
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    fetch(api('/settings'))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSettings(d))
      .catch(() => undefined);
  }, []);

  const savedPage = saved?.find((p) => p.slug === slug);
  useEffect(() => {
    if (!original || saved === null || page) return;
    const start = savedPage ?? original;
    const copy: PageContent = JSON.parse(JSON.stringify({ slug, title: start.title, summary: start.summary, sections: start.sections, faq: start.faq }));
    setPage(copy);
    setBase(JSON.stringify(copy));
  }, [saved, original, savedPage, page, slug]);

  useEffect(() => {
    if (page) onTitleChange?.(page.title);
  }, [page?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => (page ? renderPage(page, settings) : null), [page, settings]);

  if (!original) return <div className="admin-inline-message">Sidan finns inte.</div>;
  if (loadError) return <div className="admin-inline-message" role="alert">{loadError}</div>;
  if (!page || !preview) return <p>Laddar …</p>;

  const dirty = JSON.stringify(page) !== base;
  const setSection = (i: number, patch: Partial<PageSection>) =>
    setPage({ ...page, sections: page.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...page.sections];
    const [s] = next.splice(i, 1);
    next.splice(i + dir, 0, s);
    setPage({ ...page, sections: next });
  };

  const save = async () => {
    setStatus({ kind: 'saving' });
    try {
      const res = await fetch(api(`/admin/pages/${slug}`), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: page.title, summary: page.summary, sections: page.sections, faq: page.faq }),
      });
      const body = await res.json();
      if (!res.ok) return setStatus({ kind: 'error', text: body.error ?? 'Kunde inte spara.' });
      setBase(JSON.stringify(page));
      setStatus({ kind: 'saved', text: 'Sparat. Sidan är uppdaterad i butiken.' });
      reload();
    } catch {
      setStatus({ kind: 'error', text: 'Kunde inte spara. Kontrollera att servern är igång.' });
    }
  };

  const resetToOriginal = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    await fetch(api(`/admin/pages/${slug}`), { method: 'DELETE' }).catch(() => undefined);
    const copy: PageContent = JSON.parse(JSON.stringify(original));
    setPage(copy);
    setBase(JSON.stringify(copy));
    setConfirmReset(false);
    setStatus({ kind: 'saved', text: 'Originaltexten är återställd.' });
    reload();
  };

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">Innehåll · Sidor</p>
          <h1>{page.title || 'Namnlös sida'}</h1>
          <p>
            Visas på <a href={`/support/${slug}`} target="_blank" rel="noopener">/support/{slug}</a>
            {savedPage ? ` · senast ändrad ${fmtDate(savedPage.updatedAt)}` : ' · originaltext'}
          </p>
        </div>
      </div>

      <details className="admin-help">
        <summary>Så skriver du texten</summary>
        <ul>
          <li><strong>Tom rad</strong> = nytt stycke.</li>
          <li>Rader som börjar med <code>- </code> blir en <strong>punktlista</strong>.</li>
          <li><strong>Länk:</strong> markera ord och klicka 🔗 Länk. I texten ser det ut så här: <code>[integritetspolicy](/support/integritet)</code>.</li>
          <li><strong>Fält</strong> som <code>{'{e-post}'}</code> eller <code>{'{öppet köp}'}</code> fylls i automatiskt från Inställningar. Ändrar du e-posten där, ändras den här också.</li>
        </ul>
      </details>

      <div className="admin-page-editor">
        <div className="admin-page-editor-form">
          <section className="admin-panel">
            <div className="admin-panel-body admin-form-grid">
              <div className="admin-field span-2">
                <label htmlFor="page-title">Rubrik</label>
                <input id="page-title" className="admin-control" value={page.title} onChange={(e) => setPage({ ...page, title: e.target.value })} data-testid="input-page-title" />
              </div>
              <div className="admin-field span-2">
                <label htmlFor="page-summary">Ingress</label>
                <textarea id="page-summary" className="admin-control" rows={2} value={page.summary} onChange={(e) => setPage({ ...page, summary: e.target.value })} data-testid="input-page-summary" />
                <span className="admin-field-hint">Kort sammanfattning som visas överst på sidan.</span>
              </div>
            </div>
          </section>

          {page.sections.map((s, i) => (
            <section className="admin-panel admin-section-card" key={i} aria-label={`Avsnitt ${i + 1}`}>
              <header className="admin-panel-head">
                <div className="admin-field admin-section-heading">
                  <label htmlFor={`section-${i}-heading`}>Avsnitt {i + 1} – rubrik</label>
                  <input id={`section-${i}-heading`} className="admin-control" value={s.heading} onChange={(e) => setSection(i, { heading: e.target.value })} data-testid={`input-section-${i}-heading`} />
                </div>
                <div className="admin-actions">
                  <button type="button" className="admin-btn small" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Flytta avsnitt ${i + 1} upp`}>↑</button>
                  <button type="button" className="admin-btn small" onClick={() => move(i, 1)} disabled={i === page.sections.length - 1} aria-label={`Flytta avsnitt ${i + 1} ner`}>↓</button>
                  <button type="button" className="admin-btn small danger" onClick={() => setPage({ ...page, sections: page.sections.filter((_, j) => j !== i) })} aria-label={`Ta bort avsnitt ${i + 1}`}>Ta bort</button>
                </div>
              </header>
              <div className="admin-panel-body">
                <BodyEditor id={`section-${i}-body`} value={s.body} onChange={(v) => setSection(i, { body: v })} />
              </div>
            </section>
          ))}
          <button type="button" className="admin-btn" onClick={() => setPage({ ...page, sections: [...page.sections, { heading: 'Ny rubrik', body: '' }] })} data-testid="button-add-section">
            ＋ Lägg till avsnitt
          </button>
        </div>

        <aside className="admin-page-preview" aria-label="Förhandsvisning">
          <p className="admin-kicker">Förhandsvisning</p>
          <div className="admin-page-preview-body">
            <h1 className="h1">{preview.title}</h1>
            <p className="lead">{preview.summary}</p>
            <SupportSections page={preview} />
          </div>
        </aside>
      </div>

      <div className="admin-savebar">
        <p role="status" className={`admin-savebar-msg ${status.kind}`}>
          {status.kind === 'saving' ? 'Sparar …' : status.text ?? (dirty ? 'Du har ändringar som inte är sparade.' : 'Allt är sparat.')}
        </p>
        <div className="admin-actions">
          {savedPage && (
            <button type="button" className={`admin-btn ${confirmReset ? 'danger' : ''}`} onClick={resetToOriginal} data-testid="button-reset-page">
              {confirmReset ? 'Klicka igen för att återställa' : 'Återställ originaltext'}
            </button>
          )}
          <button type="button" className="admin-btn" onClick={() => go('/admin/innehall/sidor')}>
            Tillbaka till sidor
          </button>
          <button type="button" className="admin-btn primary" onClick={save} disabled={!dirty || status.kind === 'saving'} data-testid="button-save-page">
            Spara
          </button>
        </div>
      </div>
    </>
  );
}
