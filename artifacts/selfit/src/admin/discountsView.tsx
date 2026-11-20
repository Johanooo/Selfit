import { useEffect, useState, type FormEvent } from 'react';
import { NavigableRows, useAdminListState } from './adminInteractions';

type Discount = {
  id: string; code: string; type: string; valueKind: string; value: string; from: string; to: string;
  minimum: string; maxUses: string; applicable: string; combinable: boolean; status: string; uses: number;
};
const emptyDiscount: Discount = { id: '', code: '', type: 'Kod', valueKind: 'Procent', value: '', from: '', to: '', minimum: '', maxUses: '', applicable: '', combinable: false, status: 'Utkast', uses: 0 };
const seed: Discount[] = [
  { ...emptyDiscount, id: 'valkommen10', code: 'VÄLKOMMEN10', value: '10', from: '2026-11-01', to: '2026-11-30', minimum: '199', maxUses: '250', applicable: 'Träning, Hälsa', status: 'Aktiv', uses: 82 },
  { ...emptyDiscount, id: 'bars3for2', code: '3 FÖR 2 · BARS', type: 'Kvantitet', valueKind: 'Procent', value: '33', applicable: 'Proteinbars', status: 'Aktiv' },
  { ...emptyDiscount, id: 'november15', code: 'NOVEMBER15', value: '15', from: '2026-11-01', to: '2026-11-15', maxUses: '150', status: 'Avslutad', uses: 149 },
];

export function DiscountsView({ id, go, notify, onTitleChange }: { id?: string; go: (path: string) => void; notify: (message: string) => void; onTitleChange: (value: string) => void }) {
  const [rows, setRows] = useAdminListState('rabatter', 'data', seed);
  const [status, setStatus] = useAdminListState('rabatter', 'status', 'Alla statusar');
  const [kind, setKind] = useAdminListState('rabatter', 'type', 'Alla typer');
  const [draft, setDraft] = useState<Discount>(() => rows.find((row) => row.id === id) ?? emptyDiscount);
  useEffect(() => { setDraft(rows.find((row) => row.id === id) ?? { ...emptyDiscount }); }, [id]);
  useEffect(() => { if (id) onTitleChange(id === 'ny' ? 'Ny rabatt' : draft.code || 'Rabatt'); }, [id, draft.code]);
  const patch = (key: keyof Discount, value: string | boolean) => setDraft((current) => ({ ...current, [key]: value }));
  const save = (event?: FormEvent, nextStatus?: string) => {
    event?.preventDefault();
    if (!draft.code.trim() || !draft.value || Number(draft.value) < 0) { notify('Ange namn/kod och ett giltigt rabattvärde.'); return; }
    if (draft.to && draft.from && draft.to < draft.from) { notify('Slutdatum måste vara efter startdatum.'); return; }
    if (rows.some((row) => row.id !== draft.id && row.code.toLocaleLowerCase('sv-SE') === draft.code.trim().toLocaleLowerCase('sv-SE'))) { notify('En rabatt med samma namn/kod finns redan.'); return; }
    const saved = { ...draft, id: draft.id || `rabatt-${Date.now()}`, code: draft.code.trim(), status: nextStatus ?? draft.status };
    setRows((current) => current.some((row) => row.id === saved.id) ? current.map((row) => row.id === saved.id ? saved : row) : [...current, saved]);
    setDraft(saved);
    if (id === 'ny') go(`/admin/rabatter/${saved.id}`);
    notify(nextStatus ? `Rabatten är ${nextStatus.toLocaleLowerCase('sv-SE')}. Sparat lokalt.` : 'Rabatten sparades lokalt.');
  };
  const field = (label: string, key: keyof Discount, testId: string, type = 'text') => <label className="admin-field"><span>{label}</span><input className="admin-control" type={type} value={String(draft[key])} onChange={(event) => patch(key, event.target.value)} data-testid={testId} required={key === 'code' || key === 'value'} min={type === 'number' ? 0 : undefined} /></label>;
  const select = (label: string, key: keyof Discount, options: string[], testId: string) => <label className="admin-field"><span>{label}</span><select className="admin-control" value={String(draft[key])} onChange={(event) => patch(key, event.target.value)} data-testid={testId}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
  if (id) return <section data-testid="view-discount-editor">
    <div className="admin-page-heading"><div><p className="admin-kicker">Butik / kampanj</p><h1>{id === 'ny' ? 'Ny rabatt' : draft.code}</h1><p>Redigera rabattens villkor. Alla ändringar är simulerade.</p></div></div>
    <div className="admin-notice info" role="note"><div><strong>Visa 30-dagars lägsta pris</strong>Vid prissänkning ska kunden se produktens lägsta pris under de senaste 30 dagarna.</div></div>
    <form className="admin-panel" onSubmit={(event) => save(event)}>
      <div className="admin-panel-body admin-form-grid three">
        {field('Namn / kod', 'code', 'input-discount-code')}
        {select('Rabattform', 'type', ['Kod', 'Automatisk', 'Kvantitet'], 'select-discount-type')}
        {select('Värdetyp', 'valueKind', ['Procent', 'Fast belopp (kr)'], 'select-discount-value')}
        {field('Rabattvärde', 'value', 'input-discount-value', 'number')}
        {field('Gäller från', 'from', 'input-discount-from', 'date')}
        {field('Gäller till', 'to', 'input-discount-to', 'date')}
        {field('Minsta ordervärde (kr)', 'minimum', 'input-discount-minimum', 'number')}
        {field('Max antal användningar', 'maxUses', 'input-discount-max-uses', 'number')}
        {field('Produkter / kategorier', 'applicable', 'input-discount-applicable')}
        {select('Status', 'status', ['Utkast', 'Aktiv', 'Pausad', 'Avslutad'], 'select-discount-status')}
        <label className="admin-toggle-row"><input type="checkbox" checked={draft.combinable} onChange={(event) => patch('combinable', event.target.checked)} data-testid="check-discount-combinable" /> Kan kombineras med andra rabatter</label>
        <div className="admin-actions span-2">
          <button type="submit" className="admin-btn primary" data-testid="button-save-discount">Spara rabatt</button>
          <button type="button" className="admin-btn" onClick={() => save(undefined, draft.status === 'Pausad' ? 'Aktiv' : 'Pausad')} data-testid="button-pause-discount">{draft.status === 'Pausad' ? 'Aktivera rabatt' : 'Pausa rabatt'}</button>
          <button type="button" className="admin-btn danger" onClick={() => save(undefined, 'Avslutad')} data-testid="button-end-discount">Avsluta rabatt</button>
        </div>
      </div>
    </form>
  </section>;
  const filtered = rows.filter((row) => (status === 'Alla statusar' || row.status === status) && (kind === 'Alla typer' || row.type === kind));
  const headers = ['Rabatt', 'Typ', 'Värde', 'Giltighet', 'Användningar', 'Status', 'Åtgärd'];
  return <>
    <div className="admin-page-heading"><div><p className="admin-kicker">Butik / kampanj</p><h1>Rabatter</h1><p>Rabattkoder, automatiska erbjudanden och mängdrabatter.</p></div><button className="admin-btn primary" type="button" onClick={() => go('/admin/rabatter/ny')} data-testid="button-create-discount">＋ Ny rabatt</button></div>
    <div className="admin-toolbar">
      <label className="admin-filter-label">Status<select className="admin-control" value={status} onChange={(event) => setStatus(event.target.value)} data-testid="filter-discount-status">{['Alla statusar', 'Aktiv', 'Pausad', 'Avslutad', 'Utkast'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="admin-filter-label">Typ<select className="admin-control" value={kind} onChange={(event) => setKind(event.target.value)} data-testid="filter-discount-type">{['Alla typer', 'Kod', 'Automatisk', 'Kvantitet'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <span>{filtered.length} rabatter</span>
    </div>
    <div className="admin-panel admin-table-wrap"><table className="admin-table" data-testid="table-discounts"><thead><tr>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead><tbody><NavigableRows go={go} tableId="discounts" headers={headers}>
      {filtered.map((row) => <tr key={row.id} data-row-href={`/admin/rabatter/${row.id}`} data-row-label={`Redigera ${row.code}`}><td><strong>{row.code}</strong></td><td>{row.type}</td><td>{row.value} {row.valueKind === 'Procent' ? '%' : 'kr'}</td><td>{row.from || 'Löpande'} {row.to && `– ${row.to}`}</td><td>{row.uses} / {row.maxUses || 'Obegränsat'}</td><td><span className={`admin-status ${row.status === 'Aktiv' ? 'good' : 'warn'}`}>{row.status}</span></td><td><button type="button" className="admin-btn small" onClick={() => go(`/admin/rabatter/${row.id}`)} data-testid={`button-edit-discount-${row.id}`}>Redigera</button></td></tr>)}
    </NavigableRows>{!filtered.length && <tr><td colSpan={7}>Inga rabatter matchar filtren.</td></tr>}</tbody></table></div>
  </>;
}
