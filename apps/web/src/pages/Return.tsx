import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { CheckCircle2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { TextField, swedishMessage } from '@/components/Field';
import { usePageMeta } from '@/hooks/use-page-meta';
import { ORDER_PATTERN } from '@/lib/order';

const REASONS = ['Ångrat köpet', 'Fel vara levererad', 'Skadad vara', 'Annat'];

export default function ReturnPage() {
  usePageMeta('Anmäl retur', 'Returnera en vara från SELFIT. 14 dagars ångerrätt och 30 dagars öppet köp.');
  const [done, setDone] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState('');

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    // Demo only – nothing is transmitted.
    setDone(String(new FormData(form).get('returnOrder') ?? '').toUpperCase());
  };

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: 'Kundservice', href: '/support' }, { label: 'Retur' }]} />
      <div className="two-col">
        <div className="stack-6">
          <div className="stack-3">
            <p className="eyebrow">Retur</p>
            <h1 className="h1">Returnera en vara</h1>
            <p className="lead">
              Du har 14 dagars ångerrätt och 30 dagars öppet köp på oöppnade varor. Anmäl returen här så får du en
              returetikett.
            </p>
          </div>

          {done ? (
            <div className="card stack-4" role="status" data-testid="text-return-success">
              <p className="notice notice--success">
                <CheckCircle2 size={18} aria-hidden="true" />
                <span>
                  <strong>Returanmälan för {done} är registrerad (demo).</strong> I den skarpa butiken skickas en
                  returetikett till din e-post. Ingenting har skickats i denna demo.
                </span>
              </p>
              <button type="button" className="btn btn--secondary" onClick={() => setDone(null)}>
                Anmäl en till retur
              </button>
            </div>
          ) : (
            <form className="card stack-4" onSubmit={submit} aria-label="Returformulär" data-testid="form-return">
              <TextField
                id="returnOrder"
                label="Ordernummer"
                required
                pattern={ORDER_PATTERN}
                placeholder="SF123456"
                autoComplete="off"
                messages={{
                  valueMissing: 'Fyll i ordernumret.',
                  patternMismatch: 'Ordernumret börjar med SF följt av sex siffror.',
                }}
              />
              <TextField
                id="returnEmail"
                label="E-post som användes vid köpet"
                type="email"
                required
                autoComplete="email"
                messages={{ valueMissing: 'Fyll i din e-postadress.', typeMismatch: 'Ange en giltig e-postadress.' }}
              />
              <div className="field">
                <label htmlFor="reason">Anledning</label>
                <select
                  id="reason"
                  name="reason"
                  className="select"
                  required
                  defaultValue=""
                  aria-invalid={reasonError ? true : undefined}
                  aria-describedby={reasonError ? 'reason-error' : undefined}
                  onInvalid={(e) => {
                    const m = swedishMessage(e.currentTarget, { valueMissing: 'Välj en anledning.' });
                    e.currentTarget.setCustomValidity(m);
                    setReasonError(m);
                  }}
                  onChange={(e) => {
                    e.currentTarget.setCustomValidity('');
                    setReasonError('');
                  }}
                  data-testid="select-reason"
                >
                  <option value="" disabled>
                    Välj anledning
                  </option>
                  {REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                {reasonError && (
                  <p id="reason-error" className="field-error" role="alert">
                    {reasonError}
                  </p>
                )}
              </div>
              <div className="field">
                <label htmlFor="comment">
                  Vilka varor vill du returnera? <span className="muted">(valfritt)</span>
                </label>
                <textarea id="comment" name="comment" className="textarea" data-testid="input-comment" />
              </div>
              <button type="submit" className="btn btn--primary" data-testid="button-submit-return">
                Skicka returanmälan (demo)
              </button>
              <p className="small muted">Demo: inga uppgifter skickas eller sparas.</p>
            </form>
          )}
        </div>
        <aside className="summary" aria-labelledby="howto">
          <h2 id="howto" className="h2">
            Så går returen till
          </h2>
          <ol className="numbered">
            <li>
              <span>Anmäl returen i formuläret.</span>
            </li>
            <li>
              <span>Packa varorna väl, gärna i originalkartongen.</span>
            </li>
            <li>
              <span>Fäst returetiketten och lämna paketet hos närmaste ombud.</span>
            </li>
            <li>
              <span>Pengarna, inklusive pant, återbetalas inom 5 vardagar efter att vi tagit emot returen.</span>
            </li>
          </ol>
          <p className="small muted">
            Öppnade kosttillskott och hudvård kan av hygienskäl inte returneras om de inte är felaktiga.{' '}
            <Link href="/support/retur-och-angerratt" className="text-link">
              Läs villkoren
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
