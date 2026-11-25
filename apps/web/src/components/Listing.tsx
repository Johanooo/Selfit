import { useMemo, useRef, type ReactNode } from 'react';
import { useLocation, useSearch } from 'wouter';
import { ChevronLeft, ChevronRight, X, SearchX } from 'lucide-react';
import { FilterDropdown } from '@/components/FilterDropdown';
import { Breadcrumbs, type Crumb } from '@/components/Breadcrumbs';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import {
  PRICE_BUCKETS,
  SORTS,
  applyFilters,
  sortItems,
  displayVariant,
  type Filters,
  type ListingItem,
  type SortKey,
} from '@/lib/catalog';
import { pwoFlavours } from '@/data/products';
import { packLabel } from '@/lib/format';
import type { Tone } from '@/data/types';

const PAGE_SIZE = 8;

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

export interface ListingProps {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  tone: Tone | 'surface';
  crumbs: Crumb[];
  items: ListingItem[];
  /** Rendered when `items` is empty before filtering (e.g. no search hits). */
  emptyBase?: ReactNode;
  /** Innehåll mellan introt och produkterna, t.ex. underkategorier. */
  before?: ReactNode;
}

export function Listing({ eyebrow, title, intro, tone, crumbs, items, emptyBase, before }: ListingProps) {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const resultsRef = useRef<HTMLDivElement>(null);

  const filters: Filters = {
    packs: list(params.get('pack')).map(Number).filter((n) => !Number.isNaN(n)),
    flavours: list(params.get('smak')),
    prices: list(params.get('pris')),
  };
  const sort = (SORTS.find((s) => s.id === params.get('sort'))?.id ?? 'popularitet') as SortKey;

  const update = (patch: Record<string, string | null>, keepPage = false) => {
    const next = new URLSearchParams(search);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!keepPage) next.delete('sida');
    const qs = next.toString();
    navigate(`${location}${qs ? `?${qs}` : ''}`, { replace: true });
  };

  const toggle = (key: 'pack' | 'smak' | 'pris', value: string) => {
    const cur = list(params.get(key));
    const nextVals = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
    update({ [key]: nextVals.join(',') || null });
  };

  const resetAll = () => update({ pack: null, smak: null, pris: null });

  // Facets present in this base set
  const packFacet = [...new Set(items.flatMap((i) => i.variants.map((v) => v.pack).filter(Boolean)))].sort(
    (a, b) => (a as number) - (b as number),
  ) as number[];
  const flavourFacet = pwoFlavours.filter((f) => items.some((i) => i.flavour?.slug === f.slug));
  const countWith = (patch: Partial<Filters>) => applyFilters(items, { packs: [], flavours: [], prices: [], ...patch }).length;

  const filtered = sortItems(applyFilters(items, filters), sort, filters);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(params.get('sida')) || 1));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeCount = filters.packs.length + filters.flavours.length + filters.prices.length;

  const goPage = (p: number) => {
    update({ sida: p > 1 ? String(p) : null }, true);
    resultsRef.current?.scrollIntoView({ block: 'start' });
    resultsRef.current?.focus({ preventScroll: true });
  };

  const pills: { label: string; onRemove: () => void }[] = [
    ...filters.packs.map((p) => ({ label: packLabel(p), onRemove: () => toggle('pack', String(p)) })),
    ...filters.flavours.map((f) => ({
      label: pwoFlavours.find((x) => x.slug === f)?.name ?? f,
      onRemove: () => toggle('smak', f),
    })),
    ...filters.prices.map((p) => ({
      label: PRICE_BUCKETS.find((b) => b.id === p)?.label ?? p,
      onRemove: () => toggle('pris', p),
    })),
  ];

  return (
    <div className="container page">
      <Breadcrumbs items={crumbs} />
      <header className={`listing-intro tone-${tone}`}>
        <div className="stack-3">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="h1">{title}</h1>
          {intro && <div className="lead">{intro}</div>}
        </div>
      </header>

      {before}

      {items.length === 0 && emptyBase ? (
        emptyBase
      ) : (
        <div className="listing-layout">
          <div ref={resultsRef} tabIndex={-1} role="region" aria-label="Produkter">
            <div className="filter-bar">
              <div className="filter-buttons" role="group" aria-label="Filtrera produkter">
                {packFacet.length > 0 && (
                  <FilterDropdown label="Förpackning" count={filters.packs.length} testId="button-filter-pack">
                    <fieldset className="filter-group">
                      <legend className="sr-only">Förpackning</legend>
                      {packFacet.map((p) => (
                        <label className="check" key={p}>
                          <input
                            type="checkbox"
                            checked={filters.packs.includes(p)}
                            onChange={() => toggle('pack', String(p))}
                            data-testid={`checkbox-pack-${p}`}
                          />
                          {packLabel(p)}
                          <span className="check-count">{countWith({ packs: [p] })}</span>
                        </label>
                      ))}
                    </fieldset>
                  </FilterDropdown>
                )}
                {flavourFacet.length > 0 && (
                  <FilterDropdown label="Smak" count={filters.flavours.length} testId="button-filter-flavour">
                    <fieldset className="filter-group">
                      <legend className="sr-only">Smak</legend>
                      {flavourFacet.map((f) => (
                        <label className="check" key={f.slug}>
                          <input
                            type="checkbox"
                            checked={filters.flavours.includes(f.slug)}
                            onChange={() => toggle('smak', f.slug)}
                            data-testid={`checkbox-flavour-${f.slug}`}
                          />
                          <span className="swatch" style={{ background: `var(--flavour-${f.slug})` }} aria-hidden="true" />
                          {f.name}
                          <span className="check-count">{countWith({ flavours: [f.slug] })}</span>
                        </label>
                      ))}
                    </fieldset>
                  </FilterDropdown>
                )}
                <FilterDropdown label="Pris" count={filters.prices.length} testId="button-filter-price">
                  <fieldset className="filter-group">
                    <legend className="sr-only">Pris</legend>
                    {PRICE_BUCKETS.map((b) => (
                      <label className="check" key={b.id}>
                        <input
                          type="checkbox"
                          checked={filters.prices.includes(b.id)}
                          onChange={() => toggle('pris', b.id)}
                          data-testid={`checkbox-price-${b.id}`}
                        />
                        {b.label}
                        <span className="check-count">{items.filter((i) => b.test(displayVariant(i).price)).length}</span>
                      </label>
                    ))}
                  </fieldset>
                </FilterDropdown>
              </div>
              <div className="select-wrap">
                <label htmlFor="sort">Sortera</label>
                <select
                  id="sort"
                  className="select"
                  value={sort}
                  onChange={(e) => update({ sort: e.target.value === 'popularitet' ? null : e.target.value })}
                  data-testid="select-sort"
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="listing-toolbar">
              <p aria-live="polite" data-testid="text-result-count">
                <strong>{filtered.length}</strong> {filtered.length === 1 ? 'produkt' : 'produkter'}
                {filtered.length > PAGE_SIZE && (
                  <span className="muted">
                    {' '}
                    · visar {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
                  </span>
                )}
              </p>
              {activeCount > 0 && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll} data-testid="button-reset-filters-side">
                  Rensa alla filter
                </button>
              )}
            </div>

            {pills.length > 0 && (
              <div className="active-filters" role="group" aria-label="Aktiva filter">
                {pills.map((p) => (
                  <button
                    type="button"
                    key={p.label}
                    className="filter-pill"
                    onClick={p.onRemove}
                    aria-label={`Ta bort filter ${p.label}`}
                  >
                    {p.label} <X size={14} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}

            {filtered.length === 0 ? (
              <EmptyState
                icon={<SearchX size={28} />}
                title="Inga produkter matchar dina filter"
                actions={
                  <button type="button" className="btn btn--primary" onClick={resetAll} data-testid="button-reset-filters">
                    Rensa filter
                  </button>
                }
              >
                Prova att ta bort ett eller flera filter, till exempel prisintervallet eller förpackningsstorleken.
              </EmptyState>
            ) : (
              <ul className="product-grid">
                {shown.map((item, i) => (
                  <li key={item.key}>
                    <ProductCard item={item} filters={filters} index={i} />
                  </li>
                ))}
              </ul>
            )}

            {pages > 1 && (
              <nav aria-label="Sidnavigering">
                <ul className="pagination">
                  <li>
                    <button
                      type="button"
                      className="page-btn"
                      disabled={page <= 1}
                      onClick={() => goPage(page - 1)}
                      aria-label="Föregående sida"
                      data-testid="button-page-prev"
                    >
                      <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                  </li>
                  {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                    <li key={p}>
                      <button
                        type="button"
                        className="page-btn"
                        aria-current={p === page ? 'page' : undefined}
                        aria-label={`Sida ${p}`}
                        onClick={() => goPage(p)}
                        data-testid={`button-page-${p}`}
                      >
                        {p}
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      className="page-btn"
                      disabled={page >= pages}
                      onClick={() => goPage(page + 1)}
                      aria-label="Nästa sida"
                      data-testid="button-page-next"
                    >
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
