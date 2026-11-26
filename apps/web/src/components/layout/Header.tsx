import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Menu, Search, ShoppingBag, Truck, ShieldCheck, Clock, LifeBuoy } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { MobileMenu } from './MobileMenu';
import { SearchSuggest } from './SearchSuggest';
import { useCart } from '@/state/cart';
import { useSettings } from '@/state/settings';

export function Header({ desktopMenuButton = false }: { desktopMenuButton?: boolean }) {
  const { policies } = useSettings();
  const [location, navigate] = useLocation();
  const search = useSearch();
  const { count, ready } = useCart();
  const searchInput = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Stäng förslagen vid sidbyte och vid klick utanför.
  useEffect(() => setSuggestOpen(false), [location]);
  useEffect(() => {
    if (!suggestOpen) return;
    const close = (e: PointerEvent) => {
      if (!formRef.current?.contains(e.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [suggestOpen]);

  useEffect(() => {
    if (location === '/sok' && searchInput.current) {
      const q = new URLSearchParams(search).get('q') ?? '';
      searchInput.current.value = q;
      setQuery(q);
    }
  }, [location, search]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = searchInput.current?.value.trim() ?? '';
    setSuggestOpen(false);
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
            <Clock size={14} aria-hidden="true" /> Skickas inom {policies.dispatchDays}
          </li>
          <li>
            <ShieldCheck size={14} aria-hidden="true" /> {policies.openPurchaseDays} dagars öppet köp
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
          <form ref={formRef} role="search" className="header-search search-field" onSubmit={submit} action="/sok">
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
              role="combobox"
              aria-autocomplete="list"
              aria-haspopup="dialog"
              aria-controls="search-suggest"
              aria-expanded={suggestOpen && query.trim().length >= 2}
              onChange={(e) => {
                setQuery(e.target.value);
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSuggestOpen(false);
                if (e.key === 'ArrowDown') {
                  const first = document.querySelector<HTMLElement>('#search-suggest a, #search-suggest button');
                  if (first) {
                    e.preventDefault();
                    first.focus();
                  }
                }
              }}
              data-testid="input-search"
            />
            <button type="submit" className="btn btn--primary btn--sm" data-testid="button-search">
              Sök
            </button>
            {suggestOpen && (
              <SearchSuggest
                id="search-suggest"
                query={query}
                onPick={() => setSuggestOpen(false)}
                onEscape={() => {
                  setSuggestOpen(false);
                  searchInput.current?.focus();
                }}
              />
            )}
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
