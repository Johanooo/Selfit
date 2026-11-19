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

export function photoFor(product: Product, variant?: Variant): { src: string; alt: string } {
  if (product.slug === 'pwo-plus') {
    if (variant?.flavour === 'blueberry') {
      return {
        src: '/images/pwo-plus/blueberry-campaign.webp',
        alt: 'SELFIT PWO+ Blåbär, en 330 ml-burk med blåbär och blå färgeffekter',
      };
    }
    return {
      src: '/images/pwo-plus/flavour-lineup.jpeg',
      alt: 'SELFIT PWO+ i smakerna blåbär, jordgubb, bärmix, mango och passionsfrukt, grönt äpple samt Black Edition',
    };
  }
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
    const p = photoFor(product, variant);
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
