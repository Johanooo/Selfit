import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { Header } from './Header';
import { Footer } from './Footer';
import { CookieConsent } from './CookieConsent';
import { CartToast } from './CartToast';
import { CartStorageWarning } from './CartStorageWarning';

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location]);

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Hoppa till innehåll
      </a>
      <Header />
      <CartStorageWarning />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <CartToast />
      <CookieConsent />
    </div>
  );
}
