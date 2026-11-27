import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Link } from 'wouter';
import { CheckCircle2, ImagePlus, X } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { TextField, swedishMessage } from '@/components/Field';
import { usePageMeta } from '@/hooks/use-page-meta';
import { ORDER_PATTERN } from '@/lib/order';
import { useSettings } from '@/state/settings';

const REASONS = ['Ångrat köpet (oöppnad vara)', 'Fel vara levererad', 'Skadad eller trasig vara', 'Fel på varan (smak, konsistens m.m.)', 'Annat'];
/** Anledningar där en bild gör att vi kan hjälpa snabbare. */
const DEFECT = new Set(REASONS.slice(1, 4));
const MAX_FILES = 4;

export default function ReturnPage() {
  const { policies } = useSettings();
  usePageMeta('Anmäl retur', `Returnera en vara från SELFIT. ${policies.openPurchaseDays} dagars öppet köp på oöppnade varor.`);
  const [done, setDone] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState('');
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  /** Kontrollerar valda bilder (från knappen eller när de dras in). */
  const pickFiles = (input: HTMLInputElement) => {
    const list = Array.from(input.files ?? []);
    if (list.length > MAX_FILES) {
      setFileError(`Välj högst ${MAX_FILES} bilder.`);
      input.value = '';
      setFiles([]);
      return;
    }
    setFileError('');
    setFiles(list.map((f) => f.name));
  };
  const dropFiles = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    const input = photoInput.current;
    if (!input) return;
    const images = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    const dt = new DataTransfer();
    images.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    pickFiles(input);
  };
  const clearFiles = () => {
    if (photoInput.current) photoInput.current.value = '';
    setFiles([]);
    setFileError('');
  };
  const defect = DEFECT.has(reason);

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
              Du har 14 dagars ångerrätt och {policies.openPurchaseDays} dagars öppet köp på oöppnade varor. Anmäl returen här så får du en
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
                    setReason(e.currentTarget.value);
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
              <div className={`field${defect ? ' field--highlight' : ''}`}>
                <label htmlFor="photos">
                  Bilder på varan <span className="muted">(valfritt, max {MAX_FILES})</span>
                </label>
                <p id="photos-hint" className="small muted">
                  {defect
                    ? 'Med en bild på felet, förpackningen och bäst före-datumet kan vi oftast lösa ärendet direkt – utan att du behöver skicka tillbaka något. Utan bild behöver vi i regel få tillbaka varan först, och det tar längre tid.'
                    : 'En bild hjälper oss att hantera returen snabbare.'}
                </p>
                <div className="upload">
                  <input
                    ref={photoInput}
                    id="photos"
                    name="photos"
                    type="file"
                    accept="image/*"
                    multiple
                    className="upload-input"
                    aria-describedby={fileError ? 'photos-hint photos-error' : 'photos-hint'}
                    onChange={(e) => pickFiles(e.currentTarget)}
                    data-testid="input-photos"
                  />
                  <label
                    htmlFor="photos"
                    className={`upload-zone${dragging ? ' upload-zone--active' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={dropFiles}
                    data-testid="upload-zone"
                  >
                    <ImagePlus size={28} aria-hidden="true" />
                    <span className="upload-button">{files.length ? 'Byt bilder' : 'Välj bilder'}</span>
                    <span className="upload-hint">eller dra in dem hit · högst {MAX_FILES} bilder</span>
                  </label>
                </div>
                {fileError && (
                  <p id="photos-error" className="field-error" role="alert">
                    {fileError}
                  </p>
                )}
                {files.length > 0 && (
                  <div className="upload-files">
                    <ul aria-label="Valda bilder">
                      {files.map((f) => (
                        <li key={f}>
                          <CheckCircle2 size={16} aria-hidden="true" /> {f}
                        </li>
                      ))}
                    </ul>
                    <button type="button" className="upload-clear" onClick={clearFiles} data-testid="button-clear-photos">
                      <X size={14} aria-hidden="true" /> Ta bort bilderna
                    </button>
                  </div>
                )}
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
              <span>Vi kontrollerar varan. Pengarna, inklusive pant, återbetalas inom 5 vardagar efter att vi tagit emot och godkänt returen.</span>
            </li>
          </ol>
          <p className="small muted">
            Öppnade livsmedel och kosttillskott kan av hygienskäl inte returneras om de inte är felaktiga. Spara kvittot och kollinumret från ombudet.{' '}
            <Link href="/support/retur-och-angerratt" className="text-link">
              Läs villkoren
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
