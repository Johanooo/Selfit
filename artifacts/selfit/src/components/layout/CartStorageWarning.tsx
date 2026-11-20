import { AlertTriangle } from 'lucide-react';
import { useCart } from '@/state/cart';

export function CartStorageWarning() {
  const { ready, storageAvailable } = useCart();

  if (!ready || storageAvailable !== false) return null;

  return (
    <div className="container cart-storage-warning-wrap">
      <p className="notice notice--warn cart-storage-warning" role="alert" data-testid="cart-storage-warning">
        <AlertTriangle size={18} aria-hidden="true" />
        <span>
          <strong>Varukorgen kan inte sparas i webbläsaren.</strong> Varorna finns bara kvar tillfälligt i den här fliken
          och kan försvinna om du laddar om eller stänger sidan.
        </span>
      </p>
    </div>
  );
}
