import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Filterknapp som öppnar en liten ruta med val (som Apotea).
 * Stängs med Escape, klick utanför eller när fokus lämnar rutan.
 */
export function FilterDropdown({
  label,
  count,
  children,
  testId,
}: {
  label: string;
  count: number;
  children: ReactNode;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      className="filter-dd"
      ref={ref}
      onBlur={(e) => {
        if (open && !ref.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={btnRef}
        type="button"
        className={`filter-dd-btn${count > 0 ? ' is-active' : ''}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        data-testid={testId}
      >
        {label}
        {count > 0 && <span className="filter-dd-count">{count}</span>}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <div id={id} className="filter-dd-panel" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
