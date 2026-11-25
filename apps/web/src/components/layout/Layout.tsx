import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { Header } from './Header';
import { Footer } from './Footer';
import { CookieConsent } from './CookieConsent';
import { CartToast } from './CartToast';
import { CartStorageWarning } from './CartStorageWarning';
import { CategoryMenu } from './CategoryMenu';

/** Sidor som visar butiksmenyn i en vänsterkolumn (på stor skärm). */
const SHOP_ROUTES = [/^\/$/, /^\/kategori\//, /^\/varumarke\//, /^\/kollektion\//, /^\/sok/, /^\/produkt\//];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const withMenu = SHOP_ROUTES.some((r) => r.test(location));
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location]);

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Hoppa till innehåll
      </a>
      <Header desktopMenuButton={!withMenu} />
      <CartStorageWarning />
      {withMenu ? (
        <div className="container shop-layout">
          <aside className="shop-sidebar">
            <CategoryMenu idPrefix="side" />
          </aside>
          <main id="main" tabIndex={-1} className="shop-main">
            {children}
          </main>
        </div>
      ) : (
        <main id="main" tabIndex={-1}>
          {children}
        </main>
      )}
      <Footer />
      <CartToast />
      <CookieConsent />
    </div>
  );
}
