import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, RotateCcw, ShoppingBag, Truck, X, Zap } from 'lucide-react';
import { ProductImage } from '@/components/art/ProductImage';
import { QuantityStepper } from '@/components/QuantityStepper';
import { FreeShippingProgress } from '@/components/OrderSummary';
import { computeTotals } from '@/lib/cart-math';
import { productHref } from '@/lib/catalog';
import { isBuyable, kr, stockText, variantLabel } from '@/lib/format';
import { CART_MAX_QTY, useCart } from '@/state/cart';
import { useCartDrawer } from '@/state/cartDrawer';
import { useSettings } from '@/state/settings';

/** Varukorgen som glider in från höger, som hos de stora butikerna. Öppnas när något läggs i korgen. */
export function CartDrawer() {
  const { isOpen, open, close } = useCartDrawer();
  const { lines, code, discounts, ready, setQty, remove, lastAdded, dismissNotice } = useCart();
  const { policies } = useSettings();
  const [location] = useLocation();
  const ref = useRef<HTMLDialogElement>(null);
  const totals = computeTotals(lines, discounts);
  const blocked = lines.some((l) => !isBuyable(l.variant));

  // Lägger man något i korgen visas den direkt.
  useEffect(() => {
    if (!lastAdded) return;
    open();
    dismissNotice();
  }, [lastAdded, open, dismissNotice]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (isOpen && !d.open) d.showModal();
    if (!isOpen && d.open) d.close();
  }, [isOpen]);

  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return (
    <dialog
      ref={ref}
      className="dialog cart-drawer"
      aria-label="Din varukorg"
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      data-testid="cart-drawer"
    >
      <div className="cart-drawer-inner">
        <div className="cart-drawer-head">
          <h2>Din varukorg</h2>
          <button type="button" className="icon-btn" onClick={close} aria-label="Stäng varukorgen" data-testid="button-close-cart">
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        {!ready ? null : lines.length === 0 ? (
          <div className="cart-drawer-empty">
            <ShoppingBag size={32} aria-hidden="true" />
            <p className="h3">Varukorgen är tom</p>
            <p className="muted small">Fri frakt när du handlar för 499 kr eller mer.</p>
            <Link href="/kollektion/bastsaljare" className="btn btn--primary">
              Se bästsäljare
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-drawer-progress">
              <FreeShippingProgress totals={totals} />
            </div>
            <ul className="cart-drawer-lines">
              {lines.map((l) => {
                const unavailable = !isBuyable(l.variant);
                return (
                  <li key={l.variantId} className="cart-drawer-line" data-testid={`drawer-line-${l.variantId}`}>
                    <Link href={productHref(l.product, l.variant)} className="cart-drawer-media">
                      <ProductImage product={l.product} variant={l.variant} />
                    </Link>
                    <div className="cart-drawer-info">
                      <p className="cart-drawer-brand">{l.product.brand}</p>
                      <Link href={productHref(l.product, l.variant)} className="cart-drawer-name">
                        {l.product.name}
                      </Link>
                      <p className="cart-drawer-variant">{variantLabel(l.product, l.variant)}</p>
                      {l.deposit > 0 && <p className="cart-drawer-variant">+ pant {kr(l.deposit)}</p>}
                      {unavailable && <p className="cart-drawer-warning">{stockText(l.variant)}</p>}
                      <div className="cart-drawer-row">
                        <QuantityStepper
                          value={l.qty}
                          onChange={(n) => setQty(l.variantId, n)}
                          max={Math.max(1, Math.min(CART_MAX_QTY, l.variant.stock))}
                          label={`Antal ${l.product.name}`}
                          id={`drawer-${l.variantId}`}
                        />
                        <span className="cart-drawer-price">{kr(l.lineTotal)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cart-drawer-remove"
                      onClick={() => remove(l.variantId)}
                      aria-label={`Ta bort ${l.product.name}`}
                      data-testid={`button-drawer-remove-${l.variantId}`}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="cart-drawer-foot">
              {totals.discount > 0 && (
                <div className="cart-drawer-sum cart-drawer-sum--discount">
                  <span>Rabatt {totals.discountLabel ?? code ?? ''}</span>
                  <span>−{kr(totals.discount)}</span>
                </div>
              )}
              {totals.deposit > 0 && (
                <div className="cart-drawer-sum">
                  <span>Pant</span>
                  <span>{kr(totals.deposit)}</span>
                </div>
              )}
              <div className="cart-drawer-sum cart-drawer-sum--total">
                <span>Ordervärde</span>
                <span data-testid="text-drawer-total">{kr(totals.subtotal - totals.discount + totals.deposit)}</span>
              </div>
              {blocked ? (
                <Link href="/varukorg" className="btn btn--primary btn--block">
                  Ta bort slutsålda varor
                </Link>
              ) : (
                <Link href="/kassa" className="btn btn--checkout btn--block" data-testid="link-drawer-checkout">
                  Till kassan <ArrowRight size={18} aria-hidden="true" />
                </Link>
              )}
              <Link href="/varukorg" className="cart-drawer-link">
                Visa varukorg och rabattkod
              </Link>
              <ul className="cart-drawer-usps">
                <li>
                  <Truck size={20} aria-hidden="true" />
                  <span>Fri frakt över 499 kr</span>
                </li>
                <li>
                  <Zap size={20} aria-hidden="true" />
                  <span>Skickas inom {policies.dispatchDays}</span>
                </li>
                <li>
                  <RotateCcw size={20} aria-hidden="true" />
                  <span>{policies.openPurchaseDays} dagars öppet köp</span>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
