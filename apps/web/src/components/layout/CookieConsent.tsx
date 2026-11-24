import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { X } from 'lucide-react';
import { useCookies, type CookiePrefs } from '@/state/cookies';

const OPTIONS: { key: keyof CookiePrefs; title: string; text: string }[] = [
  { key: 'functional', title: 'Funktionella', text: 'Kommer ihåg till exempel senast sökta produkter.' },
  { key: 'analytics', title: 'Statistik', text: 'Hjälper oss förstå hur sidan används, anonymt.' },
  { key: 'marketing', title: 'Marknadsföring', text: 'Används för relevanta erbjudanden på andra sajter.' },
];

export function CookieConsent() {
  const { prefs, decided, ready, dialogOpen, openDialog, closeDialog, save } = useCookies();
  const [draft, setDraft] = useState<CookiePrefs>(prefs);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (dialogOpen && !d.open) {
      setDraft(prefs);
      d.showModal();
    }
    if (!dialogOpen && d.open) d.close();
  }, [dialogOpen, prefs]);

  const all = { functional: true, analytics: true, marketing: true };
  const none = { functional: false, analytics: false, marketing: false };

  return (
    <>
      {ready && !decided && !dialogOpen && (
        <section className="cookie-banner" aria-labelledby="cookie-title" data-testid="cookie-banner">
          <div className="stack-2">
            <h2 id="cookie-title" className="h3">
              Vi använder cookies
            </h2>
            <p className="small muted">
              Nödvändiga cookies får varukorgen att fungera. Övriga använder vi bara om du säger ja.{' '}
              <Link href="/support/cookies" className="text-link">
                Läs mer om cookies
              </Link>
            </p>
          </div>
          <div className="cookie-actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={() => save(all)} data-testid="button-cookies-accept">
              Godkänn alla
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => save(none)} data-testid="button-cookies-necessary">
              Endast nödvändiga
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={openDialog} data-testid="button-cookies-customize">
              Anpassa
            </button>
          </div>
        </section>
      )}
      <dialog
        ref={ref}
        className="dialog"
        aria-labelledby="cookie-dialog-title"
        onClose={closeDialog}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDialog();
        }}
      >
        <form
          className="dialog-inner"
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            save(draft);
          }}
        >
          <div className="dialog-head">
            <h2 id="cookie-dialog-title" className="h2">
              Cookieinställningar
            </h2>
            <button type="button" className="icon-btn" onClick={closeDialog} aria-label="Stäng" data-testid="button-cookies-close">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="small muted">Dina val sparas lokalt i din webbläsare. Du kan ändra dem när som helst.</p>
          <div className="toggle-row">
            <div>
              <label htmlFor="ck-necessary" className="field-label">
                Nödvändiga
              </label>
              <p className="small muted">Krävs för varukorg och cookieval. Alltid aktiva.</p>
            </div>
            <input id="ck-necessary" type="checkbox" role="switch" className="switch" checked disabled readOnly />
          </div>
          {OPTIONS.map((o) => (
            <div className="toggle-row" key={o.key}>
              <div>
                <label htmlFor={`ck-${o.key}`} className="field-label">
                  {o.title}
                </label>
                <p className="small muted">{o.text}</p>
              </div>
              <input
                id={`ck-${o.key}`}
                type="checkbox"
                role="switch"
                className="switch"
                checked={draft[o.key]}
                onChange={(e) => setDraft((d) => ({ ...d, [o.key]: e.target.checked }))}
                data-testid={`switch-cookie-${o.key}`}
              />
            </div>
          ))}
          <div className="cookie-actions" style={{ marginTop: 'var(--space-5)' }}>
            <button type="submit" className="btn btn--primary" data-testid="button-cookies-save">
              Spara mina val
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => save(all)}>
              Godkänn alla
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
