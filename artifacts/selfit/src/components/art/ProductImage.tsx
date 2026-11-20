import type { Product, Variant } from '@/data/types';
import { getCategory } from '@/data/categories';
import { getFlavour } from '@/data/products';
import { PwoCan, PwoPack } from './PwoCan';
import { ProductArt } from './ProductArt';

export type ImageView = 'front' | 'pack' | 'photo';

export function galleryViews(product: Product, variant: Variant): ImageView[] {
  const views: ImageView[] = ['front'];
  if (variant.image.startsWith('can:') && variant.pack && variant.pack > 1) views.push('pack');
  views.push('photo');
  return views;
}

export function photoFor(product: Product): { src: string; alt: string } {
  const c = getCategory(product.category);
  return { src: c?.image ?? '/images/hero.jpg', alt: c?.imageAlt ?? product.name };
}

export function ProductImage({
  product,
  variant,
  view = 'front',
}: {
  product: Product;
  variant: Variant;
  view?: ImageView;
}) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (view === 'photo') {
    if (product.slug === 'pwo-plus') {
      const flavour = variant.flavour ?? 'blueberry';
      return (
        <PwoCan
          flavour={flavour}
          label={`SELFIT PWO+ ${getFlavour(flavour)?.name ?? ''}, burk 330 ml`}
          className="pwo-gallery-photo"
        />
      );
    }
    const p = photoFor(product);
    return (
      <img
        className={product.slug === 'pwo-plus' ? 'pwo-gallery-photo' : undefined}
        src={`${base}${p.src}`}
        alt={p.alt}
        loading="lazy"
      />
    );
  }
  if (variant.image.startsWith('can:')) {
    const flavour = variant.image.slice(4);
    if (view === 'pack' && variant.pack) return <PwoPack flavour={flavour} pack={variant.pack} />;
    return <PwoCan flavour={flavour} label={`PWO+ ${getFlavour(flavour)?.name ?? ''}, burk 330 ml`} />;
  }
  if (view === 'front' && product.primaryImage) {
    return (
      <img
        className="product-photo"
        src={`${base}${product.primaryImage}`}
        alt={product.primaryImageAlt ?? product.name}
        loading="lazy"
      />
    );
  }
  return <ProductArt product={product} />;
}
