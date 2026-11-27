import type { ReactNode } from 'react';
import { kr } from '@/lib/format';
import type { Totals } from '@/lib/cart-math';
import { freeShippingPhrase, shipping } from '@/data/shipping';

export function FreeShippingProgress({ totals }: { totals: Totals }) {
  const phrase = freeShippingPhrase();
  if (!phrase) return null;
  const done = totals.remainingForFree <= 0;
  const ratio = shipping.freeFrom > 0 ? Math.min(1, 1 - totals.remainingForFree / shipping.freeFrom) : 1;
  return (
    <div className="stack-2" data-testid="free-shipping">
      <p className="small" aria-live="polite">
        {done ? <strong>Du har {phrase}.</strong> : <><strong>{kr(totals.remainingForFree)}</strong> kvar till {phrase}</>}
      </p>
      <div className="progress" role="progressbar" aria-label="Fri frakt" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
        <span style={{ transform: `scaleX(${ratio})` }} />
      </div>
    </div>
  );
}

export function TotalsList({ totals, code, shippingLabel }: { totals: Totals; code: string | null; shippingLabel: ReactNode }) {
  return (
    <dl className="summary-rows">
      <div className="summary-row">
        <dt>Varor ({totals.itemCount} st)</dt>
        <dd data-testid="text-subtotal">{kr(totals.subtotal)}</dd>
      </div>
      {totals.discount > 0 && (
        <div className="summary-row summary-row--discount">
          <dt>Rabatt {totals.discountLabel ?? code ?? ''}</dt>
          <dd data-testid="text-discount">−{kr(totals.discount)}</dd>
        </div>
      )}
      {totals.discount === 0 && totals.discountLabel && (
        <div className="summary-row summary-row--discount">
          <dt>Rabatt {totals.discountLabel}</dt>
          <dd data-testid="text-discount">Fri frakt</dd>
        </div>
      )}
      {totals.deposit > 0 && (
        <div className="summary-row">
          <dt>Pant</dt>
          <dd data-testid="text-deposit-total">{kr(totals.deposit)}</dd>
        </div>
      )}
      <div className="summary-row">
        <dt>{shippingLabel}</dt>
        <dd data-testid="text-shipping">{totals.shipping === 0 ? 'Fri' : kr(totals.shipping)}</dd>
      </div>
      <div className="summary-row summary-row--total">
        <dt>Att betala</dt>
        <dd data-testid="text-total">{kr(totals.total)}</dd>
      </div>
      <div className="summary-row">
        <dt className="muted">varav moms</dt>
        <dd className="muted">{kr(totals.vat)}</dd>
      </div>
    </dl>
  );
}
