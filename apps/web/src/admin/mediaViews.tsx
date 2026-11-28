import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Mediebiblioteket: alla bilder som laddats upp i Admin, plus butikens egna bilder.
 * Används både som egen sida (Katalog → Mediebibliotek) och som väljare i produktformuläret.
 */

const api = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api${path}`;

export interface MediaItem {
  id?: string;
  src: string;
  name: string;
  alt?: string;
  bytes?: number;
  createdAt?: string;
  usedBy: string[];
}

interface Library {
  uploads: MediaItem[];
  site: MediaItem[];
}

/** Förminskar bilden i webbläsaren (max 1600 px, WebP) innan den laddas upp. */
export async function shrinkImage(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.86));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Laddar upp en bild till mediebiblioteket. */
export async function uploadImage(file: File, alt = ''): Promise<MediaItem> {
  const blob = await shrinkImage(file);
  const fd = new FormData();
  const okType = ['image/webp', 'image/jpeg', 'image/png'].includes(blob.type) ? blob.type : 'image/png';
  fd.append('file', new File([blob], file.name, { type: okType }));
  fd.append('alt', alt);
  const res = await fetch(api('/admin/media'), { method: 'POST', body: fd });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Kunde inte ladda upp bilden.');
  return body as MediaItem;
}

function useLibrary() {
  const [lib, setLib] = useState<Library | null>(null);
  const [error, setError] = useState('');
  const load = () =>
    fetch(api('/admin/media'))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setLib)
      .catch(() => setError('Kunde inte hämta mediebiblioteket. Kontrollera att servern är igång.'));
  useEffect(() => {
    load();
  }, []);
  return { lib, error, reload: load, setLib };
}

const kb = (b?: number) => (b ? `${Math.max(1, Math.round(b / 1024))} kB` : '');

function Uploader({ onDone, compact }: { onDone: (items: MediaItem[]) => void; compact?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');
  const handle = async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setError('');
    setBusy(list.length);
    const done: MediaItem[] = [];
    for (const f of list) {
      try {
        done.push(await uploadImage(f));
      } catch (e) {
        setError(`${f.name}: ${(e as Error).message}`);
      }
      setBusy((n) => n - 1);
    }
    onDone(done);
  };
  return (
    <div
      className={`admin-dropzone${drag ? ' is-drag' : ''}${compact ? ' compact' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files);
      }}
    >
      <p>Dra in bilder hit, eller</p>
      <button type="button" className="admin-btn" onClick={() => ref.current?.click()} data-testid="button-media-upload">
        Ladda upp från datorn
      </button>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && handle(e.target.files)} data-testid="input-media-upload" />
      {busy > 0 && <p role="status">Laddar upp {busy} …</p>}
      {error && (
        <p role="alert" className="admin-field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function Grid({
  items,
  selected,
  onToggle,
  onOpen,
}: {
  items: MediaItem[];
  selected?: Set<string>;
  onToggle?: (src: string) => void;
  onOpen?: (item: MediaItem) => void;
}) {
  if (!items.length) return <p className="admin-muted">Inga bilder här ännu.</p>;
  return (
    <ul className="admin-media-grid">
      {items.map((m) => {
        const isSel = selected?.has(m.src) ?? false;
        return (
          <li key={m.src}>
            <button
              type="button"
              className={`admin-media-item${isSel ? ' is-selected' : ''}`}
              aria-pressed={onToggle ? isSel : undefined}
              onClick={() => (onToggle ? onToggle(m.src) : onOpen?.(m))}
              data-testid={`media-${m.name}`}
            >
              <img src={m.src} alt="" loading="lazy" />
              {isSel && (
                <span className="admin-media-check" aria-hidden="true">
                  ✓
                </span>
              )}
              <span className="admin-media-name">{m.name}</span>
              {m.usedBy.length > 0 && <span className="admin-media-used">Används ({m.usedBy.length})</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Väljare som öppnas från produktformuläret. */
export function MediaPicker({ open, onClose, onPick, already }: { open: boolean; onClose: () => void; onPick: (items: MediaItem[]) => void; already: string[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { lib, error, setLib } = useLibrary();
  const [tab, setTab] = useState<'uploads' | 'site'>('uploads');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setSelected(new Set());
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const items = useMemo(() => {
    const list = (lib?.[tab] ?? []).filter((m) => !already.includes(m.src));
    const needle = q.trim().toLowerCase();
    return needle ? list.filter((m) => `${m.name} ${m.alt ?? ''}`.toLowerCase().includes(needle)) : list;
  }, [lib, tab, q, already]);

  const all = [...(lib?.uploads ?? []), ...(lib?.site ?? [])];
  const toggle = (src: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(src)) n.delete(src);
      else n.add(src);
      return n;
    });

  return (
    <dialog
      ref={ref}
      className="admin-media-dialog"
      aria-label="Välj bilder från mediebiblioteket"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="admin-media-dialog-inner">
        <header className="admin-media-dialog-head">
          <h2>Mediebibliotek</h2>
          <button type="button" className="admin-btn small" onClick={onClose} aria-label="Stäng">
            ✕
          </button>
        </header>
        <div className="admin-tabs" role="group" aria-label="Visa">
          <button type="button" className="admin-tab" aria-pressed={tab === 'uploads'} onClick={() => setTab('uploads')}>
            Uppladdade <span className="admin-tab-count">{lib?.uploads.length ?? 0}</span>
          </button>
          <button type="button" className="admin-tab" aria-pressed={tab === 'site'} onClick={() => setTab('site')}>
            Butikens bilder <span className="admin-tab-count">{lib?.site.length ?? 0}</span>
          </button>
          <input className="admin-control admin-media-search" type="search" placeholder="Sök bild" aria-label="Sök bild" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {tab === 'uploads' && (
          <Uploader
            compact
            onDone={(added) => {
              setLib((l) => (l ? { ...l, uploads: [...added, ...l.uploads] } : l));
              setSelected((s) => new Set([...s, ...added.map((a) => a.src)]));
            }}
          />
        )}
        {error && (
          <p role="alert" className="admin-field-error">
            {error}
          </p>
        )}
        <div className="admin-media-dialog-body">{lib ? <Grid items={items} selected={selected} onToggle={toggle} /> : <p>Laddar …</p>}</div>
        <footer className="admin-media-dialog-foot">
          <span>{selected.size ? `${selected.size} ${selected.size === 1 ? 'bild vald' : 'bilder valda'}` : 'Klicka på bilderna du vill använda.'}</span>
          <div className="admin-actions">
            <button type="button" className="admin-btn" onClick={onClose}>
              Avbryt
            </button>
            <button
              type="button"
              className="admin-btn primary"
              disabled={!selected.size}
              onClick={() => {
                onPick(all.filter((m) => selected.has(m.src)));
                onClose();
              }}
              data-testid="button-media-pick"
            >
              Lägg till {selected.size || ''}
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}

/** Sidan Katalog → Mediebibliotek. */
export function MediaLibraryPage() {
  const { lib, error, reload, setLib } = useLibrary();
  const [tab, setTab] = useState<'uploads' | 'site'>('uploads');
  const [q, setQ] = useState('');
  const [active, setActive] = useState<MediaItem | null>(null);
  const [draft, setDraft] = useState({ name: '', alt: '' });
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const items = useMemo(() => {
    const list = lib?.[tab] ?? [];
    const needle = q.trim().toLowerCase();
    return needle ? list.filter((m) => `${m.name} ${m.alt ?? ''}`.toLowerCase().includes(needle)) : list;
  }, [lib, tab, q]);

  const open = (m: MediaItem) => {
    setActive(m);
    setDraft({ name: m.name, alt: m.alt ?? '' });
    setConfirmDelete(false);
    setMsg('');
  };

  const save = async () => {
    if (!active?.id) return;
    const res = await fetch(api(`/admin/media/${active.id}`), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft) });
    const body = await res.json();
    if (!res.ok) return setMsg(body.error ?? 'Kunde inte spara.');
    setLib((l) => (l ? { ...l, uploads: l.uploads.map((u) => (u.id === active.id ? { ...u, ...draft } : u)) } : l));
    setActive({ ...active, ...draft });
    setMsg('Sparat.');
  };

  const remove = async () => {
    if (!active?.id) return;
    if (!confirmDelete) return setConfirmDelete(true);
    const res = await fetch(api(`/admin/media/${active.id}`), { method: 'DELETE' });
    const body = await res.json();
    if (!res.ok) {
      setConfirmDelete(false);
      return setMsg(body.error ?? 'Kunde inte ta bort bilden.');
    }
    setActive(null);
    reload();
  };

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">Katalog</p>
          <h1>Mediebibliotek</h1>
          <p>Alla bilder du laddat upp. Bilder du laddar upp i en produkt hamnar också här, och kan återanvändas i andra produkter.</p>
        </div>
      </div>
      {error && (
        <div className="admin-inline-message" role="alert">
          {error}
        </div>
      )}
      <Uploader onDone={(added) => setLib((l) => (l ? { ...l, uploads: [...added, ...l.uploads] } : l))} />
      <div className="admin-tabs admin-media-tabs" role="group" aria-label="Visa">
        <button type="button" className="admin-tab" aria-pressed={tab === 'uploads'} onClick={() => setTab('uploads')}>
          Uppladdade <span className="admin-tab-count">{lib?.uploads.length ?? 0}</span>
        </button>
        <button type="button" className="admin-tab" aria-pressed={tab === 'site'} onClick={() => setTab('site')}>
          Butikens bilder <span className="admin-tab-count">{lib?.site.length ?? 0}</span>
        </button>
        <input className="admin-control admin-media-search" type="search" placeholder="Sök bild" aria-label="Sök bild" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="admin-media-layout">
        <section className="admin-panel">
          <div className="admin-panel-body">{lib ? <Grid items={items} onOpen={open} /> : <p>Laddar …</p>}</div>
        </section>
        {active && (
          <aside className="admin-panel admin-media-detail" aria-label="Vald bild">
            <div className="admin-panel-body">
              <img src={active.src} alt={active.alt ?? ''} />
              {active.id ? (
                <>
                  <div className="admin-field">
                    <label htmlFor="media-name">Namn</label>
                    <input id="media-name" className="admin-control" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="media-alt">Bildtext</label>
                    <input id="media-alt" className="admin-control" value={draft.alt} onChange={(e) => setDraft({ ...draft, alt: e.target.value })} placeholder="Beskriv bilden" />
                    <span className="admin-field-hint">Läses upp för personer som inte ser bilden.</span>
                  </div>
                </>
              ) : (
                <p className="admin-field-hint">Butikens egna bilder kan användas i produkter men inte ändras eller tas bort här.</p>
              )}
              <p className="admin-field-hint">
                {kb(active.bytes)} {active.usedBy.length ? `· Används av: ${active.usedBy.join(', ')}` : '· Används inte av någon produkt'}
              </p>
              {msg && <p role="status">{msg}</p>}
              <div className="admin-actions">
                {active.id && (
                  <button type="button" className="admin-btn primary" onClick={save}>
                    Spara
                  </button>
                )}
                {active.id && (
                  <button type="button" className={`admin-btn ${confirmDelete ? 'danger' : ''}`} onClick={remove} data-testid="button-media-delete">
                    {confirmDelete ? 'Klicka igen för att flytta till papperskorgen' : 'Ta bort'}
                  </button>
                )}
                <button type="button" className="admin-btn" onClick={() => setActive(null)}>
                  Stäng
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
