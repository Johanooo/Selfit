import { useState, type ReactNode } from 'react';
import { collections } from '@/data/categories';
import { defaultHome, defaultNavigation, SERVICE_ICONS, type HomeSection, type LinkItem, type MenuLink, type ProductRow, type RowSource, type ServiceIcon } from '@/data/homeDefaults';
import { defaultPages } from '@/data/pageTemplates';
import { visibleCategories } from '@/data/taxonomy';
import { sourceOptions } from '@/lib/homeContent';
import { MediaPicker, uploadImage } from './mediaViews';
import { SaveBar, useSettingsForm } from './storeSettingsViews';

/**
 * Admin → Innehåll → Startsida och Topprad och meny.
 * Sparas som inställningarna "home" och "navigation" och syns direkt i butiken.
 */

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Vanliga adresser i butiken, som förslag när man skriver en länk. */
function LinkSuggestions() {
  const links = [
    { href: '/', label: 'Startsidan' },
    ...visibleCategories().map((c) => ({ href: `/kategori/${c.slug}`, label: c.name })),
    ...collections.map((c) => ({ href: `/kollektion/${c.slug}`, label: c.name })),
    ...defaultPages.map((p) => ({ href: `/support/${p.slug}`, label: p.title })),
    { href: '/support', label: 'Kundservice' },
    { href: '/ordersparning', label: 'Spåra order' },
    { href: '/retur', label: 'Anmäl retur' },
  ];
  return (
    <datalist id="store-links">
      {links.map((l) => (
        <option key={l.href} value={l.href}>
          {l.label}
        </option>
      ))}
    </datalist>
  );
}

function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="admin-panel-body">{children}</div>
    </section>
  );
}

function moveItem<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const next = [...list];
  const [x] = next.splice(i, 1);
  next.splice(i + dir, 0, x);
  return next;
}

function OrderButtons({ i, count, onMove, label }: { i: number; count: number; onMove: (dir: -1 | 1) => void; label: string }) {
  return (
    <>
      <button type="button" className="admin-btn small" onClick={() => onMove(-1)} disabled={i === 0} aria-label={`Flytta ${label} upp`}>
        ↑
      </button>
      <button type="button" className="admin-btn small" onClick={() => onMove(1)} disabled={i === count - 1} aria-label={`Flytta ${label} ner`}>
        ↓
      </button>
    </>
  );
}

/** En lista med länkar (text + adress) som kan sorteras. */
function LinkListEditor({ id, items, onChange, max, labelText = 'Text', addLabel = '＋ Lägg till' }: { id: string; items: LinkItem[]; onChange: (v: LinkItem[]) => void; max: number; labelText?: string; addLabel?: string }) {
  return (
    <div className="home-links">
      {items.map((l, i) => (
        <div className="home-link-row" key={i}>
          <input className="admin-control" aria-label={`${labelText} ${i + 1}`} value={l.label} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder={labelText} data-testid={`input-${id}-${i}-label`} />
          <input className="admin-control" aria-label={`Länk ${i + 1}`} list="store-links" value={l.href} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} placeholder="Länk, t.ex. /kategori/drycker (valfri)" data-testid={`input-${id}-${i}-href`} />
          <div className="admin-actions">
            <OrderButtons i={i} count={items.length} onMove={(d) => onChange(moveItem(items, i, d))} label={`rad ${i + 1}`} />
            <button type="button" className="admin-btn small danger" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Ta bort rad ${i + 1}`}>
              ✕
            </button>
          </div>
        </div>
      ))}
      {items.length < max ? (
        <button type="button" className="admin-btn small" onClick={() => onChange([...items, { label: '', href: '' }])} data-testid={`button-add-${id}`}>
          {addLabel}
        </button>
      ) : (
        <p className="admin-field-hint">Max {max} st.</p>
      )}
    </div>
  );
}

const FIELDS_HELP = 'Fält som {leveranstid} och {öppet köp} fylls i automatiskt från Inställningar.';

export function HomepageAdminView() {
  const form = useSettingsForm('home');
  const [pickerOpen, setPickerOpen] = useState<null | 'hero' | 'ig'>(null);
  const [uploading, setUploading] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [addBlock, setAddBlock] = useState('');
  if (!form.loaded && form.status.kind !== 'error') return <p>Laddar …</p>;
  const home = form.value;
  const hero = home.hero;
  const setHero = (patch: Partial<typeof hero>) => form.set('hero', { ...hero, ...patch });
  const setRow = (id: string, patch: Partial<ProductRow>) => form.set('rows', home.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const sources = sourceOptions();
  const missingBlocks = (['categories', 'pwo', 'services', 'instagram'] as const).filter((k) => !home.sections.some((s) => s.kind === k));
  const blockName = (s: HomeSection) =>
    s.kind === 'row' ? home.rows.find((r) => r.id === s.id)?.title || 'Produktrad' : s.kind === 'categories' ? 'Kategorirutor' : s.kind === 'pwo' ? 'PWO+-bandet' : s.kind === 'instagram' ? 'Instagram-remsa' : 'Fördelar (ikoner längst ner)';

  const addSection = () => {
    if (addBlock === 'row') {
      const id = `row-${Date.now().toString(36)}`;
      const row: ProductRow = { id, title: 'Ny produktrad', source: 'popular', limit: 10, moreLabel: 'Se alla', moreHref: '', visible: true };
      form.set('rows', [...home.rows, row]);
      form.set('sections', [...home.sections, { kind: 'row', id }]);
      setOpenRow(id);
    } else if (addBlock) {
      form.set('sections', [...home.sections, { kind: addBlock as 'categories' | 'pwo' | 'services' | 'instagram' }]);
    }
    setAddBlock('');
  };
  const removeSection = (i: number) => {
    const s = home.sections[i];
    form.set('sections', home.sections.filter((_, j) => j !== i));
    if (s.kind === 'row') form.set('rows', home.rows.filter((r) => r.id !== s.id));
  };

  const upload = async (files: FileList) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const item = await uploadImage(file, 'Startbild');
      setHero({ image: item.src });
    } finally {
      setUploading(false);
    }
  };
  const ig = home.instagram;
  const setIg = (patch: Partial<typeof ig>) => form.set('instagram', { ...ig, ...patch });
  const uploadIg = async (files: FileList) => {
    setUploading(true);
    try {
      const added: { src: string; href: string }[] = [];
      for (const file of Array.from(files).slice(0, 16 - ig.images.length)) {
        const item = await uploadImage(file, `Instagram ${ig.handle}`);
        added.push({ src: item.src, href: '' });
      }
      setIg({ images: [...ig.images, ...added] });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">Innehåll</p>
          <h1>Startsida</h1>
          <p>
            Bilden högst upp, snabblänkarna och blocken under.{' '}
            <a href={`${base}/`} target="_blank" rel="noopener">
              Öppna startsidan
            </a>
          </p>
        </div>
      </div>
      <LinkSuggestions />
      {form.status.kind === 'error' && !form.loaded && <div className="admin-inline-message" role="alert">{form.status.text}</div>}

      <div className="admin-grid home-admin">
        <Panel title="Startbild" subtitle="Den stora bilden högst upp på startsidan.">
          <div className="home-hero-editor">
            <div className="home-hero-preview" style={{ backgroundImage: `url(${hero.image.startsWith('/') ? base + hero.image : hero.image})` }}>
              <div>
                {hero.tag && <span className="home-hero-tag">{hero.tag}</span>}
                <strong>{hero.title.split('\n').map((l, i) => <span key={i}>{l}</span>)}</strong>
              </div>
            </div>
            <div className="admin-actions">
              <button type="button" className="admin-btn small" onClick={() => setPickerOpen('hero')} data-testid="button-pick-hero-image">
                Välj bild
              </button>
              <label className="admin-btn small">
                {uploading ? 'Laddar upp …' : 'Ladda upp ny'}
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files && upload(e.target.files)} data-testid="input-hero-upload" />
              </label>
              <span className="admin-field-hint">Liggande bild, gärna minst 1600 px bred. Texten hamnar till vänster.</span>
            </div>
          </div>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="hero-tag">Liten etikett</label>
              <input id="hero-tag" className="admin-control" value={hero.tag} onChange={(e) => setHero({ tag: e.target.value })} placeholder="T.ex. Nyhet · PWO+" data-testid="input-hero-tag" />
            </div>
            <div className="admin-field">
              <label htmlFor="hero-title">Rubrik</label>
              <textarea id="hero-title" className="admin-control" rows={2} value={hero.title} onChange={(e) => setHero({ title: e.target.value })} data-testid="input-hero-title" />
              <span className="admin-field-hint">Enter = ny rad. Visas i versaler.</span>
            </div>
            <div className="admin-field span-2">
              <label htmlFor="hero-lead">Text under rubriken</label>
              <textarea id="hero-lead" className="admin-control" rows={2} value={hero.lead} onChange={(e) => setHero({ lead: e.target.value })} data-testid="input-hero-lead" />
            </div>
            <div className="admin-field">
              <label htmlFor="hero-p-label">Vit knapp</label>
              <input id="hero-p-label" className="admin-control" value={hero.primary.label} onChange={(e) => setHero({ primary: { ...hero.primary, label: e.target.value } })} placeholder="Text på knappen" />
              <input className="admin-control" aria-label="Länk för vit knapp" list="store-links" value={hero.primary.href} onChange={(e) => setHero({ primary: { ...hero.primary, href: e.target.value } })} placeholder="Länk" />
            </div>
            <div className="admin-field">
              <label htmlFor="hero-s-label">Genomskinlig knapp (valfri)</label>
              <input id="hero-s-label" className="admin-control" value={hero.secondary.label} onChange={(e) => setHero({ secondary: { ...hero.secondary, label: e.target.value } })} placeholder="Tom = ingen knapp" />
              <input className="admin-control" aria-label="Länk för genomskinlig knapp" list="store-links" value={hero.secondary.href} onChange={(e) => setHero({ secondary: { ...hero.secondary, href: e.target.value } })} placeholder="Länk" />
            </div>
          </div>
        </Panel>

        <Panel title="Snabblänkar" subtitle="Knapparna direkt under bilden.">
          <LinkListEditor id="quick" items={home.quickLinks} onChange={(v) => form.set('quickLinks', v)} max={12} addLabel="＋ Lägg till snabblänk" />
        </Panel>

        <Panel title="Block på startsidan" subtitle="Ordningen här är ordningen på sidan. Klicka på en produktrad för att ändra den.">
          <ol className="home-blocks">
            {home.sections.map((s, i) => {
              const row = s.kind === 'row' ? home.rows.find((r) => r.id === s.id) : undefined;
              const key = s.kind === 'row' ? s.id : s.kind;
              return (
                <li key={key} className={`home-block${openRow === key ? ' is-open' : ''}${row && !row.visible ? ' is-hidden' : ''}`} data-testid={`home-block-${key}`}>
                  <div className="home-block-row">
                    <button type="button" className="home-block-toggle" onClick={() => setOpenRow(openRow === key ? null : key)} aria-expanded={openRow === key}>
                      <span className="home-block-kind">{s.kind === 'row' ? 'Produktrad' : 'Block'}</span>
                      <span className="home-block-name">{blockName(s)}</span>
                      {row && !row.visible && <span className="faq-admin-cat faq-admin-cat--hidden">Dold</span>}
                    </button>
                    <div className="admin-actions">
                      <OrderButtons i={i} count={home.sections.length} onMove={(d) => form.set('sections', moveItem(home.sections, i, d))} label={blockName(s)} />
                      <button type="button" className="admin-btn small danger" onClick={() => removeSection(i)} aria-label={`Ta bort ${blockName(s)}`} data-testid={`button-remove-block-${key}`}>
                        ✕
                      </button>
                    </div>
                  </div>
                  {openRow === key && row && (
                    <div className="admin-form-grid home-block-body">
                      <div className="admin-field">
                        <label htmlFor={`row-${row.id}-title`}>Rubrik</label>
                        <input id={`row-${row.id}-title`} className="admin-control" value={row.title} onChange={(e) => setRow(row.id, { title: e.target.value })} data-testid={`input-row-${row.id}-title`} />
                      </div>
                      <div className="admin-field">
                        <label htmlFor={`row-${row.id}-source`}>Visar</label>
                        <select id={`row-${row.id}-source`} className="admin-control" value={row.source} onChange={(e) => setRow(row.id, { source: e.target.value as RowSource })} data-testid={`select-row-${row.id}-source`}>
                          {sources.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="admin-field">
                        <label htmlFor={`row-${row.id}-more`}>Knapp bredvid rubriken</label>
                        <input id={`row-${row.id}-more`} className="admin-control" value={row.moreLabel} onChange={(e) => setRow(row.id, { moreLabel: e.target.value })} placeholder="T.ex. Se alla" />
                        <input className="admin-control" aria-label="Länk för knappen" list="store-links" value={row.moreHref} onChange={(e) => setRow(row.id, { moreHref: e.target.value })} placeholder="Länk (tom = ingen knapp)" />
                      </div>
                      <div className="admin-field">
                        <label htmlFor={`row-${row.id}-limit`}>Antal produkter</label>
                        <input id={`row-${row.id}-limit`} className="admin-control" type="number" min={4} max={20} value={row.limit} onChange={(e) => setRow(row.id, { limit: Math.max(4, Math.min(20, Number(e.target.value) || 4)) })} />
                        <label className="admin-toggle-row">
                          <input type="checkbox" checked={row.visible} onChange={(e) => setRow(row.id, { visible: e.target.checked })} data-testid={`check-row-${row.id}-visible`} /> Visas på startsidan
                        </label>
                      </div>
                    </div>
                  )}
                  {openRow === key && s.kind === 'categories' && (
                    <div className="admin-form-grid home-block-body">
                      <div className="admin-field span-2">
                        <label htmlFor="cats-title">Rubrik</label>
                        <input id="cats-title" className="admin-control" value={home.categoriesTitle} onChange={(e) => form.set('categoriesTitle', e.target.value)} />
                        <span className="admin-field-hint">Rutorna visar alla kategorier som har produkter, med kategorins bild.</span>
                      </div>
                    </div>
                  )}
                  {openRow === key && s.kind === 'pwo' && (
                    <div className="home-block-body">
                      <p className="admin-field-hint">Det svarta bandet med PWO+-burkarna. Innehållet hämtas från produkten PWO+.</p>
                    </div>
                  )}
                  {openRow === key && s.kind === 'instagram' && (
                    <div className="home-block-body">
                      <div className="admin-form-grid">
                        <div className="admin-field">
                          <label htmlFor="ig-handle">Namn i bubblan</label>
                          <input id="ig-handle" className="admin-control" value={ig.handle} onChange={(e) => setIg({ handle: e.target.value })} placeholder="@selfit" data-testid="input-ig-handle" />
                        </div>
                        <div className="admin-field">
                          <label htmlFor="ig-url">Länk till profilen</label>
                          <input id="ig-url" className="admin-control" value={ig.url} onChange={(e) => setIg({ url: e.target.value })} placeholder="https://www.instagram.com/selfit" data-testid="input-ig-url" />
                        </div>
                      </div>
                      <ul className="ig-admin-grid">
                        {ig.images.map((img, j) => (
                          <li key={j}>
                            <img src={img.src.startsWith('/') ? base + img.src : img.src} alt="" />
                            <input className="admin-control" aria-label={`Länk till inlägg ${j + 1}`} value={img.href} onChange={(e) => setIg({ images: ig.images.map((x, k) => (k === j ? { ...x, href: e.target.value } : x)) })} placeholder="Länk till inlägget (valfri)" />
                            <div className="admin-actions">
                              <OrderButtons i={j} count={ig.images.length} onMove={(d) => setIg({ images: moveItem(ig.images, j, d) })} label={`bild ${j + 1}`} />
                              <button type="button" className="admin-btn small danger" onClick={() => setIg({ images: ig.images.filter((_, k) => k !== j) })} aria-label={`Ta bort bild ${j + 1}`}>
                                ✕
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="admin-actions">
                        <button type="button" className="admin-btn small" onClick={() => setPickerOpen('ig')} disabled={ig.images.length >= 16} data-testid="button-pick-ig">
                          Välj bilder
                        </button>
                        <label className="admin-btn small">
                          {uploading ? 'Laddar upp …' : 'Ladda upp nya'}
                          <input type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && uploadIg(e.target.files)} />
                        </label>
                        <span className="admin-field-hint">{ig.images.length} av max 16. Höga bilder (stående) blir snyggast. Spara bilderna från Instagram och ladda upp dem här.</span>
                      </div>
                    </div>
                  )}
                  {openRow === key && s.kind === 'services' && (
                    <div className="home-block-body home-services">
                      {home.services.map((sv, j) => (
                        <div className="home-service" key={j}>
                          <select className="admin-control" aria-label={`Ikon ${j + 1}`} value={sv.icon} onChange={(e) => form.set('services', home.services.map((x, k) => (k === j ? { ...x, icon: e.target.value as ServiceIcon } : x)))}>
                            {SERVICE_ICONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <input className="admin-control" aria-label={`Rubrik ${j + 1}`} value={sv.title} onChange={(e) => form.set('services', home.services.map((x, k) => (k === j ? { ...x, title: e.target.value } : x)))} placeholder="Rubrik" />
                          <input className="admin-control" aria-label={`Text ${j + 1}`} value={sv.text} onChange={(e) => form.set('services', home.services.map((x, k) => (k === j ? { ...x, text: e.target.value } : x)))} placeholder="Text" />
                          <button type="button" className="admin-btn small danger" onClick={() => form.set('services', home.services.filter((_, k) => k !== j))} aria-label={`Ta bort fördel ${j + 1}`}>
                            ✕
                          </button>
                        </div>
                      ))}
                      {home.services.length < 4 && (
                        <button type="button" className="admin-btn small" onClick={() => form.set('services', [...home.services, { icon: 'star', title: '', text: '' }])}>
                          ＋ Lägg till fördel
                        </button>
                      )}
                      <p className="admin-field-hint">Max 4. {FIELDS_HELP} Länk i texten: [Till kundservice](/support).</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="home-add-block">
            <select className="admin-control" value={addBlock} onChange={(e) => setAddBlock(e.target.value)} aria-label="Lägg till block" data-testid="select-add-block">
              <option value="">Lägg till block …</option>
              <option value="row">Ny produktrad</option>
              {missingBlocks.map((k) => (
                <option key={k} value={k}>
                  {k === 'categories' ? 'Kategorirutor' : k === 'pwo' ? 'PWO+-bandet' : k === 'instagram' ? 'Instagram-remsa' : 'Fördelar'}
                </option>
              ))}
            </select>
            <button type="button" className="admin-btn small" onClick={addSection} disabled={!addBlock} data-testid="button-add-block">
              Lägg till
            </button>
          </div>
          <p className="admin-field-hint">{FIELDS_HELP}</p>
        </Panel>

        <div className="home-reset">
          <button
            type="button"
            className="admin-btn small"
            onClick={() => {
              (Object.keys(defaultHome) as (keyof typeof defaultHome)[]).forEach((k) => form.set(k, defaultHome[k] as never));
            }}
            data-testid="button-home-defaults"
          >
            Återställ standardinnehåll
          </button>
          <span className="admin-field-hint">Fyller i originalinnehållet. Inget sparas förrän du klickar på Spara.</span>
        </div>
      </div>

      <MediaPicker
        open={pickerOpen !== null}
        onClose={() => setPickerOpen(null)}
        already={pickerOpen === 'ig' ? ig.images.map((x) => x.src) : []}
        onPick={(items) => {
          if (pickerOpen === 'hero' && items[0]) setHero({ image: items[0].src });
          if (pickerOpen === 'ig') setIg({ images: [...ig.images, ...items.map((m) => ({ src: m.src, href: '' }))].slice(0, 16) });
        }}
      />
      <SaveBar dirty={form.dirty} status={form.status} onSave={form.save} onReset={form.reset} />
    </>
  );
}

export function NavigationAdminView() {
  const form = useSettingsForm('navigation');
  if (!form.loaded && form.status.kind !== 'error') return <p>Laddar …</p>;
  const nav = form.value;
  const setMenu = (next: MenuLink[]) => form.set('menuLinks', next);
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">Innehåll</p>
          <h1>Topprad och meny</h1>
          <p>Den grå raden högst upp och de extra länkarna i menyn bredvid kategorierna.</p>
        </div>
      </div>
      <LinkSuggestions />
      {form.status.kind === 'error' && !form.loaded && <div className="admin-inline-message" role="alert">{form.status.text}</div>}
      <div className="admin-grid home-admin">
        <Panel title="Topprad" subtitle="Korta texter med en bock framför. På mobilen visas bara den första.">
          <LinkListEditor id="topbar" items={nav.topbar} onChange={(v) => form.set('topbar', v)} max={5} addLabel="＋ Lägg till text" />
          <p className="admin-field-hint">{FIELDS_HELP}</p>
        </Panel>
        <Panel title="Menylänkar" subtitle="Kategorierna läggs till automatiskt. Här väljer du länkarna före och efter dem.">
          <div className="home-links">
            {nav.menuLinks.map((l, i) => (
              <div className="home-link-row home-link-row--menu" key={i}>
                <input className="admin-control" aria-label={`Menytext ${i + 1}`} value={l.label} onChange={(e) => setMenu(nav.menuLinks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Text" data-testid={`input-menu-${i}-label`} />
                <input className="admin-control" aria-label={`Menylänk ${i + 1}`} list="store-links" value={l.href} onChange={(e) => setMenu(nav.menuLinks.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} placeholder="Länk" />
                <select className="admin-control" aria-label={`Placering ${i + 1}`} value={l.position} onChange={(e) => setMenu(nav.menuLinks.map((x, j) => (j === i ? { ...x, position: e.target.value as MenuLink['position'] } : x)))}>
                  <option value="before">Före kategorierna</option>
                  <option value="after">Efter kategorierna</option>
                </select>
                <label className="admin-toggle-row">
                  <input type="checkbox" checked={l.highlight} onChange={(e) => setMenu(nav.menuLinks.map((x, j) => (j === i ? { ...x, highlight: e.target.checked } : x)))} /> Röd
                </label>
                <div className="admin-actions">
                  <OrderButtons i={i} count={nav.menuLinks.length} onMove={(d) => setMenu(moveItem(nav.menuLinks, i, d))} label={`menylänk ${i + 1}`} />
                  <button type="button" className="admin-btn small danger" onClick={() => setMenu(nav.menuLinks.filter((_, j) => j !== i))} aria-label={`Ta bort menylänk ${i + 1}`}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {nav.menuLinks.length < 8 && (
              <button type="button" className="admin-btn small" onClick={() => setMenu([...nav.menuLinks, { label: '', href: '', position: 'after', highlight: false }])} data-testid="button-add-menu">
                ＋ Lägg till menylänk
              </button>
            )}
          </div>
        </Panel>
        <div className="home-reset">
          <button
            type="button"
            className="admin-btn small"
            onClick={() => {
              form.set('topbar', defaultNavigation.topbar);
              form.set('menuLinks', defaultNavigation.menuLinks);
            }}
          >
            Återställ standardinnehåll
          </button>
        </div>
      </div>
      <SaveBar dirty={form.dirty} status={form.status} onSave={form.save} onReset={form.reset} />
    </>
  );
}
