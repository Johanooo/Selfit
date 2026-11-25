import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Menu, Search, ShoppingBag, Truck, ShieldCheck, Clock, LifeBuoy } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { MobileMenu } from './MobileMenu';
import { useCart } from '@/state/cart';

export function Header({ desktopMenuButton = false }: { desktopMenuButton?: boolean }) {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const { count, ready } = useCart();
  const searchInput = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (location === '/sok' && searchInput.current) {
      searchInput.current.value = new URLSearchParams(search).get('q') ?? '';
    }
  }, [location, search]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = searchInput.current?.value.trim() ?? '';
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
        <div className={`container header-row${desktopMenuButton ? ' header-row--menu' : ''}`}>
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
              ref={searchInput}
              id="site-search"
              type="search"
              name="q"
              defaultValue=""
              placeholder="Sök bland vitaminer, hudvård, PWO+ …"
              autoComplete="off"
              data-testid="input-search"
            />
            <button type="submit" className="btn btn--primary btn--sm" data-testid="button-search">
              Sök
            </button>
          </form>
          <div className="header-actions">
            <Link href="/support" className="header-link" data-testid="link-header-support">
              <LifeBuoy size={20} aria-hidden="true" />
              <span>Kundservice</span>
            </Link>
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
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
