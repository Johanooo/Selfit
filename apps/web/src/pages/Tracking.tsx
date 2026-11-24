import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearch } from 'wouter';
import { Check, Package, Truck, Home, ClipboardList } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { TextField } from '@/components/Field';
import { usePageMeta } from '@/hooks/use-page-meta';
import { demoTracking, ORDER_PATTERN } from '@/lib/order';

const STEPS = [
  { label: 'Lagd', text: 'Vi har tagit emot din order.', icon: ClipboardList },
  { label: 'Plockad', text: 'Varorna är plockade och packade på lagret.', icon: Package },
  { label: 'Skickad', text: 'Paketet har lämnats till transportören.', icon: Truck },
  { label: 'Levererad', text: 'Paketet finns hos ombud eller har levererats.', icon: Home },
];

export default function TrackingPage() {
  usePageMeta('Orderspårning', 'Spåra din order från SELFIT med ordernumret.');
  const initial = new URLSearchParams(useSearch()).get('order') ?? '';
  const [order, setOrder] = useState<string | null>(null);

  useEffect(() => {
    if (new RegExp(ORDER_PATTERN).test(initial)) setOrder(initial.toUpperCase().replace(/\s/g, ''));
  }, [initial]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const value = String(new FormData(form).get('orderNumber') ?? '');
    setOrder(value.toUpperCase().replace(/\s/g, ''));
  };

  const t = order ? demoTracking(order) : null;

  return (
    <div className="container container--narrow page">
      <Breadcrumbs items={[{ label: 'Kundservice', href: '/support' }, { label: 'Orderspårning' }]} />
      <div className="stack-3" style={{ marginBottom: 'var(--space-6)' }}>
        <p className="eyebrow">Orderspårning</p>
        <h1 className="h1">Var är mitt paket?</h1>
        <p className="lead">Ange ordernumret från din orderbekräftelse. Demo: alla nummer i formatet SF123456 fungerar.</p>
      </div>
      <form className="card stack-4" onSubmit={submit} aria-label="Spåra order" data-testid="form-tracking">
        <TextField
          id="orderNumber"
          label="Ordernummer"
          required
          defaultValue={initial}
          pattern={ORDER_PATTERN}
          placeholder="SF123456"
          autoComplete="off"
          messages={{
            valueMissing: 'Fyll i ditt ordernummer.',
            patternMismatch: 'Ordernumret börjar med SF följt av sex siffror, till exempel SF482913.',
          }}
        />
        <button type="submit" className="btn btn--primary" data-testid="button-track">
          Spåra
        </button>
      </form>

      {order && t && (
        <section className="section--tight stack-5" aria-labelledby="track-title" aria-live="polite">
          <div className="stack-2">
            <h2 id="track-title" className="h2">
              Order {order}
            </h2>
            <p className="small muted">Demodata – ingen riktig sändning.</p>
          </div>
          <dl className="facts card card--surface">
            <dt>Transportör</dt>
            <dd data-testid="text-carrier">{t.carrier}</dd>
            <dt>Spårningsnummer</dt>
            <dd data-testid="text-tracking-number">{t.trackingNumber}</dd>
            <dt>Status</dt>
            <dd>{STEPS[t.stage].label}</dd>
          </dl>
          <ol className="timeline" aria-label="Leveransstatus">
            {STEPS.map((s, i) => {
              const state = i < t.stage ? 'done' : i === t.stage ? 'current' : 'todo';
              const Icon = s.icon;
              return (
                <li key={s.label} data-state={state === 'current' && i === STEPS.length - 1 ? 'done' : state}>
                  <span className="timeline-dot" aria-hidden="true">
                    {state === 'done' ? <Check size={16} /> : <Icon size={16} />}
                  </span>
                  <div>
                    <p>
                      <strong>{s.label}</strong>
                      <span className="sr-only">
                        {state === 'done' ? ' (klar)' : state === 'current' ? ' (pågår)' : ' (väntar)'}
                      </span>
                    </p>
                    <p className="small muted">{s.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="small">
            Något som inte stämmer?{' '}
            <Link href="/support/kontakt" className="text-link">
              Kontakta kundtjänst
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
