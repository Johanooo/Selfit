import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

// Typsnitten ligger på vår egen server istället för hos Google (snabbare och utan tredjepartsanrop).
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';
import './index.css';
import './styles/storefront.css';

import { replaceProducts } from '@/data/products';
import type { Product } from '@/data/types';

/**
 * Produkterna kommer från databasen. Servern bäddar in dem i sidan (#catalog-data).
 * Under utveckling (Vite) hämtas de i stället från /api/storefront/products.
 * Svarar inte servern visas produkterna från kodfilerna.
 */
async function loadCatalog() {
  const inline = document.getElementById('catalog-data');
  if (inline?.textContent) {
    try {
      replaceProducts(JSON.parse(inline.textContent) as Product[]);
      return;
    } catch {
      /* faller tillbaka till hämtning */
    }
  }
  if (location.pathname.startsWith(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/admin`)) return;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/storefront/products`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) replaceProducts((await res.json()) as Product[]);
  } catch {
    /* servern svarar inte – använd produkterna från kodfilerna */
  }
}

void loadCatalog().then(render);

function render() {
createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
}
