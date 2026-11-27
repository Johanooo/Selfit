import { useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { X } from 'lucide-react';
import { sizeGuides } from '@/data/sizeGuides';
import type { SizeGuideKind } from '@/data/types';

/** Storleksguide som öppnas ovanpå produktsidan. */
export function SizeGuideDialog({ guide, open, onClose }: { guide: SizeGuideKind; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const g = sizeGuides[guide];

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog size-guide"
      aria-labelledby="size-guide-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="dialog-size-guide"
    >
      <div className="dialog-inner">
        <div className="dialog-head">
          <h2 id="size-guide-title" className="h2">
            {g.title}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Stäng storleksguiden">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <p className="small muted">{g.intro}</p>
        <div className="size-guide-table">
          <table className="data-table">
            <caption className="sr-only">{g.title}</caption>
            <thead>
              <tr>
                {g.headers.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => (
                <tr key={r[0]}>
                  <th scope="row">{r[0]}</th>
                  {r.slice(1).map((c, i) => (
                    <td key={i}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="h3 size-guide-sub">Så mäter du</h3>
        <dl className="size-guide-howto">
          {g.howTo.map((h) => (
            <div key={h.label}>
              <dt>{h.label}</dt>
              <dd>{h.text}</dd>
            </div>
          ))}
        </dl>
        <p className="small muted">
          Storlekarna kan skilja sig lite mellan varumärken. Osäker? <Link href="/support/kontakt">Fråga kundtjänst</Link>.
        </p>
      </div>
    </dialog>
  );
}
