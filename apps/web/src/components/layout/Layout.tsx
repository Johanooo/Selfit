import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { Header } from './Header';
import { Footer } from './Footer';
import { CookieConsent } from './CookieConsent';
import { CartStorageWarning } from './CartStorageWarning';
import { CartDrawer } from './CartDrawer';
import { CheckoutHeader } from './CheckoutHeader';
import { CartDrawerProvider } from '@/state/cartDrawer';

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isCheckout = location === '/kassa';
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location]);

  return (
    <CartDrawerProvider>
      <div className={`app-shell${isCheckout ? ' app-shell--checkout' : ''}`}>
        <a href="#main" className="skip-link">
          Hoppa till innehåll
        </a>
        {isCheckout ? <CheckoutHeader /> : <Header />}
        <CartStorageWarning />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        {!isCheckout && <Footer />}
        {!isCheckout && <CartDrawer />}
        <CookieConsent />
      </div>
    </CartDrawerProvider>
  );
}
