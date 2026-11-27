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
  deposits: { id: string; name: string; products: number; rates: (Rate & { amountOre: number })[] }[];
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
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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

  const send = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(api(path), { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? 'Kunde inte spara.');
    return data;
  };

  const create = async () => {
    const value = Number(addAmount.replace(',', '.'));
    if (!addAmount || !Number.isFinite(value)) return setMsg({ kind: 'error', text: 'Ange beloppet i kronor, t.ex. 2.' });
    try {
      await send('POST', '/admin/deposits', { name: addName.trim(), amount: value });
      setMsg({ kind: 'saved', text: `Panten "${addName.trim()}" är skapad. Nu kan du välja den på produkterna.` });
      setAdding(false);
      setAddName('');
      setAddAmount('');
      load();
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    }
  };

  const rename = async (id: string) => {
    try {
      await send('PATCH', `/admin/deposits/${id}`, { name: newName.trim() });
      setMsg({ kind: 'saved', text: 'Namnet är sparat.' });
      setRenaming(null);
      load();
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    }
  };

  const remove = async (id: string, name: string) => {
    if (confirmDelete !== id) return setConfirmDelete(id);
    setConfirmDelete(null);
    try {
      await send('DELETE', `/admin/deposits/${id}`);
      setMsg({ kind: 'saved', text: `${name} är borttagen.` });
      load();
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    }
  };

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
            <p>Skapa en pant för varje belopp du behöver, t.ex. "Burk 2 kr". Sedan väljer du panten på produkten. Beloppet läggs på varje burk och visas separat för kunden.</p>
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
              {renaming === d.id ? (
                <div className="tax-edit">
                  <label>
                    Namn
                    <input className="admin-control" value={newName} onChange={(e) => setNewName(e.target.value)} data-testid={`input-deposit-name-${d.id}`} />
                  </label>
                  <div className="admin-actions">
                    <button type="button" className="admin-btn primary small" onClick={() => rename(d.id)} disabled={!newName.trim()}>
                      Spara namn
                    </button>
                    <button type="button" className="admin-btn small" onClick={() => setRenaming(null)}>
                      Avbryt
                    </button>
                  </div>
                </div>
              ) : (
                <p className="tax-item-name">
                  {d.name}{' '}
                  <span className="admin-field-hint">
                    · {d.products === 0 ? 'Används inte' : d.products === 1 ? '1 produkt' : `${d.products} produkter`}
                  </span>
                </p>
              )}
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
                <div className="admin-actions">
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
                    Ändra belopp
                  </button>
                  <button
                    type="button"
                    className="admin-btn small"
                    onClick={() => {
                      setRenaming(d.id);
                      setNewName(d.name);
                      setMsg(null);
                    }}
                  >
                    Byt namn
                  </button>
                  <button
                    type="button"
                    className="admin-btn small danger"
                    onClick={() => remove(d.id, d.name)}
                    title={d.products ? 'Byt pant på produkterna först' : undefined}
                    data-testid={`button-delete-deposit-${d.id}`}
                  >
                    {confirmDelete === d.id ? 'Klicka igen' : 'Ta bort'}
                  </button>
                </div>
              )}
            </div>
          ))}
          {adding ? (
            <div className="tax-item tax-edit">
              <label>
                Namn
                <input className="admin-control" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="T.ex. Burk 2 kr" data-testid="input-new-deposit-name" />
              </label>
              <label>
                Belopp (kr per st)
                <input className="admin-control" inputMode="decimal" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} placeholder="2" data-testid="input-new-deposit-amount" />
              </label>
              <div className="admin-actions">
                <button type="button" className="admin-btn primary small" onClick={create} disabled={!addName.trim() || !addAmount} data-testid="button-create-deposit">
                  Skapa pant
                </button>
                <button type="button" className="admin-btn small" onClick={() => setAdding(false)}>
                  Avbryt
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="admin-btn"
              onClick={() => {
                setAdding(true);
                setMsg(null);
              }}
              data-testid="button-add-deposit"
            >
              + Lägg till pant
            </button>
          )}
          <p className="admin-field-hint">
            Sedan hösten 2025 är panten 2 kr för burkar och små PET-flaskor och 3 kr för stora PET-flaskor. Burkar med gamla märkningen (1 kr och 2 kr) säljs ut till och med 2026. Välj alltid beloppet som står på förpackningen. Pant har normalmoms 25 %, och ordrar som redan är lagda behåller sin pant.
          </p>
        </div>
      </section>
    </div>
  );
}
