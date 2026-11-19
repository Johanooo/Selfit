import { useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { Check, X } from 'lucide-react';
import { useCart } from '@/state/cart';
import { findVariant } from '@/data/products';
import { variantLabel } from '@/lib/format';

export function CartToast() {
  const { lastAdded, dismissNotice } = useCart();
  const dismissRef = useRef(dismissNotice);
  dismissRef.current = dismissNotice;

  useEffect(() => {
    if (!lastAdded) return;
    const t = window.setTimeout(() => dismissRef.current(), 4500);
    return () => window.clearTimeout(t);
  }, [lastAdded]);

  const hit = lastAdded ? findVariant(lastAdded.variantId) : undefined;

  return (
    <div className="toast-region" aria-live="polite" role="status">
      {lastAdded && hit && (
        <div className="toast" key={lastAdded.id} data-testid="toast-added">
          <Check size={18} aria-hidden="true" />
          <span>
            {lastAdded.qty} st {hit.product.name} ({variantLabel(hit.product, hit.variant)}) i varukorgen.
          </span>
          <Link href="/varukorg" onClick={dismissNotice}>
            Till varukorgen
          </Link>
          <button type="button" className="icon-btn" aria-label="Stäng meddelande" onClick={dismissNotice}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
