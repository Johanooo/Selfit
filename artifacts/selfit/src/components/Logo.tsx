import { Link } from 'wouter';

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="SELFIT, till startsidan" data-testid="link-logo">
      <span className="logo-s" aria-hidden="true">
        S
      </span>
      <span aria-hidden="true">ELFIT</span>
    </Link>
  );
}
