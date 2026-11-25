import { useEffect, useRef } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { getSupportPage } from '@/data/support';
import { SupportSections } from './SupportSections';
import { SupportLinkContext } from './RichText';

/**
 * Visar köpvillkor, ångerrätt eller integritetspolicy ovanpå sidan,
 * så att kunden inte lämnar kassan.
 */
export function PolicyDialog({
  slug,
  onClose,
  onNavigate,
}: {
  slug: string | null;
  onClose: () => void;
  /** Byt till en annan villkorssida i samma popup. */
  onNavigate?: (slug: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const page = getSupportPage(slug ?? undefined);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (page && !d.open) d.showModal();
    if (!page && d.open) d.close();
  }, [page]);

  // Börja överst när kunden byter villkorssida i popupen.
  useEffect(() => {
    ref.current?.querySelector('.policy-dialog-body')?.scrollTo({ top: 0 });
    ref.current?.querySelector<HTMLElement>('#policy-title')?.focus();
  }, [slug]);

  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <dialog
      ref={ref}
      className="dialog policy-dialog"
      aria-labelledby="policy-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="dialog-policy"
    >
      {page && (
        <div className="policy-dialog-inner">
          <div className="dialog-head policy-dialog-head">
            <h2 id="policy-title" className="h2" tabIndex={-1}>
              {page.title}
            </h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Stäng" data-testid="button-close-policy">
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <div className="policy-dialog-body stack-5">
            <p className="lead">{page.summary}</p>
            <SupportLinkContext.Provider value={onNavigate ?? null}>
              <SupportSections page={page} headingLevel={3} />
            </SupportLinkContext.Provider>
          </div>
          <div className="policy-dialog-foot">
            <a href={`${base}/support/${page.slug}`} target="_blank" rel="noopener" className="text-link small">
              Öppna i ny flik <ExternalLink size={14} aria-hidden="true" />
            </a>
            <button type="button" className="btn btn--primary" onClick={onClose}>
              Tillbaka till kassan
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
