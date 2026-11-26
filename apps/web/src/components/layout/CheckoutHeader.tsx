import { Link } from 'wouter';
import { ChevronLeft, Lock } from 'lucide-react';
import { Logo } from '@/components/Logo';

/** Enkelt sidhuvud i kassan: inga menyer som stör, bara vägen tillbaka. */
export function CheckoutHeader() {
  return (
    <header className="checkout-header">
      <div className="container checkout-header-row">
        <Link href="/" className="checkout-back" data-testid="link-continue-shopping">
          <ChevronLeft size={16} aria-hidden="true" /> Fortsätt handla
        </Link>
        <div className="header-logo">
          <Logo />
        </div>
        <span className="checkout-secure">
          <Lock size={14} aria-hidden="true" /> <span>Säker kassa</span>
        </span>
      </div>
    </header>
  );
}
