import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { CategoryMenu } from './CategoryMenu';

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
        <CategoryMenu idPrefix="drawer" />
      </div>
    </dialog>
  );
}
