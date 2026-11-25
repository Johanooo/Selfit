import { Link, useParams } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { Listing } from '@/components/Listing';
import { ProductImage } from '@/components/art/ProductImage';
import { usePageMeta } from '@/hooks/use-page-meta';
import { getBrand, getCategory, getCollection, getSubcategory, subcategoriesOf } from '@/data/categories';
import { products } from '@/data/products';
import { toItems } from '@/lib/catalog';
import { lowestPrice30Days } from '@/lib/price-history';
import type { Tone } from '@/data/types';
import NotFound from './not-found';

/** Bildrutor för underkategorierna, som på Apotea. */
function SubcategoryTiles({ parent, tone }: { parent: string; tone: Tone }) {
  const subs = subcategoriesOf(parent)
    .map((sc) => ({ sc, list: products.filter((p) => p.subcategory === sc.slug).sort((a, b) => b.popularity - a.popularity) }))
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

/** Kategorisida för både huvudkategorier (/kategori/traning) och underkategorier (/kategori/pre-workout). */
export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const c = getCategory(slug);
  const sub = c ? undefined : getSubcategory(slug);
  const parent = sub ? getCategory(sub.parent) : undefined;
  const name = c?.name ?? sub?.name;
  const intro = c?.intro ?? sub?.intro;
  usePageMeta(name ? `${name} – handla online` : 'Sidan finns inte', intro ?? 'Sidan kunde inte hittas.');

  if (c) {
    return (
      <Listing
        eyebrow="Kategori"
        title={c.name}
        intro={c.intro}
        tone={c.tone}
        crumbs={[{ label: c.name }]}
        before={<SubcategoryTiles parent={c.slug} tone={c.tone} />}
        items={toItems(products.filter((p) => p.category === c.slug))}
      />
    );
  }
  if (sub && parent) {
    return (
      <Listing
        eyebrow={parent.name}
        title={sub.name}
        intro={sub.intro}
        tone={parent.tone}
        crumbs={[{ label: parent.name, href: `/kategori/${parent.slug}` }, { label: sub.name }]}
        items={toItems(products.filter((p) => p.subcategory === sub.slug))}
      />
    );
  }
  return <NotFound />;
}

export function BrandPage() {
  const { slug } = useParams<{ slug: string }>();
  const b = getBrand(slug);
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
          ? toItems(products).filter((item) => item.variants.some((v) => lowestPrice30Days(v.priceHistory) !== null))
          : toItems(products.filter((p) => p.collections.includes(c.slug)))
      }
    />
  );
}
