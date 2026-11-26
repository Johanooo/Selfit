import { createContext, useContext, type ReactNode } from 'react';
import { Link } from 'wouter';
import { useCookiesOptional } from '@/state/cookies';

/**
 * I popupen i kassan ska länkar till andra villkorssidor öppnas i samma popup,
 * så att kunden inte lämnar kassan. Andra interna länkar öppnas då i ny flik.
 */
export const SupportLinkContext = createContext<((slug: string) => void) | null>(null);

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/**
 * Visar text där länkar skrivs som i Markdown: "Läs vår [integritetspolicy](/support/integritet)."
 * Interna länkar (/...), e-post (mailto:), telefon (tel:), externa sidor (https://)
 * och "#cookieinstallningar" (öppnar cookievalen) stöds.
 */
export function RichText({ text }: { text: string }) {
  const openSupport = useContext(SupportLinkContext);
  const openDialog = useCookiesOptional()?.openDialog ?? (() => undefined);
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const [all, label, href] = m;
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    const key = `${i}-${href}`;
    if (href === '#cookieinstallningar') {
      out.push(
        <button key={key} type="button" className="text-link link-btn" onClick={openDialog}>
          {label}
        </button>,
      );
    } else if (href.startsWith('/support/') && openSupport) {
      out.push(
        <a
          key={key}
          href={`${base}${href}`}
          className="text-link"
          onClick={(e) => {
            e.preventDefault();
            openSupport(href.slice('/support/'.length));
          }}
        >
          {label}
        </a>,
      );
    } else if (href.startsWith('/') && openSupport) {
      out.push(
        <a key={key} href={`${base}${href}`} target="_blank" rel="noopener" className="text-link">
          {label}
          <span className="sr-only"> (öppnas i ny flik)</span>
        </a>,
      );
    } else if (href.startsWith('/')) {
      out.push(
        <Link key={key} href={href} className="text-link">
          {label}
        </Link>,
      );
    } else if (/^https?:\/\//.test(href)) {
      out.push(
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-link">
          {label}
          <span className="sr-only"> (öppnas i ny flik)</span>
        </a>,
      );
    } else {
      out.push(
        <a key={key} href={href} className="text-link">
          {label}
        </a>,
      );
    }
    last = i + all.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
