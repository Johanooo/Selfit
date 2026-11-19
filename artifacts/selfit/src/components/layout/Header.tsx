import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Menu, Search, ShoppingBag, Truck, ShieldCheck, Clock } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { MobileMenu } from './MobileMenu';
import { categories } from '@/data/categories';
import { useCart } from '@/state/cart';

export const NAV = [
  ...categories.map((c) => ({ href: `/kategori/${c.slug}`, label: c.name, tone: c.tone })),
  { href: '/kollektion/pwo-plus', label: 'PWO+', tone: 'plum' as const },
  { href: '/kollektion/nyheter', label: 'Nyheter', tone: 'surface' as const },
];

export function Header() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const { count, ready } = useCart();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (location === '/sok') setQ(new URLSearchParams(search).get('q') ?? '');
  }, [location, search]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/sok?q=${encodeURIComponent(term)}` : '/sok');
  };

  return (
    <>
      <div className="usp-bar">
        <ul className="container" aria-label="Fördelar">
          <li>
            <Truck size={14} aria-hidden="true" /> Fri frakt över 499 kr
          </li>
          <li>
            <Clock size={14} aria-hidden="true" /> Skickas inom 1–2 vardagar
          </li>
          <li>
            <ShieldCheck size={14} aria-hidden="true" /> 30 dagars öppet köp
          </li>
        </ul>
      </div>
      <header className="site-header">
        <div className="container header-row">
          <div className="header-menu">
            <button
              type="button"
              className="icon-btn"
              aria-label="Öppna meny"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen(true)}
              data-testid="button-open-menu"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
          </div>
          <div className="header-logo">
            <Logo />
          </div>
          <form role="search" className="header-search search-field" onSubmit={submit} action="/sok">
            <label htmlFor="site-search" className="sr-only">
              Sök produkter
            </label>
            <Search size={18} aria-hidden="true" />
            <input
              id="site-search"
              type="search"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Sök bland vitaminer, hudvård, PWO+ …"
              autoComplete="off"
              data-testid="input-search"
            />
            <button type="submit" className="btn btn--primary btn--sm" data-testid="button-search">
              Sök
            </button>
          </form>
          <div className="header-actions">
            <Link
              href="/varukorg"
              className="icon-btn"
              aria-label={`Varukorg, ${count} ${count === 1 ? 'vara' : 'varor'}`}
              data-testid="link-cart"
            >
              <ShoppingBag size={22} aria-hidden="true" />
              {ready && count > 0 && (
                <span key={count} className="cart-count" data-testid="text-cart-count" aria-hidden="true">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
        <nav className="cat-nav" aria-label="Kategorier">
          <ul className="container">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={location === n.href ? 'page' : undefined}
                  data-testid={`link-nav-${n.href.split('/').pop()}`}
                >
                  <span className={`dot tone-${n.tone}`} aria-hidden="true" />
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/support" aria-current={location.startsWith('/support') ? 'page' : undefined}>
                Kundservice
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
