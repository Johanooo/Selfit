import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { AlertTriangle, CreditCard, ShoppingBag, Lock } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EmptyState } from '@/components/EmptyState';
import { TextField } from '@/components/Field';
import { PolicyDialog } from '@/components/PolicyDialog';
import { readJSON, writeJSON } from '@/lib/storage';
import { ProductImage } from '@/components/art/ProductImage';
import { FreeShippingProgress, TotalsList } from '@/components/OrderSummary';
import { usePageMeta } from '@/hooks/use-page-meta';
import { getCategory } from '@/data/categories';
import { computeTotals, type DeliveryMethod } from '@/lib/cart-math';
import { activeShippingMethods, shipping, shippingPrice } from '@/data/shipping';
import { fillFields } from '@/data/support';
import { useSettings } from '@/state/settings';
import { isBuyable, kr, stockText, variantLabel } from '@/lib/format';
import { makeOrderNumber, saveOrder } from '@/lib/order';
import { checkDiscountCode, useCart } from '@/state/cart';

/** Ifyllda uppgifter sparas bara i den här fliken (sessionStorage) och rensas när ordern är lagd. */
const DRAFT_KEY = 'selfit-checkout-draft';
const DRAFT_FIELDS = ['email', 'phone', 'firstName', 'lastName', 'address', 'zip', 'city'] as const;
type Draft = Partial<Record<(typeof DRAFT_FIELDS)[number] | 'delivery', string>>;

export default function CheckoutPage() {
  usePageMeta('Kassa (demo)', 'Slutför din beställning hos SELFIT. Detta är en demo, ingen riktig betalning sker.');
  const { lines, code, discounts, ready, clear, removeCode, setCodeRule } = useCart();
  const [discountError, setDiscountError] = useState('');
  const settings = useSettings();
  const methods = activeShippingMethods();
  const [chosen, setMethod] = useState<DeliveryMethod>(methods[0] ?? 'ombud');
  // Är det valda fraktsättet avstängt i Admin används det första som är på.
  const method: DeliveryMethod = methods.includes(chosen) ? chosen : (methods[0] ?? chosen);
  const [termsError, setTermsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [, navigate] = useLocation();
  const [policy, setPolicy] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Fyll i det kunden redan skrivit om hen lämnat kassan och kommit tillbaka.
  useEffect(() => {
    if (!ready) return;
    const draft = readJSON<Draft>(DRAFT_KEY, {}, 'session');
    const form = formRef.current;
    if (form) {
      for (const f of DRAFT_FIELDS) {
        const el = form.elements.namedItem(f);
        if (el instanceof HTMLInputElement && draft[f] && !el.value) el.value = draft[f]!;
      }
    }
    if (draft.delivery === 'ombud' || draft.delivery === 'hem') setMethod(draft.delivery);
  }, [ready]);

  const saveDraft = () => {
    const form = formRef.current;
    if (!form) return;
    const draft: Draft = { delivery: method };
    for (const f of DRAFT_FIELDS) {
      const el = form.elements.namedItem(f);
      if (el instanceof HTMLInputElement) draft[f] = el.value;
    }
    writeJSON(DRAFT_KEY, draft, 'session');
  };
  useEffect(() => {
    if (ready) saveDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method]);
  const totals = computeTotals(lines, discounts, method);
  const afterDiscount = totals.subtotal - totals.discount;
  const priceText = (id: DeliveryMethod) => {
    const price = id === method ? totals.shipping : shippingPrice(id, afterDiscount);
    return price === 0 ? 'Fri' : kr(price);
  };
  const unavailableLines = lines.filter((line) => !isBuyable(line.variant));

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (unavailableLines.length > 0) return;
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setSubmitting(true);
    // Koden kontrolleras igen med kundens e-post (nya kunder, personliga koder, en gång per kund).
    if (code) {
      const email = (form.elements.namedItem('email') as HTMLInputElement | null)?.value ?? '';
      const r = await checkDiscountCode(code, email);
      if (!r.ok) {
        setDiscountError(r.error);
        setSubmitting(false);
        return;
      }
      setCodeRule(r.rule);
      setDiscountError('');
    }
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
      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* lagring kan vara avstängd */
      }
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
    <div className="container page checkout-page">
      <h1 className="h1 checkout-title">Kassa</h1>
      <p className="demo-banner" role="note" data-testid="text-demo-banner">
        <AlertTriangle size={18} aria-hidden="true" />
        <span>
          <strong>Demokassa.</strong> Det här är en prototyp. Ingen order skickas och ingen betalning genomförs. Det
          du fyller i sparas bara i den här fliken tills ordern är lagd.
        </span>
      </p>
      {unavailableLines.length > 0 && (
        <p className="notice notice--danger" role="alert" data-testid="checkout-stock-warning">
          {unavailableLines.map((line) => `${line.product.name}: ${stockText(line.variant)}`).join('. ')}.
          {' '}Ta bort varorna i varukorgen innan du fortsätter.
        </p>
      )}
      <div className="two-col">
        <form ref={formRef} onSubmit={submit} onInput={saveDraft} aria-label="Beställningsformulär" data-testid="form-checkout">
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
              {methods.map((id) => (
                <label className="radio-card" key={id}>
                  <input
                    type="radio"
                    name="delivery"
                    value={id}
                    checked={method === id}
                    onChange={() => setMethod(id)}
                    data-testid={`radio-delivery-${id}`}
                  />
                  <span>
                    <strong>{shipping.methods[id].name}</strong>
                    <span className="field-hint" style={{ display: 'block' }}>
                      {fillFields(shipping.methods[id].text, settings)}
                    </span>
                  </span>
                  <span className="radio-card-price">{priceText(id)}</span>
                </label>
              ))}
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
                <button
                  type="button"
                  className="text-link link-button"
                  onClick={(e) => {
                    e.preventDefault();
                    setPolicy('kopvillkor');
                  }}
                  data-testid="button-open-terms"
                >
                  köpvillkoren
                </button>
              </span>
            </label>
            {termsError && (
              <p id="terms-error" className="field-error" role="alert">
                Du behöver godkänna köpvillkoren för att fortsätta.
              </p>
            )}
            <p className="small muted checkout-policies">
              Du har 14 dagars{' '}
              <button type="button" className="text-link link-button" onClick={() => setPolicy('retur-och-angerratt')}>
                ångerrätt
              </button>
              . Läs hur vi hanterar{' '}
              <button type="button" className="text-link link-button" onClick={() => setPolicy('integritet')}>
                dina personuppgifter
              </button>
              .
            </p>
          </fieldset>

          <button
            type="submit"
            className="btn btn--checkout btn--block"
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

        <aside className="summary checkout-summary" aria-label="Din order">
          <h2 className="h2">Din order</h2>
          <ul className="mini-lines">
            {lines.map((l) => (
              <li key={l.variantId} className="mini-line">
                <span className={`mini-line-media tone-${getCategory(l.product.category)?.tone ?? 'lavender'}`}>
                  <ProductImage product={l.product} variant={l.variant} />
                  <span className="mini-qty">
                    <span aria-hidden="true">{l.qty}</span>
                    <span className="sr-only">{l.qty} st</span>
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
          {discountError && (
            <div className="notice notice--danger" role="alert" data-testid="error-discount">
              <span style={{ flex: 1 }}>{discountError}</span>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  removeCode();
                  setDiscountError('');
                }}
                data-testid="button-checkout-remove-code"
              >
                Ta bort koden
              </button>
            </div>
          )}
          <TotalsList totals={totals} code={code} shippingLabel={`Frakt (${shipping.methods[method].name.toLowerCase()})`} />
          <Link href="/varukorg" className="text-link small">
            Ändra varukorg
          </Link>
        </aside>
      </div>
      <PolicyDialog slug={policy} onClose={() => setPolicy(null)} onNavigate={setPolicy} />
    </div>
  );
}
