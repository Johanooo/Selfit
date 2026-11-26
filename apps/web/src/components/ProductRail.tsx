import { useRef, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import type { ListingItem } from '@/lib/catalog';

/** En rad med produkter som går att bläddra i sidled, med pilar på dator. */
export function ProductRail({ id, title, items, moreHref, moreLabel = 'Se alla' }: { id: string; title: ReactNode; items: ListingItem[]; moreHref?: string; moreLabel?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };
  if (items.length === 0) return null;
  return (
    <section className="section rail" aria-labelledby={id}>
      <div className="container">
        <div className="rail-head">
          <h2 id={id} className="h2">
            {title}
          </h2>
          {moreHref && (
            <Link href={moreHref} className="rail-more">
              {moreLabel}
            </Link>
          )}
          <div className="rail-arrows">
            <button type="button" className="rail-arrow" onClick={() => scroll(-1)} aria-label="Föregående produkter">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" className="rail-arrow" onClick={() => scroll(1)} aria-label="Fler produkter">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <ul ref={track} className="rail-track">
          {items.map((item, i) => (
            <li key={item.key}>
              <ProductCard item={item} index={i} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
