import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

// Typsnitten ligger på vår egen server istället för hos Google (snabbare och utan tredjepartsanrop).
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import './index.css';

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
