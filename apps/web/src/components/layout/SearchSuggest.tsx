import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { ProductImage } from '@/components/art/ProductImage';
import { categories, subcategories } from '@/data/categories';
import { productHref, searchItems } from '@/lib/catalog';
import { isBuyable, kr } from '@/lib/format';
import { lowestPrice30Days } from '@/lib/price-history';
import { useCart } from '@/state/cart';

const MAX = 5;
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Förslag som visas under sökfältet medan man skriver: kategorier och produkter
 * med pris och köpknapp, samt länk till alla resultat.
 */
export function SearchSuggest({
  query,
  id,
  onPick,
  onEscape,
}: {
  query: string;
  id: string;
  onPick: () => void;
  onEscape: () => void;
}) {
  const { add } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const q = query.trim();
  const items = searchItems(q);
  const cats = [...categories.map((c) => ({ slug: c.slug, name: c.name })), ...subcategories.map((c) => ({ slug: c.slug, name: c.name }))]
    .filter((c) => norm(c.name).includes(norm(q)))
    .slice(0, 4);

  useEffect(() => {
    if (!addedId) return;
    const t = window.setTimeout(() => setAddedId(null), 1400);
    return () => window.clearTimeout(t);
  }, [addedId]);

  // Pil upp/ner flyttar mellan länkar och knappar i rutan.
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onEscape();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const focusables = [...(boxRef.current?.querySelectorAll<HTMLElement>('a, button') ?? [])];
    const i = focusables.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? i + 1 : i - 1;
    e.preventDefault();
    if (next < 0) onEscape();
    else focusables[Math.min(next, focusables.length - 1)]?.focus();
  };

  if (q.length < 2) return null;

  return (
    <div id={id} ref={boxRef} className="search-suggest" onKeyDown={onKey} data-testid="search-suggest">
      <Link href={`/sok?q=${encodeURIComponent(q)}`} className="search-suggest-all" onClick={onPick}>
        Se alla {items.length} resultat för ”{q}”
        <ArrowRight size={16} aria-hidden="true" />
      </Link>

      {cats.length > 0 && (
        <div className="search-suggest-cats" aria-label="Kategorier">
          {cats.map((c) => (
            <Link key={c.slug} href={`/kategori/${c.slug}`} className="chip" onClick={onPick}>
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="search-suggest-empty">Inga produkter matchar ”{q}”. Prova ett annat ord.</p>
      ) : (
        <ul className="search-suggest-list" aria-label="Produkter">
          {items.slice(0, MAX).map((item) => {
            const v = item.variants.find(isBuyable) ?? item.variants[0];
            const single = item.variants.length === 1 && isBuyable(v);
            const low30 = lowestPrice30Days(v.priceHistory);
            const prices = new Set(item.variants.map((x) => x.price));
            const title = item.flavour ? `${item.product.name} ${item.flavour.name}` : item.product.name;
            const href = productHref(item.product, { flavour: item.flavour?.slug });
            return (
              <li key={item.key} className="search-suggest-item">
                <Link href={href} className="search-suggest-link" onClick={onPick}>
                  <span className="search-suggest-thumb" aria-hidden="true">
                    <ProductImage product={item.product} variant={v} />
                  </span>
                  <span className="search-suggest-text">
                    <span className="search-suggest-name">{title}</span>
                    <span className={`search-suggest-price${low30 !== null ? ' price--sale' : ''}`}>
                      {prices.size > 1 && 'från '}
                      {kr(Math.min(...prices))}
                      {low30 !== null && <span className="price-was">{kr(low30)}</span>}
                    </span>
                  </span>
                </Link>
                {single ? (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => {
                      if (add(v.id, 1)) setAddedId(v.id);
                    }}
                    aria-label={`Lägg ${title} i varukorgen`}
                  >
                    {addedId === v.id ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                    {addedId === v.id ? 'Tillagd' : 'Köp'}
                  </button>
                ) : (
                  <Link href={href} className="btn btn--secondary btn--sm" onClick={onPick} aria-label={`Välj variant av ${title}`}>
                    Välj
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
