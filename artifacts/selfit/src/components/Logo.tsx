import { Link } from 'wouter';

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="SELFIT, till startsidan" data-testid="link-logo">
      <img className="logo-mark" src={`${import.meta.env.BASE_URL}images/selfit-logo.svg`} alt="" />
    </Link>
  );
}
