import { Link } from 'wouter';
import { usePageMeta } from '@/hooks/use-page-meta';

export default function NotFound() {
  usePageMeta('Sidan finns inte', 'Sidan du letar efter kunde inte hittas.');
  return (
    <div className="container not-found">
      <p className="not-found-code" aria-hidden="true">
        404
      </p>
      <h1 className="h1">Sidan finns inte</h1>
      <p className="lead">Länken kan vara gammal, eller så har produkten flyttat. Prova att söka eller gå till startsidan.</p>
      <div className="empty-actions">
        <Link href="/" className="btn btn--primary" data-testid="link-home">
          Till startsidan
        </Link>
        <Link href="/sok" className="btn btn--secondary">
          Sök produkter
        </Link>
      </div>
    </div>
  );
}
