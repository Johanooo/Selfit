import { useEffect, useMemo, useState } from 'react';

/** Admin → Rapporter → Ändringslogg. Går bara att läsa. */

type Row = { id: number; at: string; actor: string; action: string; object: string; details: { field: string; from: unknown; to: unknown }[] | null };

const FIELD_NAMES: Record<string, string> = {
  brand: 'Varumärke',
  legalName: 'Bolagsnamn',
  orgNr: 'Org.nr',
  vatNr: 'Momsnummer',
  address: 'Adress',
  email: 'E-post',
  phone: 'Telefon',
  hours: 'Öppettider',
  emailProvider: 'E-posttjänst',
  openPurchaseDays: 'Öppet köp (dagar)',
  returnFee: 'Returavgift (kr)',
  uncollectedFee: 'Outhämtat paket (kr)',
  ageLimit: 'Åldersgräns',
  dispatchDays: 'Leveranstid',
  termsUpdated: 'Villkoren ändrade',
};

const show = (v: unknown) => {
  if (v === undefined || v === null || v === '') return '–';
  const s = String(v);
  return s.startsWith('[FYLL') ? '(tomt)' : s.length > 80 ? `${s.slice(0, 80)} …` : s;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export function AuditLogView() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/admin/audit?limit=500`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows)
      .catch(() => setError('Kunde inte hämta loggen. Kontrollera att servern är igång.'));
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!rows || !needle) return rows ?? [];
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(needle));
  }, [rows, q]);

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">Rapporter</p>
          <h1>Ändringslogg</h1>
          <p>Vem som ändrade vad och när. Raderna skrivs automatiskt och kan inte ändras eller tas bort – inte ens av administratörer.</p>
        </div>
      </div>
      {error && <div className="admin-inline-message" role="alert">{error}</div>}
      <section className="admin-panel">
        <header className="admin-panel-head">
          <div>
            <h2>Alla ändringar</h2>
            <p>{rows ? `${shown.length} av ${rows.length} rader` : 'Laddar …'}</p>
          </div>
          <input
            className="admin-control admin-log-search"
            type="search"
            placeholder="Sök på person, sida eller fält"
            aria-label="Sök i ändringsloggen"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="input-audit-search"
          />
        </header>
        <div className="admin-table-wrap">
          <table className="admin-table" data-testid="table-audit-log">
            <thead>
              <tr>
                <th scope="col">Tid</th>
                <th scope="col">Utförd av</th>
                <th scope="col">Händelse</th>
                <th scope="col">Vad</th>
                <th scope="col">Ändring</th>
              </tr>
            </thead>
            <tbody>
              {rows && shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="admin-muted">
                    {rows.length === 0 ? 'Inga ändringar ännu. När något sparas i Admin syns det här.' : 'Inga rader matchar sökningen.'}
                  </td>
                </tr>
              )}
              {shown.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.at)}</td>
                  <td>{r.actor}</td>
                  <td>{r.action}</td>
                  <td>{r.object}</td>
                  <td>
                    {r.details?.length ? (
                      <ul className="admin-log-changes">
                        {r.details.map((d, i) => (
                          <li key={i}>
                            <strong>{FIELD_NAMES[d.field] ?? d.field}:</strong> {show(d.from)} → {show(d.to)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="admin-muted">–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
