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
import { replaceBrands, replaceCategories } from '@/data/categories';
import { replaceProductTypes } from '@/data/productTypes';

/**
 * Efter en ny publicering har sidans delar nya filnamn. En flik som var öppen sedan innan
 * försöker då hämta gamla filer som inte finns längre, och sidan visar "Något gick fel".
 * Då laddar vi om sidan en gång så att den nya versionen hämtas.
 */
const RELOAD_KEY = 'selfit-reloaded-for-update';
window.addEventListener('vite:preloadError', (event) => {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  } catch {
    /* lagring kan vara avstängd */
  }
  // Högst en omladdning per halvminut, så att det aldrig blir en evig loop.
  if (Date.now() - last < 30_000) return;
  event.preventDefault();
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* lagring kan vara avstängd */
  }
  window.location.reload();
});
import type { Product } from '@/data/types';

/**
 * Produkterna kommer från databasen. Servern bäddar in dem i sidan (#catalog-data).
 * Under utveckling (Vite) hämtas de i stället från /api/storefront/products.
 * Svarar inte servern visas produkterna från kodfilerna.
 */
/** Produkttyper och kategorier från Admin. Inbäddade i sidan av servern, annars hämtade (under utveckling). */
async function loadTaxonomy() {
  const apply = (d: { productTypes?: unknown; categories?: unknown; subcategories?: unknown }) => {
    if (Array.isArray(d.productTypes)) replaceProductTypes(d.productTypes);
    if (Array.isArray(d.categories) && Array.isArray(d.subcategories)) replaceCategories(d.categories, d.subcategories);
  };
  const inline = document.getElementById('taxonomy-data');
  if (inline?.textContent) {
    try {
      apply(JSON.parse(inline.textContent));
      return;
    } catch {
      /* faller tillbaka till hämtning */
    }
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/taxonomy`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) apply(await res.json());
  } catch {
    /* servern svarar inte – använd listorna från kodfilerna */
  }
}

/** Varumärkenas namn och beskrivning från Admin. Hämtas samtidigt som produkterna och stoppar aldrig sidan. */
async function loadBrands() {
  const inline = document.getElementById('brand-data');
  if (inline?.textContent) {
    try {
      replaceBrands(JSON.parse(inline.textContent));
      return;
    } catch {
      /* faller tillbaka till hämtning */
    }
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/brands`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) replaceBrands(await res.json());
  } catch {
    /* servern svarar inte – använd varumärkena från kodfilerna */
  }
}

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

void Promise.all([loadTaxonomy(), loadCatalog(), location.pathname.includes('/admin') ? Promise.resolve() : loadBrands()]).then(render);

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
