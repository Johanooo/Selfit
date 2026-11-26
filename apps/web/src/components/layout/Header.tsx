import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Check, ChevronDown, LifeBuoy, Menu, Search, ShoppingBag } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { MobileMenu } from './MobileMenu';
import { SearchSuggest } from './SearchSuggest';
import { useCart } from '@/state/cart';
import { useCartDrawer } from '@/state/cartDrawer';
import { useSettings } from '@/state/settings';
import { visibleCategories, visibleSubcategoriesOf } from '@/data/taxonomy';

export function Header() {
  const { policies } = useSettings();
  const [location, navigate] = useLocation();
  const search = useSearch();
  const { count, ready } = useCart();
  const drawer = useCartDrawer();
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

  const isActive = (href: string) => location === href || location.startsWith(`${href}/`);

  return (
    <>
      <div className="usp-bar">
        <ul className="container" aria-label="Fördelar">
          <li>
            <Check size={14} aria-hidden="true" /> Fri frakt över 499 kr
          </li>
          <li>
            <Check size={14} aria-hidden="true" /> Beställ före 14 – skickas inom {policies.dispatchDays}
          </li>
          <li>
            <Check size={14} aria-hidden="true" /> {policies.openPurchaseDays} dagars öppet köp
          </li>
          <li>
            <Check size={14} aria-hidden="true" /> Kundtjänst som svarar
          </li>
        </ul>
      </div>
      <header className="site-header">
        <div className="container header-row">
          <div className="header-left">
            <button
              type="button"
              className="icon-btn header-menu-btn"
              aria-label="Öppna meny"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen(true)}
              data-testid="button-open-menu"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
            <form ref={formRef} role="search" className="header-search search-field" onSubmit={submit} action="/sok">
              <label htmlFor="site-search" className="sr-only">
                Sök produkter
              </label>
              <Search size={17} aria-hidden="true" />
              <input
                ref={searchInput}
                id="site-search"
                type="search"
                name="q"
                defaultValue=""
                placeholder="Sök …"
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
              <button type="submit" className="sr-only" data-testid="button-search">
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
          </div>
          <div className="header-logo">
            <Logo />
          </div>
          <div className="header-actions">
            <Link href="/support" className="header-action" data-testid="link-header-support">
              <LifeBuoy size={20} aria-hidden="true" />
              <span>Kundservice</span>
            </Link>
            <button
              type="button"
              className="header-action"
              onClick={drawer.open}
              aria-label={`Varukorg, ${count} ${count === 1 ? 'vara' : 'varor'}`}
              data-testid="link-cart"
            >
              <span className="header-action-icon">
                <ShoppingBag size={20} aria-hidden="true" />
                {ready && count > 0 && (
                  <span key={count} className="cart-count" data-testid="text-cart-count" aria-hidden="true">
                    {count}
                  </span>
                )}
              </span>
              <span>Varukorg</span>
            </button>
          </div>
        </div>
        <nav className="main-nav" aria-label="Kategorier">
          <ul className="container main-nav-list">
            <li>
              <Link href="/kollektion/kampanjer" className="main-nav-link main-nav-link--sale" aria-current={isActive('/kollektion/kampanjer') ? 'page' : undefined}>
                Kampanjer
              </Link>
            </li>
            {visibleCategories().map((c) => {
              const subs = visibleSubcategoriesOf(c.slug);
              const href = `/kategori/${c.slug}`;
              return (
                <li key={c.slug} className={subs.length ? 'has-menu' : undefined}>
                  <Link href={href} className="main-nav-link" aria-current={isActive(href) ? 'page' : undefined} data-testid={`nav-link-${c.slug}`}>
                    {c.name}
                    {subs.length > 0 && <ChevronDown size={14} aria-hidden="true" />}
                  </Link>
                  {subs.length > 0 && (
                    <div className="mega">
                      <div className="mega-inner">
                        <p className="mega-title">{c.name}</p>
                        <ul>
                          {subs.map((s) => (
                            <li key={s.slug}>
                              <Link href={`/kategori/${s.slug}`}>{s.name}</Link>
                            </li>
                          ))}
                        </ul>
                        <Link href={href} className="mega-all">
                          Visa allt i {c.name}
                        </Link>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
            <li>
              <Link href="/kollektion/nyheter" className="main-nav-link" aria-current={isActive('/kollektion/nyheter') ? 'page' : undefined}>
                Nyheter
              </Link>
            </li>
            <li>
              <Link href="/kollektion/pwo-plus" className="main-nav-link" aria-current={isActive('/kollektion/pwo-plus') ? 'page' : undefined}>
                PWO+
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
