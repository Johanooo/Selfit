import { useParams } from 'wouter';
import { Listing } from '@/components/Listing';
import { usePageMeta } from '@/hooks/use-page-meta';
import { getBrand, getCategory, getCollection } from '@/data/categories';
import { products } from '@/data/products';
import { toItems } from '@/lib/catalog';
import NotFound from './not-found';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const c = getCategory(slug);
  usePageMeta(c ? `${c.name} – handla online` : 'Sidan finns inte', c?.intro ?? 'Sidan kunde inte hittas.');
  if (!c) return <NotFound />;
  return (
    <Listing
      eyebrow="Kategori"
      title={c.name}
      intro={c.intro}
      tone={c.tone}
      crumbs={[{ label: c.name }]}
      items={toItems(products.filter((p) => p.category === c.slug))}
    />
  );
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
      items={toItems(products.filter((p) => p.collections.includes(c.slug)))}
    />
  );
}
