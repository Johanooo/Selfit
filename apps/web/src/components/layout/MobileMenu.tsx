import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronRight, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { NAV } from './Header';

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [location] = useLocation();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    onCloseRef.current();
  }, [location]);

  return (
    <dialog
      ref={ref}
      id="mobile-menu"
      className="dialog drawer"
      aria-label="Meny"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-head">
          <Logo />
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Stäng meny" data-testid="button-close-menu">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Huvudmeny">
          <ul className="drawer-nav">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={location === n.href ? 'page' : undefined}>
                  <span className={`dot tone-${n.tone}`} aria-hidden="true" />
                  <span>{n.label}</span>
                  <span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="drawer-sub">
            <Link href="/ordersparning">Spåra order</Link>
            <Link href="/retur">Returnera</Link>
            <Link href="/support">Kundservice</Link>
            <Link href="/support/kontakt">Kontakt</Link>
          </div>
        </nav>
      </div>
    </dialog>
  );
}
