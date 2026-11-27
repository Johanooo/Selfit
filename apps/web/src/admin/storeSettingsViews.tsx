import { useEffect, useState, type ReactNode } from 'react';
import {
  defaultSettings,
  isPlaceholder,
  type CompanyInfo,
  type Policies,
  type SiteSettings,
} from '@/data/siteDefaults';

/**
 * Inställningar som sparas på riktigt i databasen och syns direkt i butiken:
 * företagsuppgifter och villkor/avgifter.
 */

const api = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api${path}`;

function Heading({ title, description }: { title: string; description: string }) {
  return (
    <div className="admin-page-heading">
      <div>
        <p className="admin-kicker">Inställningar</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>
      <div className="admin-panel-body">{children}</div>
    </section>
  );
}

function Input({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  type = 'text',
  suffix,
  wide,
}: {
  id: string;
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  type?: string;
  suffix?: string;
  wide?: boolean;
}) {
  const empty = typeof value === 'string' && isPlaceholder(value);
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`admin-field${wide ? ' span-2' : ''}`}>
      <label htmlFor={id}>
        {label} {empty && <span className="admin-status warn">Fyll i</span>}
      </label>
      <div className={suffix ? 'admin-input-suffix' : undefined}>
        <input
          id={id}
          className="admin-control"
          type={type}
          value={typeof value === 'string' && isPlaceholder(value) ? '' : value}
          placeholder={typeof value === 'string' && isPlaceholder(value) ? value.replace(/^\[FYLL I: ?|\]$/g, '') : undefined}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          data-testid={`input-${id}`}
        />
        {suffix && <span aria-hidden="true">{suffix}</span>}
      </div>
      {hint && (
        <span className="admin-field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="admin-field-error" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

type Status = { kind: 'idle' | 'saving' | 'saved' | 'error'; text?: string };

/** Läser inställningarna från servern och sparar en del (company eller policies). */
export function useSettingsForm<K extends keyof SiteSettings>(key: K) {
  const [value, setValue] = useState<SiteSettings[K]>(defaultSettings[key]);
  const [saved, setSaved] = useState<SiteSettings[K]>(defaultSettings[key]);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    fetch(api('/settings'))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: SiteSettings) => {
        setValue(data[key] ?? defaultSettings[key]);
        setSaved(data[key] ?? defaultSettings[key]);
        setLoaded(true);
      })
      .catch(() => setStatus({ kind: 'error', text: 'Kunde inte hämta inställningarna. Kontrollera att servern är igång.' }));
  }, [key]);

  const dirty = JSON.stringify(value) !== JSON.stringify(saved);

  const save = async () => {
    setStatus({ kind: 'saving' });
    setErrors({});
    try {
      const res = await fetch(api(`/admin/settings/${key}`), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(value),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrors(body.fields ?? {});
        setStatus({ kind: 'error', text: body.error ?? 'Kunde inte spara.' });
        return;
      }
      setSaved(body.value);
      setValue(body.value);
      setStatus({ kind: 'saved', text: 'Sparat. Ändringen syns i butiken direkt.' });
    } catch {
      setStatus({ kind: 'error', text: 'Kunde inte spara. Kontrollera att servern är igång.' });
    }
  };

  const set = <F extends keyof SiteSettings[K]>(field: F, v: SiteSettings[K][F]) => {
    setValue((cur) => ({ ...cur, [field]: v }));
    if (status.kind === 'saved') setStatus({ kind: 'idle' });
  };

  return { value, set, save, dirty, loaded, errors, status, reset: () => setValue(saved) };
}

export function SaveBar({ dirty, status, onSave, onReset }: { dirty: boolean; status: Status; onSave: () => void; onReset: () => void }) {
  return (
    <div className="admin-savebar">
      <p role="status" className={`admin-savebar-msg ${status.kind}`}>
        {status.kind === 'saving' ? 'Sparar …' : status.text ?? (dirty ? 'Du har ändringar som inte är sparade.' : 'Allt är sparat.')}
      </p>
      <div className="admin-actions">
        <button type="button" className="admin-btn" onClick={onReset} disabled={!dirty} data-testid="button-reset-settings">
          Ångra ändringar
        </button>
        <button type="button" className="admin-btn primary" onClick={onSave} disabled={!dirty || status.kind === 'saving'} data-testid="button-save-settings">
          Spara
        </button>
      </div>
    </div>
  );
}

export function CompanySettingsView() {
  const f = useSettingsForm('company');
  const c = f.value as CompanyInfo;
  const missing = (Object.keys(c) as (keyof CompanyInfo)[]).filter((k) => isPlaceholder(c[k])).length;
  const field = (k: keyof CompanyInfo, label: string, extra: Partial<Parameters<typeof Input>[0]> = {}) => (
    <Input id={`company-${k}`} label={label} value={c[k]} onChange={(v) => f.set(k, v)} error={f.errors[k]} {...extra} />
  );
  return (
    <>
      <Heading
        title="Företagsuppgifter"
        description="Visas i sidfoten, på kontaktsidan och i köpvillkor, integritetspolicy och ångerblankett."
      />
      {missing > 0 && f.loaded && (
        <div className="admin-inline-message" role="note">
          {missing} {missing === 1 ? 'uppgift saknas' : 'uppgifter saknas'}. Tills de är ifyllda står det ”[FYLL I …]” i butikens texter.
        </div>
      )}
      <div className="admin-grid two">
        <Panel title="Bolaget" subtitle="Måste stå i köpvillkoren enligt lag">
          <div className="admin-form-grid">
            {field('brand', 'Varumärke', { hint: 'Namnet kunderna ser, t.ex. SELFIT.' })}
            {field('legalName', 'Bolagsnamn', { hint: 'Som det står hos Bolagsverket, t.ex. SELFIT AB.' })}
            {field('orgNr', 'Organisationsnummer', { hint: 'T.ex. 559123-4567.' })}
            {field('vatNr', 'Momsregistreringsnummer', { hint: 'T.ex. SE559123456701.' })}
            {field('address', 'Postadress', { wide: true, hint: 'Gatuadress, postnummer och ort.' })}
          </div>
        </Panel>
        <Panel title="Kundtjänst" subtitle="Visas för kunderna">
          <div className="admin-form-grid">
            {field('email', 'E-post', { type: 'email', hint: 'Blir klickbar i butiken.' })}
            {field('phone', 'Telefon', { type: 'tel', hint: 'Blir klickbar på mobilen.' })}
            {field('hours', 'Öppettider', { wide: true, hint: 'T.ex. vardagar 09–16.' })}
            {field('emailProvider', 'E-posttjänst för orderbekräftelser', {
              wide: true,
              hint: 'Nämns i integritetspolicyn, t.ex. ”Brevo” eller ”Postmark”.',
            })}
          </div>
        </Panel>
      </div>
      <SaveBar dirty={f.dirty} status={f.status} onSave={f.save} onReset={f.reset} />
    </>
  );
}

export function PoliciesSettingsView() {
  const f = useSettingsForm('policies');
  const p = f.value as Policies;
  const num = (k: keyof Policies) => (v: string) => f.set(k, (v === '' ? 0 : Number(v)) as never);
  return (
    <>
      <Heading
        title="Villkor och avgifter"
        description="Används i köpvillkor, returvillkor, toppraden, produktsidor och kassan. Ändra här så uppdateras alla texter."
      />
      <div className="admin-grid two">
        <Panel title="Retur och öppet köp">
          <div className="admin-form-grid">
            <Input
              id="policies-openPurchaseDays"
              label="Öppet köp"
              type="number"
              suffix="dagar"
              value={p.openPurchaseDays}
              onChange={num('openPurchaseDays')}
              error={f.errors.openPurchaseDays}
              hint="Minst 14 dagar (lagens ångerrätt)."
            />
            <Input
              id="policies-returnFee"
              label="Returavgift vid ånger"
              type="number"
              suffix="kr"
              value={p.returnFee}
              onChange={num('returnFee')}
              error={f.errors.returnFee}
              hint="Ska motsvara er verkliga kostnad för returfrakt."
            />
            <Input
              id="policies-uncollectedFee"
              label="Avgift för outhämtat paket"
              type="number"
              suffix="kr"
              value={p.uncollectedFee}
              onChange={num('uncollectedFee')}
              error={f.errors.uncollectedFee}
              hint="Era faktiska kostnader för frakt och returfrakt."
            />
          </div>
        </Panel>
        <Panel title="Leverans och köp">
          <div className="admin-form-grid">
            <Input
              id="policies-dispatchDays"
              label="Vi skickar inom"
              value={p.dispatchDays}
              onChange={(v) => f.set('dispatchDays', v)}
              error={f.errors.dispatchDays}
              hint="T.ex. 1–2 vardagar. Visas i toppraden och på produktsidor."
            />
            <Input
              id="policies-ageLimit"
              label="Åldersgräns"
              type="number"
              suffix="år"
              value={p.ageLimit}
              onChange={num('ageLimit')}
              error={f.errors.ageLimit}
              hint="Står i köpvillkoren (eller målsmans godkännande)."
            />
            <Input
              id="policies-termsUpdated"
              label="Villkoren senast ändrade"
              type="date"
              value={p.termsUpdated}
              onChange={(v) => f.set('termsUpdated', v)}
              error={f.errors.termsUpdated}
              hint="Uppdatera när du ändrar något som påverkar villkoren."
            />
          </div>
        </Panel>
      </div>
      <SaveBar dirty={f.dirty} status={f.status} onSave={f.save} onReset={f.reset} />
    </>
  );
}

/** Platshållare för delar som byggs i kommande steg. */
export function ComingSoonView({ title, group, items }: { title: string; group: string; items: string[] }) {
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">{group}</p>
          <h1>{title}</h1>
          <p>Den här delen byggs i ett kommande steg.</p>
        </div>
      </div>
      <section className="admin-panel">
        <header className="admin-panel-head">
          <div>
            <h2>Det här kommer du kunna göra</h2>
          </div>
        </header>
        <div className="admin-panel-body">
          <ul className="admin-plain-list">
            {items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
