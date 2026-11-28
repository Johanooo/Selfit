import { CategoryIntro, plainText } from '@/components/CategoryIntro';
import { Link, useParams } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { Listing } from '@/components/Listing';
import { ProductImage } from '@/components/art/ProductImage';
import { usePageMeta } from '@/hooks/use-page-meta';
import { getBrand, getCategory, getCollection, getSubcategory, subcategoriesOf } from '@/data/categories';
import { productsIn } from '@/data/taxonomy';
import { EmptyState } from '@/components/EmptyState';
import { PackageOpen } from 'lucide-react';
import { products } from '@/data/products';
import { toItems } from '@/lib/catalog';
import { isOnSale } from '@/lib/price-history';
import { getCampaign } from '@/data/campaigns';
import type { Tone } from '@/data/types';
import NotFound from './not-found';

/** Bildrutor för underkategorierna, som på Apotea. */
function SubcategoryTiles({ parent, tone }: { parent: string; tone: Tone }) {
  const subs = subcategoriesOf(parent)
    .map((sc) => ({ sc, list: productsIn(sc.slug).sort((a, b) => b.popularity - a.popularity) }))
    .filter((x) => x.list.length > 0);
  if (!subs.length) return null;
  return (
    <nav className="subcat-tiles" aria-label="Underkategorier">
      <ul>
        {subs.map(({ sc, list }) => {
          const top = list[0];
          const v = top.variants.find((x) => x.offered) ?? top.variants[0];
          return (
            <li key={sc.slug}>
              <Link href={`/kategori/${sc.slug}`} className="subcat-tile" data-testid={`link-subcat-${sc.slug}`}>
                <span className={`subcat-tile-media tone-${tone}`} aria-hidden="true">
                  <ProductImage product={top} variant={v} />
                </span>
                <span className="subcat-tile-name">
                  {sc.name}
                  <ChevronRight size={16} aria-hidden="true" />
                </span>
                <span className="subcat-tile-count">{list.length} {list.length === 1 ? 'produkt' : 'produkter'}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Visas när en kategori ännu inte har några produkter. */
function ComingSoon({ name }: { name: string }) {
  return (
    <EmptyState
      icon={<PackageOpen size={28} />}
      title={`${name} kommer snart`}
      actions={
        <Link href="/kollektion/nyheter" className="btn btn--primary">
          Se nyheter
        </Link>
      }
    >
      Vi håller på att fylla på sortimentet här. Titta gärna in igen snart.
    </EmptyState>
  );
}

/** Kategorisida för både huvudkategorier (/kategori/kosttillskott) och underkategorier (/kategori/pre-workout). */
export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const c = getCategory(slug);
  const sub = c ? undefined : getSubcategory(slug);
  const parent = sub ? getCategory(sub.parent) : undefined;
  const name = c?.name ?? sub?.name;
  const intro = c?.intro ?? sub?.intro;
  usePageMeta(name ? `${name} – handla online` : 'Sidan finns inte', intro ? plainText(intro).slice(0, 160) : 'Sidan kunde inte hittas.');

  if (c) {
    return (
      <Listing
        eyebrow="Kategori"
        title={c.name}
        intro={<CategoryIntro text={c.intro} />}
        tone={c.tone}
        crumbs={[{ label: c.name }]}
        before={<SubcategoryTiles parent={c.slug} tone={c.tone} />}
        items={toItems(productsIn(c.slug))}
        emptyBase={<ComingSoon name={c.name} />}
      />
    );
  }
  if (sub && parent) {
    return (
      <Listing
        eyebrow={parent.name}
        title={sub.name}
        intro={<CategoryIntro text={sub.intro} />}
        tone={parent.tone}
        crumbs={[{ label: parent.name, href: `/kategori/${parent.slug}` }, { label: sub.name }]}
        items={toItems(productsIn(sub.slug))}
        emptyBase={<ComingSoon name={sub.name} />}
      />
    );
  }
  return <NotFound />;
}

export function BrandPage() {
  const { slug } = useParams<{ slug: string }>();
  // Varumärken som skapats i Admin finns inte i koden – då hämtas namnet från produkterna.
  const fromProducts = products.find((p) => p.brandSlug === slug);
  const b = getBrand(slug) ?? (fromProducts ? { slug, name: fromProducts.brand, intro: `Alla produkter från ${fromProducts.brand}.` } : undefined);
  usePageMeta(b ? `${b.name} – alla produkter` : 'Sidan finns inte', b?.intro ?? 'Sidan kunde inte hittas.');
  if (!b) return <NotFound />;
  return (
    <Listing
      eyebrow="Varumärke"
      title={b.name}
      intro={b.intro}
      tone="surface"
      crumbs={[{ label: 'Varumärken' }, { label: b.name }]}
      items={toItems(products.filter((p) => p.brandSlug === b.slug))}
    />
  );
}

export function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const c = getCollection(slug);
  usePageMeta(c ? `${c.name} hos SELFIT` : 'Sidan finns inte', c?.intro ?? 'Sidan kunde inte hittas.');
  if (!c) return <NotFound />;
  return (
    <Listing
      eyebrow="Kollektion"
      title={c.name}
      intro={c.intro}
      tone="lavender"
      crumbs={[{ label: c.name }]}
      items={
        c.slug === 'kampanjer'
          ? toItems(products).filter((item) => item.variants.some((v) => isOnSale(v)))
          : toItems(products.filter((p) => p.collections.includes(c.slug)))
      }
    />
  );
}

/** Kampanjsidan, t.ex. /kampanj/black-week. Listar produkterna som har kampanjens pris just nu. */
export function CampaignPage() {
  const { slug } = useParams<{ slug: string }>();
  const c = getCampaign(slug);
  usePageMeta(c ? `${c.title} hos SELFIT` : 'Kampanjen är slut', c?.intro || 'Kampanjen är slut. Se våra andra kampanjer.');
  const end = c?.endsOn ? new Date(`${c.endsOn}T12:00:00`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' }) : null;
  if (!c) {
    // Gamla länkar till en kampanj som slutat visar de kampanjer som pågår nu.
    return (
      <Listing
        eyebrow="Kampanj"
        title="Kampanjen är slut"
        intro="Den här kampanjen pågår inte längre. Här är det som är nedsatt just nu."
        tone="lavender"
        crumbs={[{ label: 'Kampanjer', href: '/kollektion/kampanjer' }, { label: 'Kampanjen är slut' }]}
        items={toItems(products).filter((item) => item.variants.some((v) => isOnSale(v)))}
      />
    );
  }
  return (
    <Listing
      eyebrow={end ? `Kampanj · t.o.m. ${end}` : 'Kampanj'}
      title={c.title}
      intro={c.intro}
      tone="lavender"
      crumbs={[{ label: 'Kampanjer', href: '/kollektion/kampanjer' }, { label: c.title }]}
      items={toItems(products).filter((item) => item.variants.some((v) => v.campaign === c.slug))}
    />
  );
}
