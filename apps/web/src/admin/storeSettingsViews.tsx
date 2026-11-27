import { useEffect, useState, type ReactNode } from 'react';
import { SHIPPING_METHOD_IDS, shippingPrice, type ShippingMethod, type ShippingMethodId, type ShippingSettings } from '@/data/shipping';
import { TextCheck, useSiteSettings } from './textCheck';
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
        description="Ändra här så uppdateras alla texter som använder fälten, t.ex. {leveranstid} och {öppet köp}: köpvillkor, returvillkor, topprad, startsida, produktsidor och kassan."
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
              hint="T.ex. 1–2 vardagar. Fältet {leveranstid}. Visas på produktsidor, i varukorgen och i texter som använder fältet."
            />
            <Input
              id="policies-orderCutoff"
              label="Beställ före"
              value={p.orderCutoff}
              onChange={(v) => f.set('orderCutoff', v)}
              error={f.errors.orderCutoff}
              hint="Klockslag, t.ex. 14:00. Fältet {beställ före}."
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

const krText = (n: number) => (n === 0 ? 'Fri' : `${n.toLocaleString('sv-SE')} kr`);

/** Inställningar → Frakt. Priserna och gränsen används i varukorgen, kassan och alla texter med {fri frakt}. */
export function ShippingSettingsView() {
  const f = useSettingsForm('shipping');
  const sh = f.value as ShippingSettings;
  const site = useSiteSettings();
  const preview = { ...site, shipping: sh };
  const setMethod = (id: ShippingMethodId, patch: Partial<ShippingMethod>) => f.set('methods', { ...sh.methods, [id]: { ...sh.methods[id], ...patch } });
  const num = (v: string) => (v === '' ? 0 : Number(v.replace(',', '.')));
  const examples = [Math.max(0, Math.round(sh.freeFrom * 0.6)), sh.freeFrom];
  const noneActive = !SHIPPING_METHOD_IDS.some((id) => sh.methods[id].active);
  return (
    <>
      <Heading
        title="Frakt"
        description="Fraktsätt, priser och gränsen för fri frakt. Ändras det här, ändras det överallt: varukorgen, kassan, produktsidorna och alla texter med {fri frakt}."
      />
      {noneActive && (
        <div className="admin-inline-message is-error" role="alert">
          Minst ett fraktsätt måste vara på, annars kan ingen handla.
        </div>
      )}
      <div className="admin-grid two">
        <Panel title="Fri frakt" subtitle="Gäller alla fraktsätt">
          <div className="admin-form-grid">
            <Input
              id="shipping-freeFrom"
              label="Fri frakt från"
              type="number"
              suffix="kr"
              value={sh.freeFrom}
              onChange={(v) => f.set('freeFrom', num(v))}
              error={f.errors.freeFrom}
              hint="Räknas på varorna efter rabatt, utan pant. När ordern når gränsen gäller priset ”över gränsen” nedan."
              wide
            />
          </div>
          <p className="admin-field-hint">
            <strong>Så blir frakten:</strong>
          </p>
          <ul className="admin-field-hint">
            {examples.map((amount) => (
              <li key={amount}>
                Varor för {amount.toLocaleString('sv-SE')} kr:{' '}
                {SHIPPING_METHOD_IDS.filter((id) => sh.methods[id].active)
                  .map((id) => `${sh.methods[id].name} ${krText(shippingPrice(id, amount, sh))}`)
                  .join(' · ')}
              </li>
            ))}
          </ul>
          <p className="admin-field-hint">
            <strong>Rabatter:</strong> en rabatt som minskar ordern under gränsen kan göra att kunden får betala frakt. Kassan räknar alltid fram det som blir billigast för kunden. En rabatt av typen ”Fri frakt” gör alla fraktsätt gratis. Över {sh.freeFrom.toLocaleString('sv-SE')} kr gäller redan priserna ”över gränsen”, så en fri frakt-rabatt med köpkrav över gränsen gör bara skillnad för fraktsätt som kostar något där.
          </p>
        </Panel>
        {SHIPPING_METHOD_IDS.map((id) => {
          const m = sh.methods[id];
          return (
            <Panel key={id} title={m.name || 'Fraktsätt'} subtitle={m.active ? 'Visas i kassan' : 'Avstängt – visas inte i kassan'}>
              <div className="admin-form-grid">
                <label className="admin-toggle-row span-2">
                  <input type="checkbox" checked={m.active} onChange={(e) => setMethod(id, { active: e.target.checked })} data-testid={`check-shipping-${id}-active`} /> Visa i kassan
                </label>
                <Input id={`shipping-${id}-name`} label="Namn" value={m.name} onChange={(v) => setMethod(id, { name: v })} wide />
                <div className="admin-field span-2">
                  <Input id={`shipping-${id}-text`} label="Text i kassan" value={m.text} onChange={(v) => setMethod(id, { text: v })} hint="Skriv {leveranstid} så följer texten Villkor och avgifter." wide />
                  <TextCheck text={m.text} settings={preview} />
                </div>
                <Input id={`shipping-${id}-price`} label="Pris" type="number" suffix="kr" value={m.price} onChange={(v) => setMethod(id, { price: num(v) })} />
                <Input
                  id={`shipping-${id}-priceOverFree`}
                  label={`Pris över ${sh.freeFrom.toLocaleString('sv-SE')} kr`}
                  type="number"
                  suffix="kr"
                  value={m.priceOverFree}
                  onChange={(v) => setMethod(id, { priceOverFree: num(v) })}
                  hint="0 = fri frakt."
                />
                {m.priceOverFree > m.price && (
                  <p className="admin-field-error span-2" role="alert">
                    Priset över gränsen kan inte vara högre än det vanliga priset.
                  </p>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
      <SaveBar dirty={f.dirty} status={f.status} onSave={f.save} onReset={f.reset} />
    </>
  );
}
