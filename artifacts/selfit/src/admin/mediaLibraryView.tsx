import { useEffect, useState } from 'react';
import { defaultMediaItems, type LocalMediaItem } from './extendedAdminData';
import { useAdminListState } from './adminInteractions';
import './extendedAdmin.css';

export function MediaLibraryView({ items, onItemsChange, id, go, notify }: {
  items: LocalMediaItem[]; onItemsChange: (items: LocalMediaItem[]) => void; id?: string;
  go: (path: string) => void; notify: (message: string) => void;
}) {
  const [search, setSearch] = useAdminListState('media', 'search', '');
  const selected = items.find((item) => item.id === id);
  const [draft, setDraft] = useState<LocalMediaItem | null>(selected ?? null);
  const [replacing, setReplacing] = useState(false);
  useEffect(() => { setDraft(items.find((item) => item.id === id) ?? null); setReplacing(false); }, [id]);
  const add = () => {
    const fresh: LocalMediaItem = { id: `media-local-${Date.now()}`, name: 'Ny exempelbild', src: defaultMediaItems[0].src, alt: '', kind: 'Produktbild', usedBy: [] };
    onItemsChange([...items, fresh]); go(`/admin/media/${fresh.id}`); notify('Exempelbild tillagd. Välj bild och fyll i alternativtext.');
  };
  if (id) {
    if (!draft) return <div className="admin-panel admin-panel-body"><h1>Bilden finns inte</h1><p>Gå tillbaka till mediabiblioteket och välj en bild.</p></div>;
    return <section className="xadmin-stack" data-testid="view-media-detail">
      <header className="xadmin-heading"><div><p className="xadmin-kicker">Mediebibliotek</p><h1>{draft.name}</h1><p>Bildbyte och redigering sker bara i adminprototypen.</p></div></header>
      <div className="xadmin-media-layout">
        <section className="xadmin-panel xadmin-media-detail"><img className="xadmin-media-large" src={draft.src} alt={draft.alt} data-testid="image-media-preview" />
          <button type="button" className="xadmin-button" onClick={() => setReplacing(!replacing)} data-testid="button-replace-media">Byt bild (simulerat)</button>
          {replacing && <section className="xadmin-stack"><h2>Välj ersättningsbild</h2><div className="xadmin-picker-grid">{defaultMediaItems.map((item) => <button type="button" key={item.id} className="xadmin-picker-item" onClick={() => { setDraft({ ...draft, src: item.src }); setReplacing(false); notify('Ersättningsbild vald. Klicka Spara bild för att bekräfta.'); }} data-testid={`button-replace-with-${item.id}`}><img src={item.src} alt="" /><span>{item.name}</span></button>)}</div></section>}
        </section>
        <form className="xadmin-panel xadmin-form" onSubmit={(event) => { event.preventDefault(); onItemsChange(items.map((item) => item.id === draft.id ? draft : item)); notify('Bilden och alternativtexten sparades lokalt.'); }}>
          <label className="xadmin-field-label">Namn<input className="xadmin-control" value={draft.name} required onChange={(event) => setDraft({ ...draft, name: event.target.value })} data-testid="input-media-name" /></label>
          <label className="xadmin-field-label">Alternativtext<input className="xadmin-control" value={draft.alt} required onChange={(event) => setDraft({ ...draft, alt: event.target.value })} data-testid="input-media-alt" /></label>
          <label className="xadmin-field-label">Bildtyp<select className="xadmin-control" value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as LocalMediaItem['kind'] })} data-testid="select-media-kind">{['Produktbild', 'Livsstilsbild', 'Förpackning'].map((kind) => <option key={kind}>{kind}</option>)}</select></label>
          <section aria-label="Produkter som använder bilden"><h2>Används av</h2>{draft.usedBy.length ? <ul className="xadmin-usage-list">{draft.usedBy.map((name) => <li key={name}>{name}</li>)}</ul> : <p>Inte kopplad till någon produkt.</p>}</section>
          <button type="submit" className="xadmin-button is-primary" data-testid="button-save-media">Spara bild</button>
        </form>
      </div>
    </section>;
  }
  const filtered = items.filter((item) => `${item.name} ${item.alt} ${item.usedBy.join(' ')}`.toLocaleLowerCase('sv-SE').includes(search.toLocaleLowerCase('sv-SE')));
  return <section className="xadmin-stack" data-testid="view-media-library">
    <header className="xadmin-heading"><div><p className="xadmin-kicker">Produktinnehåll</p><h1>Mediebibliotek</h1><p>Öppna en bild för bildbyte, alternativtext och produktkopplingar.</p></div><button className="xadmin-button is-primary" type="button" onClick={add} data-testid="button-add-media">Lägg till exempelbild</button></header>
    <label className="xadmin-field-label">Sök media<input className="xadmin-control" value={search} onChange={(event) => setSearch(event.target.value)} data-testid="input-search-media" /></label>
    <div className="xadmin-media-grid">{filtered.map((item) => <button type="button" className="xadmin-media-card" key={item.id} onClick={() => go(`/admin/media/${item.id}`)} data-testid={`button-select-media-${item.id}`}><img src={item.src} alt={item.alt} /><span>{item.name}</span><small>{item.kind} · {item.usedBy.length} produktkopplingar</small></button>)}</div>
    {!filtered.length && <p>Inga bilder matchar sökningen.</p>}
  </section>;
}
