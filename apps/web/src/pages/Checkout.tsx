import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { AlertTriangle, CreditCard, ShoppingBag, Lock } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EmptyState } from '@/components/EmptyState';
import { TextField } from '@/components/Field';
import { ProductImage } from '@/components/art/ProductImage';
import { FreeShippingProgress, TotalsList } from '@/components/OrderSummary';
import { usePageMeta } from '@/hooks/use-page-meta';
import { getCategory } from '@/data/categories';
import { computeTotals, SHIPPING, type DeliveryMethod } from '@/lib/cart-math';
import { isBuyable, kr, stockText, variantLabel } from '@/lib/format';
import { makeOrderNumber, saveOrder } from '@/lib/order';
import { useCart } from '@/state/cart';

export default function CheckoutPage() {
  usePageMeta('Kassa (demo)', 'Slutför din beställning hos SELFIT. Detta är en demo, ingen riktig betalning sker.');
  const { lines, code, ready, clear } = useCart();
  const [method, setMethod] = useState<DeliveryMethod>('ombud');
  const [termsError, setTermsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [, navigate] = useLocation();
  const totals = computeTotals(lines, code, method);
  const free = totals.remainingForFree <= 0;
  const unavailableLines = lines.filter((line) => !isBuyable(line.variant));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (unavailableLines.length > 0) return;
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setSubmitting(true);
    // Simulated order. Nothing is sent anywhere and no personal data is stored.
    const number = makeOrderNumber();
    saveOrder({
      number,
      createdAt: new Date().toISOString(),
      delivery: method,
      lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty, lineTotal: l.lineTotal })),
      totals,
      code,
    });
    window.setTimeout(() => {
      clear();
      navigate(`/orderbekraftelse?order=${number}`);
    }, 450);
  };

  if (!ready) {
    return (
      <div className="container page">
        <p className="muted" aria-busy="true">
          Hämtar varukorgen …
        </p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container page">
        <Breadcrumbs items={[{ label: 'Varukorg', href: '/varukorg' }, { label: 'Kassa' }]} />
        <EmptyState
          icon={<ShoppingBag size={28} />}
          title="Det finns inget att betala"
          actions={
            <Link href="/" className="btn btn--primary">
              Fortsätt handla
            </Link>
          }
        >
          Lägg till produkter i varukorgen först.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: 'Varukorg', href: '/varukorg' }, { label: 'Kassa' }]} />
      <h1 className="h1" style={{ marginBottom: 'var(--space-5)' }}>
        Kassa
      </h1>
      <p className="demo-banner" role="note" data-testid="text-demo-banner">
        <AlertTriangle size={18} aria-hidden="true" />
        <span>
          <strong>Demokassa.</strong> Det här är en prototyp. Ingen order skickas, ingen betalning genomförs och inga
          uppgifter sparas.
        </span>
      </p>
      {unavailableLines.length > 0 && (
        <p className="notice notice--danger" role="alert" data-testid="checkout-stock-warning">
          {unavailableLines.map((line) => `${line.product.name}: ${stockText(line.variant)}`).join('. ')}.
          {' '}Ta bort varorna i varukorgen innan du fortsätter.
        </p>
      )}
      <div className="two-col">
        <form onSubmit={submit} aria-label="Beställningsformulär" data-testid="form-checkout">
          <fieldset className="form-section">
            <legend>1. Kontaktuppgifter</legend>
            <div className="form-grid">
              <TextField
                id="email"
                label="E-post"
                type="email"
                required
                autoComplete="email"
                hint="Orderbekräftelsen skickas hit."
                messages={{ valueMissing: 'Fyll i din e-postadress.', typeMismatch: 'Ange en giltig e-postadress, till exempel namn@exempel.se.' }}
              />
              <TextField
                id="phone"
                label="Mobilnummer"
                type="tel"
                required
                autoComplete="tel"
                pattern="^(\+46|0)[\d\s\-]{8,12}$"
                hint="För avisering via sms."
                messages={{ valueMissing: 'Fyll i ditt mobilnummer.', patternMismatch: 'Ange ett svenskt mobilnummer, till exempel 070-123 45 67.' }}
              />
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>2. Leveransadress</legend>
            <div className="form-grid">
              <TextField id="firstName" label="Förnamn" required autoComplete="given-name" messages={{ valueMissing: 'Fyll i ditt förnamn.' }} />
              <TextField id="lastName" label="Efternamn" required autoComplete="family-name" messages={{ valueMissing: 'Fyll i ditt efternamn.' }} />
              <TextField
                id="address"
                label="Gatuadress"
                required
                autoComplete="street-address"
                wrapperClass="span-2"
                messages={{ valueMissing: 'Fyll i din gatuadress.' }}
              />
              <TextField
                id="zip"
                label="Postnummer"
                required
                inputMode="numeric"
                autoComplete="postal-code"
                pattern="^\d{3}\s?\d{2}$"
                messages={{ valueMissing: 'Fyll i postnummer.', patternMismatch: 'Postnumret ska ha fem siffror, till exempel 114 32.' }}
              />
              <TextField id="city" label="Ort" required autoComplete="address-level2" messages={{ valueMissing: 'Fyll i ort.' }} />
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>3. Leveranssätt</legend>
            <div className="radio-cards">
              <label className="radio-card">
                <input
                  type="radio"
                  name="delivery"
                  value="ombud"
                  checked={method === 'ombud'}
                  onChange={() => setMethod('ombud')}
                  data-testid="radio-delivery-ombud"
                />
                <span>
                  <strong>Hämta hos ombud</strong>
                  <span className="field-hint" style={{ display: 'block' }}>
                    PostNord, 1–3 vardagar. Närmaste ombud väljs utifrån postnummer.
                  </span>
                </span>
                <span className="radio-card-price">{free ? 'Fri' : kr(SHIPPING.ombud)}</span>
              </label>
              <label className="radio-card">
                <input
                  type="radio"
                  name="delivery"
                  value="hem"
                  checked={method === 'hem'}
                  onChange={() => setMethod('hem')}
                  data-testid="radio-delivery-hem"
                />
                <span>
                  <strong>Hemleverans</strong>
                  <span className="field-hint" style={{ display: 'block' }}>
                    Kvällsleverans 17–22, 1–2 vardagar. Du aviseras via sms.
                  </span>
                </span>
                <span className="radio-card-price">{free ? kr(39) : kr(SHIPPING.hem)}</span>
              </label>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>4. Betalning (Kustom)</legend>
            <div className="payment-placeholder" data-testid="payment-placeholder">
              <p className="h3" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <CreditCard size={20} aria-hidden="true" /> Betalning (Kustom)
              </p>
              <p className="small muted">
                Här visas Kustom-checkout med kort, Swish och faktura i den skarpa butiken. I denna demo finns ingen
                betalningslösning kopplad och ingen betalning genomförs.
              </p>
            </div>
            <label className="check" style={{ marginTop: 'var(--space-4)' }}>
              <input
                type="checkbox"
                required
                onInvalid={(e) => {
                  e.currentTarget.setCustomValidity('Du behöver godkänna köpvillkoren för att fortsätta.');
                  setTermsError(true);
                }}
                onChange={(e) => {
                  e.currentTarget.setCustomValidity('');
                  setTermsError(false);
                }}
                aria-describedby={termsError ? 'terms-error' : undefined}
                data-testid="checkbox-terms"
              />
              <span>
                Jag har läst och godkänner{' '}
                <Link href="/support/kopvillkor" className="text-link">
                  köpvillkoren
                </Link>
              </span>
            </label>
            {termsError && (
              <p id="terms-error" className="field-error" role="alert">
                Du behöver godkänna köpvillkoren för att fortsätta.
              </p>
            )}
          </fieldset>

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={submitting || unavailableLines.length > 0}
            data-testid="button-place-order"
          >
            <Lock size={18} aria-hidden="true" />
            {unavailableLines.length > 0
              ? 'Ta bort slutsålda varor först'
              : submitting
                ? 'Skapar demobeställning …'
                : `Lägg demobeställning · ${kr(totals.total)}`}
          </button>
          <p className="small muted" style={{ marginTop: 'var(--space-3)', textAlign: 'center' }}>
            Ingen riktig beställning eller betalning görs.
          </p>
        </form>

        <aside className="summary" aria-label="Din order">
          <h2 className="h2">Din order</h2>
          <ul className="mini-lines">
            {lines.map((l) => (
              <li key={l.variantId} className="mini-line">
                <span className={`mini-line-media tone-${getCategory(l.product.category)?.tone ?? 'lavender'}`}>
                  <ProductImage product={l.product} variant={l.variant} />
                  <span className="mini-qty" aria-label={`${l.qty} st`}>
                    {l.qty}
                  </span>
                </span>
                <span>
                  <strong>{l.product.name}</strong>
                  <br />
                  <span className="muted">{variantLabel(l.product, l.variant)}</span>
                </span>
                <span>{kr(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <FreeShippingProgress totals={totals} />
          <TotalsList totals={totals} code={code} shippingLabel={method === 'ombud' ? 'Frakt (ombud)' : 'Frakt (hemleverans)'} />
          <Link href="/varukorg" className="text-link small">
            Ändra varukorg
          </Link>
        </aside>
      </div>
    </div>
  );
}
