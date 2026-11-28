import { lazy, Suspense, type ReactNode } from 'react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Layout } from '@/components/layout/Layout';
import { CartProvider } from '@/state/cart';
import { CookieProvider } from '@/state/cookies';
import { SettingsProvider } from '@/state/settings';
import Home from '@/pages/Home';

// Övriga sidor och admin laddas först när de behövs, så att startsidan laddar snabbt.
const AdminApp = lazy(() => import('@/admin/AdminApp').then((m) => ({ default: m.AdminApp })));
const CategoryPage = lazy(() => import('@/pages/ListingPages').then((m) => ({ default: m.CategoryPage })));
const BrandPage = lazy(() => import('@/pages/ListingPages').then((m) => ({ default: m.BrandPage })));
const CollectionPage = lazy(() => import('@/pages/ListingPages').then((m) => ({ default: m.CollectionPage })));
const CampaignPage = lazy(() => import('@/pages/ListingPages').then((m) => ({ default: m.CampaignPage })));
const SearchPage = lazy(() => import('@/pages/Search'));
const ProductPage = lazy(() => import('@/pages/Product'));
const CartPage = lazy(() => import('@/pages/Cart'));
const CheckoutPage = lazy(() => import('@/pages/Checkout'));
const OrderConfirmationPage = lazy(() => import('@/pages/OrderConfirmation'));
const TrackingPage = lazy(() => import('@/pages/Tracking'));
const ReturnPage = lazy(() => import('@/pages/Return'));
const SupportArticlePage = lazy(() => import('@/pages/Support').then((m) => ({ default: m.SupportArticlePage })));
const SupportIndexPage = lazy(() => import('@/pages/Support').then((m) => ({ default: m.SupportIndexPage })));
const NotFound = lazy(() => import('@/pages/not-found'));

/** Visas kort medan en sida laddas. Tom yta med rätt höjd, så att sidan inte hoppar. */
function PageFallback() {
  return <div className="page-fallback" aria-busy="true" />;
}

function Routes() {
  return (
    <RoutedErrorBoundary>
      <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/kategori/:slug" component={CategoryPage} />
        <Route path="/varumarke/:slug" component={BrandPage} />
        <Route path="/kollektion/:slug" component={CollectionPage} />
        <Route path="/kampanj/:slug" component={CampaignPage} />
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
      </Suspense>
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
        <Suspense fallback={<PageFallback />}>
          <AdminApp />
        </Suspense>
      </RoutedErrorBoundary>
    );
  }
  return (
    <SettingsProvider>
    <CookieProvider>
      <CartProvider>
        <Layout>
          <Routes />
        </Layout>
      </CartProvider>
    </CookieProvider>
    </SettingsProvider>
  );
}

export default App;
