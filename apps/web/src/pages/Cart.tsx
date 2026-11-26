import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { ShoppingBag, Trash2, ArrowRight, Tag, X } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EmptyState } from '@/components/EmptyState';
import { QuantityStepper } from '@/components/QuantityStepper';
import { ProductImage } from '@/components/art/ProductImage';
import { FreeShippingProgress, TotalsList } from '@/components/OrderSummary';
import { usePageMeta } from '@/hooks/use-page-meta';
import { getCategory } from '@/data/categories';
import { computeTotals } from '@/lib/cart-math';
import { productHref } from '@/lib/catalog';
import { comparison, isBuyable, kr, stockText, variantLabel } from '@/lib/format';
import { useCart, CART_MAX_QTY } from '@/state/cart';

export default function CartPage() {
  usePageMeta('Varukorg', 'Din varukorg hos SELFIT.');
  const { lines, code, discounts, ready, setQty, remove, applyCode, removeCode } = useCart();
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [checking, setChecking] = useState(false);
  const totals = computeTotals(lines, discounts);
  const rule = discounts.code;
  const hasUnavailableLines = lines.some((line) => !isBuyable(line.variant));

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) {
      setCodeError('Skriv in en rabattkod.');
      return;
    }
    setChecking(true);
    const r = await applyCode(codeInput);
    setChecking(false);
    if (r.ok) {
      setCodeError('');
      setCodeInput('');
    } else setCodeError(r.error);
  };

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: 'Varukorg' }]} />
      <h1 className="h1" style={{ marginBottom: 'var(--space-6)' }}>
        Varukorg
      </h1>
      {!ready ? (
        <p className="muted" aria-busy="true">
          Hämtar varukorgen …
        </p>
      ) : lines.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={28} />}
          title="Varukorgen är tom"
          actions={
            <>
              <Link href="/kollektion/bastsaljare" className="btn btn--primary" data-testid="link-empty-bestsellers">
                Se bästsäljare
              </Link>
              <Link href="/produkt/pwo-plus?smak=blueberry&pack=6" className="btn btn--secondary">
                Prova PWO+
              </Link>
            </>
          }
        >
          Inget här ännu. Fri frakt till ombud när du handlar för 499 kr eller mer.
        </EmptyState>
      ) : (
        <div className="two-col">
          <section aria-label="Varor i varukorgen">
            <ul className="cart-lines">
              {lines.map((l) => {
                const tone = getCategory(l.product.category)?.tone ?? 'lavender';
                const cmp = comparison(l.variant);
                const unavailable = !isBuyable(l.variant);
                return (
                  <li
                    className={`cart-line${unavailable ? ' cart-line--unavailable' : ''}`}
                    key={l.variantId}
                    data-testid={`row-cart-${l.variantId}`}
                  >
                    <div className={`cart-line-media tone-${tone}`}>
                      <ProductImage product={l.product} variant={l.variant} />
                    </div>
                    <div className="stack-2">
                      <p className="product-card-brand">{l.product.brand}</p>
                      <h2 className="h3">
                        <Link href={productHref(l.product, l.variant)} className="text-link">
                          {l.product.name}
                        </Link>
                      </h2>
                      <p className="small muted">{variantLabel(l.product, l.variant)}</p>
                      <p className="small">
                        {kr(l.variant.price)} / st{cmp && <span className="muted"> · {cmp}</span>}
                      </p>
                      {l.deposit > 0 && <p className="small muted">Pant {kr(l.deposit)} redovisas separat</p>}
                      {unavailable && (
                        <p className="notice notice--danger cart-stock-warning" role="status">
                          {stockText(l.variant)}. Ta bort varan för att kunna gå vidare.
                        </p>
                      )}
                    </div>
                    <div className="cart-line-controls">
                      <p className="price" data-testid={`text-line-total-${l.variantId}`}>
                        {kr(l.lineTotal)}
                      </p>
                      <QuantityStepper
                        value={l.qty}
                        onChange={(n) => setQty(l.variantId, n)}
                        max={Math.max(1, Math.min(CART_MAX_QTY, l.variant.stock))}
                        label={`Antal ${l.product.name}`}
                        id={l.variantId}
                      />
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => remove(l.variantId)}
                        data-testid={`button-remove-${l.variantId}`}
                      >
                        <Trash2 size={16} aria-hidden="true" /> Ta bort
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
          <aside className="summary" aria-label="Sammanställning">
            <h2 className="h2">Sammanställning</h2>
            <FreeShippingProgress totals={totals} />
            <div className="stack-2">
              {code ? (
                <p className={totals.discountNote ? 'notice' : 'notice notice--success'} data-testid="notice-discount">
                  <Tag size={16} aria-hidden="true" />
                  <span style={{ flex: 1 }}>
                    <strong>{code}</strong> {rule ? `· ${rule.label}` : ''}
                    {totals.discountNote && (
                      <>
                        <br />
                        {totals.discountNote}
                      </>
                    )}
                    {rule?.needsEmail && !totals.discountNote && (
                      <>
                        <br />
                        <span className="small">Koden gäller vissa kunder. Vi kontrollerar din e-post i kassan.</span>
                      </>
                    )}
                  </span>
                  <button type="button" className="icon-btn" onClick={removeCode} aria-label="Ta bort rabattkod" data-testid="button-remove-code">
                    <X size={16} aria-hidden="true" />
                  </button>
                </p>
              ) : (
                <form onSubmit={submitCode} noValidate className="stack-2">
                  <label htmlFor="discount" className="field-label">
                    Rabattkod
                  </label>
                  <div className="inline-form">
                    <input
                      id="discount"
                      className="input"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      aria-invalid={codeError ? true : undefined}
                      aria-describedby="discount-hint"
                      autoComplete="off"
                      data-testid="input-discount"
                    />
                    <button type="submit" className="btn btn--secondary" disabled={checking} data-testid="button-apply-code">
                      {checking ? 'Kontrollerar …' : 'Använd'}
                    </button>
                  </div>
                  <p id="discount-hint" className={codeError ? 'field-error' : 'field-hint'} role={codeError ? 'alert' : undefined}>
                    {codeError || 'Rabatten dras från varorna, inte från pant.'}
                  </p>
                </form>
              )}
            </div>
            <TotalsList totals={totals} code={code} shippingLabel="Frakt (ombud)" />
            {hasUnavailableLines ? (
              <button type="button" className="btn btn--primary btn--block" disabled data-testid="button-checkout-blocked">
                Ta bort slutsålda varor för att gå vidare
              </button>
            ) : (
              <Link href="/kassa" className="btn btn--checkout btn--block" data-testid="link-checkout">
                Till kassan <ArrowRight size={18} aria-hidden="true" />
              </Link>
            )}
            <p className="small muted">Alla priser inkl. moms. Leveranssätt väljer du i kassan.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
