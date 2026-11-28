import { useEffect, useMemo, useState } from 'react';
import { categories, subcategoriesOf } from '@/data/categories';
import { CAMPAIGN_VALUE_LABELS, type CampaignAppliesTo, type CampaignPlacement, type CampaignValueType } from '@/data/campaigns';
import { call, Card, ChecklistPicker, Radio } from './discountViews';

/**
 * Admin → Marknadsföring → Kampanjer. Ett kampanjpris syns direkt i butiken (REA, överstruket pris),
 * till skillnad från en rabatt som dras i varukorgen.
 */

type State = 'active' | 'scheduled' | 'expired' | 'disabled';
interface Campaign {
  id?: string;
  title: string;
  slug: string;
  intro: string;
  valueType: CampaignValueType;
  value: number;
  appliesTo: CampaignAppliesTo;
  startsOn: string;
  endsOn: string | null;
  enabled: boolean;
  banner: { text: string; placement: CampaignPlacement };
  label?: string;
  state?: State;
  locked?: boolean;
}
interface Affected {
  slug: string;
  name: string;
  variants: number;
  ordinaryFrom: number | null;
  campaignFrom: number | null;
  notLowered: number;
}

const STATE: Record<State, string> = { active: 'Pågår', scheduled: 'Schemalagd', expired: 'Avslutad', disabled: 'Avstängd' };
const PLACEMENT: Record<CampaignPlacement, string> = { none: 'Ingen banner', home: 'Startsidan', topbar: 'Toppraden (alla sidor)', both: 'Startsidan och toppraden' };
const APPLIES: Record<CampaignAppliesTo['type'], string> = { all: 'Alla produkter', categories: 'Vissa kategorier', brands: 'Vissa varumärken', products: 'Vissa produkter' };

const fmt = (n: number) => new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(n);
const todayIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
const showDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
const period = (c: Pick<Campaign, 'startsOn' | 'endsOn'>) => `${showDay(c.startsOn)} – ${c.endsOn ? showDay(c.endsOn) : 'tills vidare'}`;

/** "Black Week 2026" → "black-week-2026" */
export const slugify = (t: string) =>
  t
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const emptyCampaign = (): Campaign => ({
  title: '',
  slug: '',
  intro: '',
  valueType: 'percent',
  value: 0,
  appliesTo: { type: 'all', categories: [], brands: [], products: [] },
  startsOn: todayIso(),
  endsOn: null,
  enabled: true,
  banner: { text: '', placement: 'none' },
});

const valueText = (c: Pick<Campaign, 'valueType' | 'value'>) =>
  !(c.value > 0) ? '–' : c.valueType === 'percent' ? `${fmt(c.value)} % rabatt` : c.valueType === 'amount' ? `${fmt(c.value)} kr av priset` : `Kampanjpris ${fmt(c.value)} kr`;

const badgeClass = (s?: State) => (s === 'active' ? 'published' : s === 'scheduled' ? '' : 'archived');

// ---------------------------------------------------------------- Lista

function CampaignList({ go }: { go: (path: string) => void }) {
  const [rows, setRows] = useState<Campaign[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    call<Campaign[]>('GET', '/admin/campaigns')
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);
  const open = (id?: string) => go(`/admin/kampanjer/${id}`);
  return (
    <div className="pf">
      <div className="pf-top">
        <h1>Kampanjer</h1>
        <button type="button" className="pf-btn primary pf-top-action" onClick={() => go('/admin/kampanjer/ny')} data-testid="button-create-campaign">
          Skapa kampanj
        </button>
      </div>
      {error && (
        <p className="pf-error" role="alert">
          {error}
        </p>
      )}
      <section className="pf-card pf-flush">
        {rows === null ? (
          <p className="pf-empty">Laddar …</p>
        ) : rows.length === 0 ? (
          <div className="pf-empty dc-empty">
            <p>
              <strong>Inga kampanjer än</strong>
            </p>
            <p>En kampanj sänker priset direkt i butiken under en period. Kunden ser REA, det nya priset och lägsta pris de senaste 30 dagarna.</p>
            <button type="button" className="pf-btn primary" onClick={() => go('/admin/kampanjer/ny')}>
              Skapa kampanj
            </button>
          </div>
        ) : (
          <table className="pf-table pf-list" data-testid="table-campaigns">
            <thead>
              <tr>
                <th scope="col">Kampanj</th>
                <th scope="col">Status</th>
                <th scope="col">Period</th>
                <th scope="col">Banner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="dc-row" onClick={() => open(r.id)}>
                  <th scope="row">
                    <a
                      href={`/admin/kampanjer/${r.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        open(r.id);
                      }}
                    >
                      <strong>{r.title}</strong>
                    </a>
                    <span className="pf-sub">{r.label}</span>
                  </th>
                  <td>
                    <span className={`pf-badge ${badgeClass(r.state)}`}>{STATE[r.state!]}</span>
                  </td>
                  <td className="pf-sub">{period(r)}</td>
                  <td className="pf-sub">{r.banner.placement === 'none' ? '–' : PLACEMENT[r.banner.placement]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Formulär

function CampaignForm({ id, go, onTitleChange }: { id: string; go: (path: string) => void; onTitleChange: (t: string) => void }) {
  const isNew = id === 'ny';
  const [c, setC] = useState<Campaign | null>(isNew ? emptyCampaign() : null);
  const [base, setBase] = useState(isNew ? JSON.stringify(emptyCampaign()) : '');
  const [slugEdited, setSlugEdited] = useState(!isNew);
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'saved' | 'error'; text?: string }>(() => {
    const flash = sessionStorage.getItem('admin-campaign-flash');
    sessionStorage.removeItem('admin-campaign-flash');
    return flash ? { kind: 'saved', text: flash } : { kind: 'idle' };
  });
  const [products, setProducts] = useState<{ slug: string; name: string }[]>([]);
  const [brands, setBrands] = useState<{ slug: string; name: string }[]>([]);
  const [affected, setAffected] = useState<Affected[] | null>(null);
  const [confirm, setConfirm] = useState<'' | 'delete' | 'end'>('');

  useEffect(() => {
    call<{ slug: string; name: string; status: string }[]>('GET', '/admin/products')
      .then((list) => setProducts(list.filter((p) => p.status !== 'archived').map((p) => ({ slug: p.slug, name: p.name }))))
      .catch(() => undefined);
    call<{ slug: string; name: string }[]>('GET', '/admin/brands')
      .then((list) => setBrands(list.map((b) => ({ slug: b.slug, name: b.name }))))
      .catch(() => undefined);
    if (isNew) return;
    call<Campaign>('GET', `/admin/campaigns/${id}`)
      .then((x) => {
        setC(x);
        setBase(JSON.stringify(x));
      })
      .catch((e: Error) => setStatus({ kind: 'error', text: e.message }));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (c) onTitleChange(isNew ? 'Skapa kampanj' : c.title);
  }, [c?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  // Förhandsvisning: vilka produkter som får kampanjpris med nuvarande val.
  const previewKey = c ? JSON.stringify([c.valueType, c.value, c.appliesTo]) : '';
  useEffect(() => {
    if (!c) return;
    const t = window.setTimeout(() => {
      call<Affected[]>('POST', '/admin/campaigns/preview', { valueType: c.valueType, value: c.value || 0, appliesTo: c.appliesTo })
        .then(setAffected)
        .catch(() => setAffected(null));
    }, 300);
    return () => window.clearTimeout(t);
  }, [previewKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const catOptions = useMemo(
    () => categories.flatMap((x) => [{ value: x.slug, label: `Allt i ${x.name}`, group: x.name }, ...subcategoriesOf(x.slug).map((s) => ({ value: s.slug, label: s.name, group: x.name }))]),
    [],
  );

  if (!c) return <p>{status.text ?? 'Laddar …'}</p>;

  const dirty = JSON.stringify(c) !== base;
  const locked = Boolean(c.locked);
  const set = (patch: Partial<Campaign>) => {
    setC({ ...c, ...patch });
    if (status.kind !== 'saving') setStatus({ kind: 'idle' });
    setConfirm('');
  };
  const setApplies = (patch: Partial<CampaignAppliesTo>) => set({ appliesTo: { ...c.appliesTo, ...patch } });

  const save = async () => {
    setStatus({ kind: 'saving' });
    try {
      const saved = isNew ? await call<Campaign>('POST', '/admin/campaigns', c) : await call<Campaign>('PUT', `/admin/campaigns/${id}`, c);
      const text = saved.state === 'active' ? 'Sparat. Kampanjpriset syns nu i butiken.' : saved.state === 'scheduled' ? `Sparat. Kampanjen startar ${showDay(saved.startsOn)}.` : 'Sparat. Kampanjen syns inte i butiken just nu.';
      if (isNew) {
        sessionStorage.setItem('admin-campaign-flash', text);
        go(`/admin/kampanjer/${saved.id}`);
        return;
      }
      setC(saved);
      setBase(JSON.stringify(saved));
      setStatus({ kind: 'saved', text });
    } catch (e) {
      setStatus({ kind: 'error', text: (e as Error).message });
    }
  };

  const endNow = async () => {
    if (confirm !== 'end') return setConfirm('end');
    try {
      const saved = await call<Campaign>('POST', `/admin/campaigns/${id}/end`);
      setC(saved);
      setBase(JSON.stringify(saved));
      setConfirm('');
      setStatus({ kind: 'saved', text: 'Kampanjen är avslutad. Ordinarie pris gäller igen.' });
    } catch (e) {
      setConfirm('');
      setStatus({ kind: 'error', text: (e as Error).message });
    }
  };

  const remove = async () => {
    if (confirm !== 'delete') return setConfirm('delete');
    try {
      await call('DELETE', `/admin/campaigns/${id}`);
      go('/admin/kampanjer');
    } catch (e) {
      setConfirm('');
      setStatus({ kind: 'error', text: (e as Error).message });
    }
  };

  const productNames = new Map(products.map((p) => [p.slug, p.name]));
  const notLowered = (affected ?? []).reduce((n, a) => n + a.notLowered, 0);
  const showBanner = c.banner.placement !== 'none';

  return (
    <div className="pf">
      <div className="pf-top">
        <button type="button" className="pf-back" onClick={() => go('/admin/kampanjer')} aria-label="Tillbaka till kampanjer" data-testid="button-campaign-back">
          ←
        </button>
        <h1>{isNew ? 'Skapa kampanj' : c.title}</h1>
        {c.state && <span className={`pf-badge ${badgeClass(c.state)}`}>{STATE[c.state]}</span>}
      </div>

      <div className="pf-grid">
        <div className="pf-main">
          <Card title="Kampanj">
            <div className="pf-field">
              <label htmlFor="cp-title">Namn</label>
              <input
                id="cp-title"
                className="pf-input"
                value={c.title}
                maxLength={80}
                placeholder="T.ex. Black Week"
                onChange={(e) => set({ title: e.target.value, ...(slugEdited ? {} : { slug: slugify(e.target.value) }) })}
                data-testid="input-campaign-title"
              />
              <p className="pf-help">Visas som rubrik på kampanjsidan.</p>
            </div>
            <div className="pf-field">
              <label htmlFor="cp-slug">Adress till kampanjsidan</label>
              <div className="pf-affix pf-affix--before">
                <span>/kampanj/</span>
                <input
                  id="cp-slug"
                  className="pf-input"
                  value={c.slug}
                  maxLength={60}
                  placeholder="black-week"
                  onChange={(e) => {
                    setSlugEdited(true);
                    set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
                  }}
                  data-testid="input-campaign-slug"
                />
              </div>
            </div>
            <div className="pf-field">
              <label htmlFor="cp-intro">Text på kampanjsidan</label>
              <textarea id="cp-intro" className="pf-input" rows={3} maxLength={600} value={c.intro} onChange={(e) => set({ intro: e.target.value })} placeholder="T.ex. Veckans bästa priser på PWO+ och protein." data-testid="input-campaign-intro" />
            </div>
          </Card>

          <Card title="Kampanjpris">
            {locked && <p className="pf-help">Kampanjen har redan börjat. Pris och produkter kan inte ändras, eftersom de finns i prishistoriken.</p>}
            <div className="dc-value-row">
              <select
                className="pf-input"
                aria-label="Typ av prissänkning"
                value={c.valueType}
                disabled={locked}
                onChange={(e) => {
                  const valueType = e.target.value as CampaignValueType;
                  set({ valueType, appliesTo: valueType === 'price' ? { ...c.appliesTo, type: 'products' } : c.appliesTo });
                }}
                data-testid="select-campaign-value-type"
              >
                {(Object.keys(CAMPAIGN_VALUE_LABELS) as CampaignValueType[]).map((k) => (
                  <option key={k} value={k}>
                    {CAMPAIGN_VALUE_LABELS[k]}
                  </option>
                ))}
              </select>
              <div className="pf-affix">
                <input
                  className="pf-input"
                  type="number"
                  min={0}
                  max={c.valueType === 'percent' ? 99 : undefined}
                  inputMode="decimal"
                  aria-label={c.valueType === 'percent' ? 'Procent' : 'Kronor'}
                  value={c.value || ''}
                  placeholder="0"
                  disabled={locked}
                  onChange={(e) => set({ value: Number(e.target.value) })}
                  data-testid="input-campaign-value"
                />
                <span>{c.valueType === 'percent' ? '%' : 'kr'}</span>
              </div>
            </div>
            <p className="pf-help">
              {c.valueType === 'percent'
                ? 'Priset avrundas till hela kronor, t.ex. 349 kr − 20 % = 279 kr.'
                : c.valueType === 'amount'
                  ? 'Beloppet dras från priset på varje vara, t.ex. 349 kr − 50 kr = 299 kr.'
                  : 'Alla valda produkter får samma pris. Passar bäst när du väljer en enda produkt.'}
            </p>
            <div className="pf-field">
              <label htmlFor="cp-applies">Gäller för</label>
              <select
                id="cp-applies"
                className="pf-input"
                value={c.appliesTo.type}
                disabled={locked || c.valueType === 'price'}
                onChange={(e) => setApplies({ type: e.target.value as CampaignAppliesTo['type'] })}
                data-testid="select-campaign-applies"
              >
                {(Object.keys(APPLIES) as CampaignAppliesTo['type'][]).map((k) => (
                  <option key={k} value={k}>
                    {APPLIES[k]}
                  </option>
                ))}
              </select>
            </div>
            {!locked && c.appliesTo.type === 'categories' && <ChecklistPicker id="cp-cats" label="Kategorier" placeholder="Sök kategori" options={catOptions} selected={c.appliesTo.categories} onChange={(v) => setApplies({ categories: v })} />}
            {!locked && c.appliesTo.type === 'brands' && (
              <ChecklistPicker id="cp-brands" label="Varumärken" placeholder="Sök varumärke" options={brands.map((b) => ({ value: b.slug, label: b.name }))} selected={c.appliesTo.brands} onChange={(v) => setApplies({ brands: v })} />
            )}
            {!locked && c.appliesTo.type === 'products' && (
              <ChecklistPicker id="cp-products" label="Produkter" placeholder="Sök produkt" options={products.map((p) => ({ value: p.slug, label: p.name }))} selected={c.appliesTo.products} onChange={(v) => setApplies({ products: v })} />
            )}
          </Card>

          <Card title={`Produkter i kampanjen${affected ? ` (${affected.length})` : ''}`}>
            {affected === null ? (
              <p className="pf-help">Laddar …</p>
            ) : affected.length === 0 ? (
              <p className="pf-help">Inga produkter än. Välj vad kampanjen gäller ovan.</p>
            ) : (
              <>
                {notLowered > 0 && (
                  <p className="pf-error" role="note" data-testid="warning-campaign-not-lowered">
                    {notLowered} {notLowered === 1 ? 'variant kostar' : 'varianter kostar'} redan mindre än kampanjpriset och får ingen kampanj.
                  </p>
                )}
                <table className="pf-table" data-testid="table-campaign-products">
                  <thead>
                    <tr>
                      <th scope="col">Produkt</th>
                      <th scope="col">Ordinarie från</th>
                      <th scope="col">Kampanjpris från</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affected.slice(0, 50).map((a) => (
                      <tr key={a.slug}>
                        <th scope="row">
                          {a.name}
                          <span className="pf-sub">
                            {a.variants} {a.variants === 1 ? 'variant' : 'varianter'}
                          </span>
                        </th>
                        <td>{a.ordinaryFrom === null ? '–' : `${fmt(a.ordinaryFrom)} kr`}</td>
                        <td>
                          <strong>{a.campaignFrom === null ? '–' : `${fmt(a.campaignFrom)} kr`}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {affected.length > 50 && <p className="pf-help">… och {affected.length - 50} till.</p>}
              </>
            )}
          </Card>

          <Card title="Schema">
            <div className="pf-row two">
              <div className="pf-field">
                <label htmlFor="cp-start">Första dagen</label>
                <input id="cp-start" className="pf-input" type="date" value={c.startsOn} disabled={locked} onChange={(e) => e.target.value && set({ startsOn: e.target.value })} data-testid="input-campaign-start" />
              </div>
              <div className="pf-field">
                <label htmlFor="cp-end">Sista dagen</label>
                <input id="cp-end" className="pf-input" type="date" value={c.endsOn ?? ''} min={c.startsOn} onChange={(e) => set({ endsOn: e.target.value || null })} data-testid="input-campaign-end" />
              </div>
            </div>
            <p className="pf-help">Kampanjen startar 00:00 första dagen och slutar 23:59 sista dagen (svensk tid). Tomt slutdatum = tills vidare.</p>
          </Card>

          <Card title="Banner">
            <div className="dc-radios">
              {(Object.keys(PLACEMENT) as CampaignPlacement[]).map((k) => (
                <Radio key={k} name="cp-banner" checked={c.banner.placement === k} onChange={() => set({ banner: { ...c.banner, placement: k } })} testId={`radio-campaign-banner-${k}`}>
                  {PLACEMENT[k]}
                </Radio>
              ))}
            </div>
            {showBanner && (
              <div className="pf-field">
                <label htmlFor="cp-banner-text">Text i bannern</label>
                <input id="cp-banner-text" className="pf-input" value={c.banner.text} maxLength={120} onChange={(e) => set({ banner: { ...c.banner, text: e.target.value } })} placeholder="T.ex. Black Week – upp till 30 % på PWO+" data-testid="input-campaign-banner-text" />
                <p className="pf-help">Visas bara medan kampanjen pågår och länkar till kampanjsidan.</p>
              </div>
            )}
          </Card>
        </div>

        <aside className="pf-side">
          <Card>
            <div className="dc-summary">
              <p className="dc-summary-code">{c.title || 'Inget namn än'}</p>
              <p className="pf-sub">/kampanj/{c.slug || '…'}</p>
              <h3>Detaljer</h3>
              <ul data-testid="list-campaign-summary">
                <li>{valueText(c)}</li>
                <li>
                  {c.appliesTo.type === 'products' && c.appliesTo.products.length
                    ? c.appliesTo.products.map((p) => productNames.get(p) ?? p).join(', ')
                    : APPLIES[c.appliesTo.type]}
                </li>
                <li>{period(c)}</li>
                <li>{showBanner ? `Banner: ${PLACEMENT[c.banner.placement]}` : 'Ingen banner'}</li>
                <li>Lägsta pris 30 dagar visas automatiskt</li>
                <li>Rabattkoder gäller inte kampanjvaror, om inte rabatten är inställd på det</li>
              </ul>
              {c.state === 'active' && c.slug && (
                <p>
                  <a href={`/kampanj/${c.slug}`} target="_blank" rel="noreferrer">
                    Visa kampanjsidan ↗
                  </a>
                </p>
              )}
            </div>
          </Card>
          <Card title="Status">
            <label className="pf-toggle">
              <input type="checkbox" checked={c.enabled} disabled={locked} onChange={(e) => set({ enabled: e.target.checked })} data-testid="check-campaign-enabled" /> Kampanjen är påslagen
            </label>
            <p className="pf-help">{locked ? 'Kampanjen har börjat. Använd "Avsluta nu" för att sluta tidigare.' : 'Stäng av för att pausa kampanjen innan den börjar.'}</p>
          </Card>
          {!isNew && (
            <Card title="Fler åtgärder">
              {c.state === 'active' && (
                <p>
                  <button type="button" className={`pf-link danger${confirm === 'end' ? ' confirm' : ''}`} onClick={endNow} data-testid="button-end-campaign">
                    {confirm === 'end' ? 'Klicka igen för att avsluta kampanjen nu' : 'Avsluta nu'}
                  </button>
                </p>
              )}
              {locked ? (
                <p className="pf-help">Kampanjen finns i prishistoriken och kan inte tas bort.</p>
              ) : (
                <button type="button" className={`pf-link danger${confirm === 'delete' ? ' confirm' : ''}`} onClick={remove} data-testid="button-delete-campaign">
                  {confirm === 'delete' ? 'Klicka igen för att ta bort för gott' : 'Ta bort kampanjen'}
                </button>
              )}
            </Card>
          )}
        </aside>
      </div>

      <div className={`pf-savebar${dirty || isNew ? ' is-dirty' : ''}`}>
        <p role="status" className={`pf-savebar-msg ${status.kind}`} data-testid="status-campaign-save">
          {status.kind === 'saving' ? 'Sparar …' : (status.text ?? (isNew ? 'Ny kampanj – inget är sparat än' : dirty ? 'Osparade ändringar' : 'Allt är sparat'))}
        </p>
        <div className="pf-savebar-actions">
          {dirty && !isNew && (
            <button type="button" className="pf-btn ghost" onClick={() => setC(JSON.parse(base))}>
              Ångra
            </button>
          )}
          <button type="button" className="pf-btn primary" onClick={save} disabled={status.kind === 'saving' || (!dirty && !isNew)} data-testid="button-save-campaign">
            {isNew ? 'Spara kampanj' : 'Spara'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CampaignsView({ id, go, onTitleChange }: { id?: string; go: (path: string) => void; onTitleChange: (value: string) => void }) {
  return id ? <CampaignForm key={id} id={id} go={go} onTitleChange={onTitleChange} /> : <CampaignList go={go} />;
}
