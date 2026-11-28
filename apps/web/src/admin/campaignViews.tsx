import { useEffect, useMemo, useState } from 'react';
import { categories, subcategoriesOf } from '@/data/categories';
import { CAMPAIGN_VALUE_LABELS, type CampaignAppliesTo, type CampaignPlacement, type CampaignValueType } from '@/data/campaigns';
import type { ReactNode } from 'react';
import { call, Card, ChecklistPicker, Radio } from './discountViews';

/**
 * Admin → Marknadsföring → Kampanjer. Ett kampanjpris syns direkt i butiken (REA, överstruket pris),
 * till skillnad från en rabatt som dras i varukorgen.
 * En kampanj har en eller flera rader (t.ex. PWO+ 20 %, Träningskläder 30 %) som delar datum, banner och sida.
 */

type State = 'active' | 'scheduled' | 'expired' | 'disabled';
interface Line {
  id?: string;
  valueType: CampaignValueType;
  value: number;
  appliesTo: CampaignAppliesTo;
}
interface Overlap {
  id: string;
  title: string;
  startsOn: string;
  endsOn: string | null;
  count: number;
  products: string[];
}
interface Campaign {
  id?: string;
  title: string;
  slug: string;
  intro: string;
  lines: Line[];
  startsOn: string;
  endsOn: string | null;
  enabled: boolean;
  banner: { text: string; placement: CampaignPlacement };
  label?: string;
  state?: State;
  locked?: boolean;
  overlaps?: Overlap[];
}
interface Affected {
  slug: string;
  name: string;
  variants: number;
  ordinaryFrom: number | null;
  campaignFrom: number | null;
  notLowered: number;
  line: number | null;
  matchingLines: number;
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

const emptyLine = (): Line => ({ valueType: 'percent', value: 0, appliesTo: { type: 'all', categories: [], brands: [], products: [] } });

const emptyCampaign = (): Campaign => ({
  title: '',
  slug: '',
  intro: '',
  lines: [emptyLine()],
  startsOn: todayIso(),
  endsOn: null,
  enabled: true,
  banner: { text: '', placement: 'none' },
});

const valueText = (c: Pick<Line, 'valueType' | 'value'>) =>
  !(c.value > 0) ? '–' : c.valueType === 'percent' ? `${fmt(c.value)} % rabatt` : c.valueType === 'amount' ? `${fmt(c.value)} kr av priset` : `Kampanjpris ${fmt(c.value)} kr`;

const badgeClass = (s?: State) => (s === 'active' ? 'published' : s === 'scheduled' ? '' : 'archived');

/** Varning: andra kampanjer som pågår samtidigt för samma produkter. */
function OverlapWarning({ list, go }: { list: Overlap[]; go: (path: string) => void }) {
  if (!list.length) return null;
  return (
    <div className="pf-error cp-overlap" role="note" data-testid="warning-campaign-overlap">
      <strong>Krockar med {list.length === 1 ? 'en annan kampanj' : `${list.length} andra kampanjer`}</strong>
      {list.map((o) => (
        <p key={o.id}>
          <a
            href={`/admin/kampanjer/${o.id}`}
            onClick={(e) => {
              e.preventDefault();
              go(`/admin/kampanjer/${o.id}`);
            }}
          >
            {o.title}
          </a>{' '}
          ({period(o)}) gäller också {o.count} {o.count === 1 ? 'produkt' : 'produkter'}: {o.products.join(', ')}
          {o.count > o.products.length ? ' …' : ''}.
        </p>
      ))}
      <p>Kunden får det lägsta priset, aldrig båda rabatterna. Ändra datum eller urval om det inte är meningen.</p>
    </div>
  );
}

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
                    {r.overlaps && r.overlaps.length > 0 && <span className="pf-sub cp-overlap-flag">⚠ Krockar med {r.overlaps.map((o) => o.title).join(', ')}</span>}
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

function LineCard({ title, index, count, locked, onRemove, children }: { title: string; index: number; count: number; locked: boolean; onRemove: () => void; children: ReactNode }) {
  return (
    <Card
      title={title}
      action={
        count > 1 && !locked ? (
          <button type="button" className="pf-icon" onClick={onRemove} aria-label={`Ta bort rad ${index + 1}`} data-testid={`button-campaign-remove-line-${index}`}>
            ✕
          </button>
        ) : undefined
      }
    >
      {children}
    </Card>
  );
}

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
  const [overlaps, setOverlaps] = useState<Overlap[]>([]);
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
  const previewKey = c ? JSON.stringify([c.lines, c.startsOn, c.endsOn]) : '';
  useEffect(() => {
    if (!c) return;
    const t = window.setTimeout(() => {
      call<{ products: Affected[]; overlaps: Overlap[] }>('POST', '/admin/campaigns/preview', {
        id: c.id,
        lines: c.lines.map((l) => ({ ...l, value: l.value || 0 })),
        startsOn: c.startsOn,
        endsOn: c.endsOn,
      })
        .then((r) => {
          setAffected(r.products);
          setOverlaps(r.overlaps);
        })
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
  const productNames = new Map(products.map((p) => [p.slug, p.name]));
  const locked = Boolean(c.locked);
  const set = (patch: Partial<Campaign>) => {
    setC({ ...c, ...patch });
    if (status.kind !== 'saving') setStatus({ kind: 'idle' });
    setConfirm('');
  };
  const setLine = (i: number, patch: Partial<Line>) => set({ lines: c.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const setApplies = (i: number, patch: Partial<CampaignAppliesTo>) => setLine(i, { appliesTo: { ...c.lines[i].appliesTo, ...patch } });
  const brandNames = new Map(brands.map((b) => [b.slug, b.name]));
  const catNames = new Map(catOptions.map((o) => [o.value, o.label.replace(/^Allt i /, '')]));
  const lineTarget = (l: Line) =>
    l.appliesTo.type === 'products' && l.appliesTo.products.length
      ? l.appliesTo.products.map((p) => productNames.get(p) ?? p).join(', ')
      : l.appliesTo.type === 'brands' && l.appliesTo.brands.length
        ? l.appliesTo.brands.map((b) => brandNames.get(b) ?? b).join(', ')
        : l.appliesTo.type === 'categories' && l.appliesTo.categories.length
          ? l.appliesTo.categories.map((x) => catNames.get(x) ?? x).join(', ')
          : APPLIES[l.appliesTo.type];

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

          {c.lines.map((l, i) => (
            <LineCard
              key={l.id ?? `ny-${i}`}
              index={i}
              count={c.lines.length}
              title={c.lines.length > 1 ? `Rad ${i + 1}` : 'Kampanjpris'}
              locked={locked}
              onRemove={() => set({ lines: c.lines.filter((_, j) => j !== i) })}
            >
              <div className="dc-value-row">
                <select
                  className="pf-input"
                  aria-label="Typ av prissänkning"
                  value={l.valueType}
                  disabled={locked}
                  onChange={(e) => {
                    const valueType = e.target.value as CampaignValueType;
                    setLine(i, { valueType, appliesTo: valueType === 'price' ? { ...l.appliesTo, type: 'products' } : l.appliesTo });
                  }}
                  data-testid={`select-campaign-value-type-${i}`}
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
                    max={l.valueType === 'percent' ? 99 : undefined}
                    inputMode="decimal"
                    aria-label={l.valueType === 'percent' ? 'Procent' : 'Kronor'}
                    value={l.value || ''}
                    placeholder="0"
                    disabled={locked}
                    onChange={(e) => setLine(i, { value: Number(e.target.value) })}
                    data-testid={`input-campaign-value-${i}`}
                  />
                  <span>{l.valueType === 'percent' ? '%' : 'kr'}</span>
                </div>
              </div>
              <p className="pf-help">
                {l.valueType === 'percent'
                  ? 'Priset avrundas till hela kronor, t.ex. 349 kr − 20 % = 279 kr.'
                  : l.valueType === 'amount'
                    ? 'Beloppet dras från priset på varje vara, t.ex. 349 kr − 50 kr = 299 kr.'
                    : 'Alla valda produkter får samma pris. Passar bäst när du väljer en enda produkt.'}
              </p>
              <div className="pf-field">
                <label htmlFor={`cp-applies-${i}`}>Gäller för</label>
                <select
                  id={`cp-applies-${i}`}
                  className="pf-input"
                  value={l.appliesTo.type}
                  disabled={locked || l.valueType === 'price'}
                  onChange={(e) => setApplies(i, { type: e.target.value as CampaignAppliesTo['type'] })}
                  data-testid={`select-campaign-applies-${i}`}
                >
                  {(Object.keys(APPLIES) as CampaignAppliesTo['type'][]).map((k) => (
                    <option key={k} value={k}>
                      {APPLIES[k]}
                    </option>
                  ))}
                </select>
              </div>
              {locked ? (
                <p className="pf-help">{lineTarget(l)}</p>
              ) : (
                <>
                  {l.appliesTo.type === 'categories' && <ChecklistPicker id={`cp-cats-${i}`} label="Kategorier" placeholder="Sök kategori" options={catOptions} selected={l.appliesTo.categories} onChange={(v) => setApplies(i, { categories: v })} />}
                  {l.appliesTo.type === 'brands' && (
                    <ChecklistPicker id={`cp-brands-${i}`} label="Varumärken" placeholder="Sök varumärke" options={brands.map((b) => ({ value: b.slug, label: b.name }))} selected={l.appliesTo.brands} onChange={(v) => setApplies(i, { brands: v })} />
                  )}
                  {l.appliesTo.type === 'products' && (
                    <ChecklistPicker id={`cp-products-${i}`} label="Produkter" placeholder="Sök produkt" options={products.map((p) => ({ value: p.slug, label: p.name }))} selected={l.appliesTo.products} onChange={(v) => setApplies(i, { products: v })} />
                  )}
                </>
              )}
            </LineCard>
          ))}
          {locked ? (
            <p className="pf-help">Kampanjen har redan börjat. Rader kan inte ändras, eftersom de finns i prishistoriken.</p>
          ) : (
            <div className="cp-add-line">
              <button type="button" className="pf-add" onClick={() => set({ lines: [...c.lines, emptyLine()] })} data-testid="button-campaign-add-line">
                ＋ Lägg till rad
              </button>
              {c.lines.length > 1 && <p className="pf-help">Hamnar en produkt på flera rader gäller den mest specifika: produkt före varumärke före kategori. Aldrig dubbel rabatt.</p>}
            </div>
          )}

          <Card title={`Produkter i kampanjen${affected ? ` (${affected.length})` : ''}`}>
            {affected === null ? (
              <p className="pf-help">Laddar …</p>
            ) : affected.length === 0 ? (
              <p className="pf-help">Inga produkter än. Välj vad kampanjen gäller ovan.</p>
            ) : (
              <>
                <OverlapWarning list={overlaps} go={go} />
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
                      {c.lines.length > 1 && <th scope="col">Rad</th>}
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
                        {c.lines.length > 1 && (
                          <td className="pf-sub">
                            {a.line ? `Rad ${a.line}` : '–'}
                            {a.matchingLines > 1 ? ` (finns på ${a.matchingLines} rader, den mest specifika gäller)` : ''}
                          </td>
                        )}
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
                {c.lines.map((l, i) => (
                  <li key={l.id ?? i}>
                    {valueText(l)} – {lineTarget(l)}
                  </li>
                ))}
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
