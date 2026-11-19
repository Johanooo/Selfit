import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Check, PackageSearch } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { TotalsList } from '@/components/OrderSummary';
import { usePageMeta } from '@/hooks/use-page-meta';
import { findVariant } from '@/data/products';
import { kr, variantLabel } from '@/lib/format';
import { loadOrder, type DemoOrder } from '@/lib/order';

export default function OrderConfirmationPage() {
  usePageMeta('Orderbekräftelse (demo)', 'Tack för din demobeställning hos SELFIT.');
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setOrder(loadOrder());
    setLoaded(true);
  }, []);

  if (!loaded) return <div className="container page" aria-busy="true" />;

  if (!order) {
    return (
      <div className="container page">
        <EmptyState
          icon={<PackageSearch size={28} />}
          title="Ingen order att visa"
          actions={
            <>
              <Link href="/" className="btn btn--primary">
                Till startsidan
              </Link>
              <Link href="/ordersparning" className="btn btn--secondary">
                Spåra en order
              </Link>
            </>
          }
        >
          Orderbekräftelsen visas direkt efter en beställning i samma webbläsarflik.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container container--narrow page">
      <div className="confirm-hero">
        <span className="check-circle" aria-hidden="true">
          <Check size={34} />
        </span>
        <p className="eyebrow">Demobeställning mottagen</p>
        <h1 className="h1">Tack! Din order är lagd.</h1>
        <p className="muted">Ordernummer</p>
        <p className="order-number" data-testid="text-order-number">
          {order.number}
        </p>
        <p className="lead">
          Detta är en simulerad order. Ingenting har skickats, ingen betalning har gjorts och ingen e-post skickas.
        </p>
      </div>

      <section className="card stack-4" aria-labelledby="sum-title">
        <h2 id="sum-title" className="h2">
          Sammanfattning
        </h2>
        <ul className="mini-lines">
          {order.lines.map((l) => {
            const hit = findVariant(l.variantId);
            if (!hit) return null;
            return (
              <li key={l.variantId} className="summary-row">
                <span>
                  {l.qty} × {hit.product.name} <span className="muted">({variantLabel(hit.product, hit.variant)})</span>
                </span>
                <span>{kr(l.lineTotal)}</span>
              </li>
            );
          })}
        </ul>
        <TotalsList
          totals={order.totals}
          code={order.code}
          shippingLabel={order.delivery === 'ombud' ? 'Frakt (ombud)' : 'Frakt (hemleverans)'}
        />
      </section>

      <section className="section--tight stack-4" aria-labelledby="next-title">
        <h2 id="next-title" className="h2">
          Vad händer nu?
        </h2>
        <ol className="numbered">
          <li>
            <span>
              <strong>Vi plockar din order</strong>
              <br />
              <span className="muted">Skickas inom 1–2 vardagar.</span>
            </span>
          </li>
          <li>
            <span>
              <strong>Du får ett spårningsnummer</strong>
              <br />
              <span className="muted">Följ paketet via orderspårningen.</span>
            </span>
          </li>
          <li>
            <span>
              <strong>{order.delivery === 'ombud' ? 'Hämta hos ombud' : 'Hemleverans på kvällen'}</strong>
              <br />
              <span className="muted">Kom ihåg att panta burkarna.</span>
            </span>
          </li>
        </ol>
        <div className="empty-actions" style={{ justifyContent: 'flex-start' }}>
          <Link href={`/ordersparning?order=${order.number}`} className="btn btn--primary" data-testid="link-track-order">
            Spåra ordern
          </Link>
          <Link href="/" className="btn btn--secondary">
            Fortsätt handla
          </Link>
        </div>
      </section>
    </div>
  );
}
