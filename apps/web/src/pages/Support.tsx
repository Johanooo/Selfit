import { Link, useParams } from 'wouter';
import { ArrowRight, Plus } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { usePageMeta } from '@/hooks/use-page-meta';
import { getSupportPage, supportPages, type Faq } from '@/data/support';
import NotFound from './not-found';

function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="details-list">
      {items.map((f, i) => (
        <details className="details-item" key={f.q} data-testid={`faq-${i}`}>
          <summary>
            {f.q} <Plus size={20} aria-hidden="true" />
          </summary>
          <div className="details-body">
            <p>{f.a}</p>
          </div>
        </details>
      ))}
    </div>
  );
}

function SideNav({ current }: { current?: string }) {
  return (
    <nav className="side-nav" aria-label="Kundservice">
      <ul>
        <li>
          <Link href="/support" aria-current={!current ? 'page' : undefined}>
            Översikt
          </Link>
        </li>
        {supportPages.map((p) => (
          <li key={p.slug}>
            <Link href={`/support/${p.slug}`} aria-current={current === p.slug ? 'page' : undefined}>
              {p.title}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/ordersparning">Spåra order</Link>
        </li>
        <li>
          <Link href="/retur">Anmäl retur</Link>
        </li>
      </ul>
    </nav>
  );
}

export function SupportIndexPage() {
  usePageMeta('Kundservice', 'Svar om frakt, retur, pant, köpvillkor och PWO+. Kontakta SELFIT kundtjänst.');
  const faq = getSupportPage('vanliga-fragor')?.faq ?? [];
  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: 'Kundservice' }]} />
      <header className="listing-intro tone-lavender">
        <div className="stack-3">
          <p className="eyebrow">Kundservice</p>
          <h1 className="h1">Hur kan vi hjälpa dig?</h1>
          <p className="lead">Vardagar 08–17. Oftast svar inom två timmar, från en människa.</p>
        </div>
      </header>
      <div className="support-layout">
        <SideNav />
        <div className="stack-7">
          <ul className="topic-grid">
            {supportPages.map((p) => (
              <li key={p.slug}>
                <Link href={`/support/${p.slug}`} className="help-card" data-testid={`link-support-${p.slug}`}>
                  <h2 className="h3">{p.title}</h2>
                  <p className="small muted">{p.summary}</p>
                  <span className="arrow-link small">
                    Läs mer <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <section className="stack-4" aria-labelledby="faq-title">
            <h2 id="faq-title" className="h2">
              Vanliga frågor
            </h2>
            <FaqList items={faq} />
          </section>
        </div>
      </div>
    </div>
  );
}

export function SupportArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const page = getSupportPage(slug);
  usePageMeta(page?.title ?? 'Sidan finns inte', page?.summary ?? 'Sidan kunde inte hittas.');
  if (!page) return <NotFound />;
  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: 'Kundservice', href: '/support' }, { label: page.title }]} />
      <div className="support-layout">
        <SideNav current={page.slug} />
        <article className="stack-6" style={{ maxWidth: 'var(--container-narrow)' }}>
          <header className="stack-3">
            <h1 className="h1">{page.title}</h1>
            <p className="lead">{page.summary}</p>
          </header>
          {page.sections.map((s) => (
            <section key={s.heading} className="prose-block">
              <h2 className="h2">{s.heading}</h2>
              {s.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {s.list && (
                <ul>
                  {s.list.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          {page.slug === 'retur-och-angerratt' && (
            <Link href="/retur" className="btn btn--primary">
              Anmäl retur
            </Link>
          )}
          {page.faq && page.faq.length > 0 && (
            <section className="stack-4" aria-labelledby="article-faq">
              <h2 id="article-faq" className="h2">
                {page.slug === 'vanliga-fragor' ? 'Frågor och svar' : 'Vanliga frågor'}
              </h2>
              <FaqList items={page.faq} />
            </section>
          )}
        </article>
      </div>
    </div>
  );
}
