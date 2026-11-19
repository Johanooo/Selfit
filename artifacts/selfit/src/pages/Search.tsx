import { Link, useSearch } from 'wouter';
import { SearchX } from 'lucide-react';
import { Listing } from '@/components/Listing';
import { EmptyState } from '@/components/EmptyState';
import { usePageMeta } from '@/hooks/use-page-meta';
import { allItems, searchItems } from '@/lib/catalog';
import { categories } from '@/data/categories';

const SUGGESTIONS = ['PWO+', 'D-vitamin', 'Magnesium', 'Fuktkräm', 'Blåbär', 'Kreatin'];

export default function SearchPage() {
  const q = (new URLSearchParams(useSearch()).get('q') ?? '').trim();
  const items = q ? searchItems(q) : allItems();
  usePageMeta(q ? `Sök: ${q}` : 'Sök', q ? `Sökresultat för ${q} hos SELFIT.` : 'Sök bland hela sortimentet hos SELFIT.');

  return (
    <Listing
      eyebrow="Sök"
      title={
        q ? (
          <>
            Resultat för <span className="search-term">”{q}”</span>
          </>
        ) : (
          'Hela sortimentet'
        )
      }
      intro={
        q
          ? `${items.length} ${items.length === 1 ? 'träff' : 'träffar'} innan filter.`
          : 'Skriv i sökfältet ovan, eller filtrera bland alla produkter här.'
      }
      tone="surface"
      crumbs={[{ label: 'Sök' }]}
      items={items}
      emptyBase={
        <EmptyState
          icon={<SearchX size={28} />}
          title={`Vi hittade inget för ”${q}”`}
          actions={
            <>
              {categories.map((c) => (
                <Link key={c.slug} href={`/kategori/${c.slug}`} className="btn btn--secondary btn--sm">
                  {c.name}
                </Link>
              ))}
            </>
          }
        >
          <div className="stack-4">
            <p>Kontrollera stavningen eller prova ett bredare ord. Populära sökningar:</p>
            <ul className="suggest-list">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <Link href={`/sok?q=${encodeURIComponent(s)}`} className="chip" data-testid={`link-suggest-${s}`}>
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
            <p>Eller bläddra efter kategori:</p>
          </div>
        </EmptyState>
      }
    />
  );
}
