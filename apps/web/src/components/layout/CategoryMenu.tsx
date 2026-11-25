import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronDown } from 'lucide-react';
import { categories, getSubcategory, subcategoriesOf } from '@/data/categories';
import { products } from '@/data/products';

/** Snabblänkar överst i menyn. */
export const POPULAR = [
  { href: '/kollektion/pwo-plus', label: 'PWO+' },
  { href: '/kollektion/nyheter', label: 'Nyheter' },
  { href: '/kollektion/bastsaljare', label: 'Bästsäljare' },
  { href: '/kollektion/kampanjer', label: 'Kampanjer' },
];

export const HELP = [
  { href: '/ordersparning', label: 'Spåra order' },
  { href: '/retur', label: 'Returnera' },
  { href: '/support', label: 'Kundservice' },
];

/** Vilken huvudkategori en adress hör till (kategori, underkategori eller produkt). */
function categoryForPath(path: string): string | undefined {
  const cat = path.match(/^\/kategori\/([^/?]+)/)?.[1];
  if (cat) return getSubcategory(cat)?.parent ?? cat;
  const prod = path.match(/^\/produkt\/([^/?]+)/)?.[1];
  if (prod) return products.find((p) => p.slug === prod)?.category;
  return undefined;
}

const subsWithProducts = (parent: string) =>
  subcategoriesOf(parent).filter((sc) => products.some((p) => p.subcategory === sc.slug));

/**
 * Butikens meny: populära länkar, kategorier som kan fällas ut och hjälplänkar.
 * Används både i vänsterkolumnen (dator) och i menylådan (mobil).
 */
export function CategoryMenu({ idPrefix }: { idPrefix: string }) {
  const [location] = useLocation();
  const activeCategory = categoryForPath(location);
  const activeSub =
    getSubcategory(location.match(/^\/kategori\/([^/?]+)/)?.[1])?.slug ??
    products.find((p) => location === `/produkt/${p.slug}`)?.subcategory;
  const [open, setOpen] = useState<string | null>(activeCategory ?? null);

  useEffect(() => {
    if (activeCategory) setOpen(activeCategory);
  }, [activeCategory]);

  const current = (href: string) => (location === href ? 'page' : undefined);

  return (
    <nav className="cat-menu" aria-label="Butiksmeny">
      <h2 className="cat-menu-heading">Populärt</h2>
      <ul className="cat-menu-list">
        {POPULAR.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={current(l.href)} data-testid={`${idPrefix}-link-${l.href.split('/').pop()}`}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="cat-menu-heading">Kategorier</h2>
      <ul className="cat-menu-list">
        {categories.map((c) => {
          const isOpen = open === c.slug;
          const panelId = `${idPrefix}-cat-${c.slug}`;
          const href = `/kategori/${c.slug}`;
          return (
            <li key={c.slug} className="cat-menu-item" data-open={isOpen}>
              <div className="cat-menu-row">
                <Link href={href} aria-current={current(href)} data-testid={`${idPrefix}-link-${c.slug}`}>
                  {c.name}
                </Link>
                <button
                  type="button"
                  className="cat-menu-toggle"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  aria-label={`${isOpen ? 'Dölj' : 'Visa'} underkategorier i ${c.name}`}
                  onClick={() => setOpen(isOpen ? null : c.slug)}
                  data-testid={`${idPrefix}-toggle-${c.slug}`}
                >
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
              </div>
              {isOpen && (
                <ul id={panelId} className="cat-menu-sub">
                  {subsWithProducts(c.slug).map((sc) => (
                    <li key={sc.slug}>
                      <Link
                        href={`/kategori/${sc.slug}`}
                        aria-current={activeSub === sc.slug ? 'page' : undefined}
                        data-testid={`${idPrefix}-link-${sc.slug}`}
                      >
                        {sc.name}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href={href} className="cat-menu-all">
                      Visa allt i {c.name}
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <h2 className="cat-menu-heading">Hjälp</h2>
      <ul className="cat-menu-list cat-menu-list--muted">
        {HELP.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={current(l.href)}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
