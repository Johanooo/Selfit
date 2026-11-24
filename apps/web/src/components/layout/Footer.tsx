import { Link } from 'wouter';
import { Logo } from '@/components/Logo';
import { categories } from '@/data/categories';
import { useCookies } from '@/state/cookies';

export function Footer() {
  const { openDialog } = useCookies();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="stack-4">
            <Logo />
            <p className="muted small">
              Träning, hälsa och kroppsvård som är lätt att förstå. Tydliga priser, ärliga innehållsförteckningar och en
              kundtjänst som svarar.
            </p>
            <p className="small">
              <strong>Kundtjänst</strong>
              <br />
              <span className="muted">Vardagar 08–17 · 010-123 45 67</span>
            </p>
          </div>
          <nav aria-labelledby="f-shop">
            <h2 id="f-shop">Sortiment</h2>
            <ul>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/kategori/${c.slug}`}>{c.name}</Link>
                </li>
              ))}
              <li>
                <Link href="/kollektion/pwo-plus">PWO+</Link>
              </li>
              <li>
                <Link href="/kollektion/bastsaljare">Bästsäljare</Link>
              </li>
              <li>
                <Link href="/varumarke/selfit">Varumärket SELFIT</Link>
              </li>
            </ul>
          </nav>
          <nav aria-labelledby="f-help">
            <h2 id="f-help">Kundservice</h2>
            <ul>
              <li>
                <Link href="/support/kontakt">Kontakt</Link>
              </li>
              <li>
                <Link href="/support/frakt-och-leverans">Frakt och leverans</Link>
              </li>
              <li>
                <Link href="/support/retur-och-angerratt">Retur och ångerrätt</Link>
              </li>
              <li>
                <Link href="/ordersparning">Spåra order</Link>
              </li>
              <li>
                <Link href="/retur">Anmäl retur</Link>
              </li>
              <li>
                <Link href="/support/vanliga-fragor">Vanliga frågor</Link>
              </li>
            </ul>
          </nav>
          <nav aria-labelledby="f-legal">
            <h2 id="f-legal">Villkor</h2>
            <ul>
              <li>
                <Link href="/support/kopvillkor">Köpvillkor</Link>
              </li>
              <li>
                <Link href="/support/integritet">Integritet</Link>
              </li>
              <li>
                <Link href="/support/cookies">Om cookies</Link>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={openDialog} data-testid="button-cookie-settings">
                  Cookieinställningar
                </button>
              </li>
            </ul>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} SELFIT AB · Org.nr 559000-0000 (demo)</span>
          <span>Designprototyp – inga riktiga köp genomförs.</span>
        </div>
      </div>
    </footer>
  );
}
