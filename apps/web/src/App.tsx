import { type ReactNode } from 'react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Layout } from '@/components/layout/Layout';
import { AdminApp } from '@/admin/AdminApp';
import { CartProvider } from '@/state/cart';
import { CookieProvider } from '@/state/cookies';
import Home from '@/pages/Home';
import { BrandPage, CategoryPage, CollectionPage } from '@/pages/ListingPages';
import SearchPage from '@/pages/Search';
import ProductPage from '@/pages/Product';
import CartPage from '@/pages/Cart';
import CheckoutPage from '@/pages/Checkout';
import OrderConfirmationPage from '@/pages/OrderConfirmation';
import TrackingPage from '@/pages/Tracking';
import ReturnPage from '@/pages/Return';
import { SupportArticlePage, SupportIndexPage } from '@/pages/Support';
import NotFound from '@/pages/not-found';

function Routes() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/kategori/:slug" component={CategoryPage} />
        <Route path="/varumarke/:slug" component={BrandPage} />
        <Route path="/kollektion/:slug" component={CollectionPage} />
        <Route path="/sok" component={SearchPage} />
        <Route path="/produkt/:slug" component={ProductPage} />
        <Route path="/varukorg" component={CartPage} />
        <Route path="/kassa" component={CheckoutPage} />
        <Route path="/orderbekraftelse" component={OrderConfirmationPage} />
        <Route path="/ordersparning" component={TrackingPage} />
        <Route path="/retur" component={ReturnPage} />
        <Route path="/support" component={SupportIndexPage} />
        <Route path="/support/:slug" component={SupportArticlePage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AppContent />
    </WouterRouter>
  );
}

function AppContent() {
  const [location] = useLocation();
  if (location === '/admin' || location.startsWith('/admin/')) {
    return (
      <RoutedErrorBoundary>
        <AdminApp />
      </RoutedErrorBoundary>
    );
  }
  return (
    <CookieProvider>
      <CartProvider>
        <Layout>
          <Routes />
        </Layout>
      </CartProvider>
    </CookieProvider>
  );
}

export default App;
