import { useEffect, useState } from 'react';

/**
 * Inställningar → Moms & pant. Visar momssatserna från databasen (styrs av lagen och produkttypen)
 * och låter Admin ändra pantbeloppet från ett datum.
 */

const api = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api${path}`;
type Rate = { validFrom: string; validTo: string | null };
type TaxData = {
  today: string;
  vat: { id: string; name: string; rates: (Rate & { rateBp: number })[] }[];
  deposits: { id: string; name: string; rates: (Rate & { amountOre: number })[] }[];
};

const TYPES_FOR: Record<string, string> = {
  'vat-food': 'Livsmedel, Dryck och Kosttillskott',
  'vat-standard': 'Kläder, Träningsutrustning, Kroppsvård, frakt och pant',
};
const pct = (bp: number) => `${(bp / 100).toLocaleString('sv-SE')} %`;
const period = (r: Rate) => (r.validTo ? `${r.validFrom} – ${r.validTo}` : `från ${r.validFrom}`);
const isNow = (r: Rate, today: string) => r.validFrom <= today && (!r.validTo || r.validTo >= today);

export function TaxSettingsView() {
  const [data, setData] = useState<TaxData | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState('');
  const [msg, setMsg] = useState<{ kind: 'saved' | 'error'; text: string } | null>(null);

  const load = () =>
    fetch(api('/admin/tax'))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: TaxData) => setData(d))
      .catch(() => setError('Kunde inte hämta moms och pant. Kontrollera att servern är igång.'));
  useEffect(() => {
    load();
  }, []);

  if (error) return <div className="admin-inline-message" role="alert">{error}</div>;
  if (!data) return <p>Laddar …</p>;

  const save = async (id: string) => {
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value)) return setMsg({ kind: 'error', text: 'Ange beloppet i kronor, t.ex. 1 eller 2.' });
    const res = await fetch(api(`/admin/deposits/${id}/rates`), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ amount: value, validFrom: from }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg({ kind: 'error', text: body.error ?? 'Kunde inte spara.' });
    setMsg({ kind: 'saved', text: `Sparat. Pant ${value} kr gäller från ${from}.` });
    setEditing(null);
    load();
  };

  return (
    <div className="admin-grid two">
      <section className="admin-panel">
        <header className="admin-panel-head">
          <div>
            <h2>Momssatser</h2>
            <p>Följer lagen. Varje produkt får rätt moms automatiskt från sin produkttyp.</p>
          </div>
        </header>
        <div className="admin-panel-body tax-list">
          {data.vat.map((v) => (
            <div key={v.id} className="tax-item">
              <p className="tax-item-name">
                {v.name} <span className="admin-field-hint">· {TYPES_FOR[v.id] ?? ''}</span>
              </p>
              <ul>
                {v.rates.map((r) => (
                  <li key={r.validFrom} className={isNow(r, data.today) ? 'is-now' : r.validFrom > data.today ? 'is-future' : 'is-past'}>
                    <strong>{pct(r.rateBp)}</strong> <span>{period(r)}</span>
                    {isNow(r, data.today) && <span className="tax-badge">Gäller nu</span>}
                    {r.validFrom > data.today && <span className="tax-badge tax-badge--future">Planerad</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="admin-field-hint">Matmomsen är tillfälligt sänkt till 6 % till och med 31 december 2027. Den 1 januari 2028 går den automatiskt tillbaka till 12 %.</p>
        </div>
      </section>

      <section className="admin-panel">
        <header className="admin-panel-head">
          <div>
            <h2>Pant</h2>
            <p>Beloppet läggs på varje burk och visas separat för kunden. Ändras det, gäller det från datumet du väljer.</p>
          </div>
        </header>
        <div className="admin-panel-body tax-list">
          {msg && (
            <p className={`admin-inline-message ${msg.kind === 'error' ? 'is-error' : ''}`} role={msg.kind === 'error' ? 'alert' : 'status'}>
              {msg.text}
            </p>
          )}
          {data.deposits.map((d) => (
            <div key={d.id} className="tax-item">
              <p className="tax-item-name">{d.name}</p>
              <ul>
                {d.rates.map((r) => (
                  <li key={r.validFrom} className={isNow(r, data.today) ? 'is-now' : r.validFrom > data.today ? 'is-future' : 'is-past'}>
                    <strong>{(r.amountOre / 100).toLocaleString('sv-SE')} kr / st</strong> <span>{period(r)}</span>
                    {isNow(r, data.today) && <span className="tax-badge">Gäller nu</span>}
                    {r.validFrom > data.today && <span className="tax-badge tax-badge--future">Planerad</span>}
                  </li>
                ))}
              </ul>
              {editing === d.id ? (
                <div className="tax-edit">
                  <label>
                    Nytt belopp (kr)
                    <input className="admin-control" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid={`input-deposit-${d.id}`} />
                  </label>
                  <label>
                    Gäller från
                    <input className="admin-control" type="date" min={data.today} value={from} onChange={(e) => setFrom(e.target.value)} data-testid={`input-deposit-from-${d.id}`} />
                  </label>
                  <div className="admin-actions">
                    <button type="button" className="admin-btn primary small" onClick={() => save(d.id)} disabled={!amount || !from} data-testid={`button-save-deposit-${d.id}`}>
                      Spara
                    </button>
                    <button type="button" className="admin-btn small" onClick={() => setEditing(null)}>
                      Avbryt
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="admin-btn small"
                  onClick={() => {
                    setEditing(d.id);
                    setAmount('');
                    setFrom(data.today);
                    setMsg(null);
                  }}
                  data-testid={`button-edit-deposit-${d.id}`}
                >
                  Ändra pant
                </button>
              )}
            </div>
          ))}
          <p className="admin-field-hint">Burkar och PET-flaskor upp till 1 liter har 1 kr i pant, större flaskor 2 kr (Pantamera). Pant har normalmoms 25 %. Ordrar som redan är lagda behåller sin pant.</p>
        </div>
      </section>
    </div>
  );
}
