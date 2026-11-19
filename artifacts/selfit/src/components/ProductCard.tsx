import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { ProductImage } from '@/components/art/ProductImage';
import { getCategory } from '@/data/categories';
import { clearVariant, displayVariant, productHref, type Filters, type ListingItem } from '@/lib/catalog';
import { comparison, depositTotal, isBuyable, kr, packLabel, stockState } from '@/lib/format';
import { useCart } from '@/state/cart';

export function ProductCard({ item, filters, index = 0 }: { item: ListingItem; filters?: Filters; index?: number }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const v = displayVariant(item, filters);
  const clear = clearVariant(item, filters);
  const { product, flavour } = item;
  const tone = getCategory(product.category)?.tone ?? 'lavender';
  const href = productHref(product, { flavour: v.flavour, pack: clear?.pack });
  const priceVaries = new Set(item.variants.map((x) => x.price)).size > 1 && !clear;
  const allOut = item.variants.every((x) => !isBuyable(x));
  const low = !allOut && item.variants.some((x) => stockState(x) === 'low');
  const title = flavour ? `${product.name} ${flavour.name}` : product.name;
  const cmp = comparison(v);
  const testId = item.key;

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1600);
    return () => window.clearTimeout(t);
  }, [added]);

  return (
    <article className="product-card" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }} data-testid={`card-product-${testId}`}>
      <div className={`product-card-media tone-${tone}`}>
        <ProductImage product={product} variant={v} />
        <div className="product-card-badge">
          {product.primaryImage && <span className="badge badge--new">Exempelbild</span>}
          {allOut ? (
            <span className="badge badge--out">Slutsåld</span>
          ) : product.isNew ? (
            <span className="badge badge--new">Nyhet</span>
          ) : low ? (
            <span className="badge badge--low">Få kvar</span>
          ) : null}
        </div>
      </div>
      <div className="product-card-body">
        <span className="product-card-brand">{product.brand}</span>
        <h3 className="product-card-title">
          <Link href={href} data-testid={`link-product-${testId}`}>
            {title}
          </Link>
        </h3>
        <p className="product-card-sub">{flavour ? flavour.note : product.sizeLabel}</p>
        {item.variants.some((x) => x.pack) && item.variants.length > 1 && (
          <ul className="chips" aria-label="Förpackningar">
            {item.variants.map((x) => (
              <li key={x.id}>
                <Link
                  href={productHref(product, { flavour: x.flavour, pack: x.pack })}
                  className={`chip ${isBuyable(x) ? '' : 'chip--off'}`}
                  data-testid={`link-pack-${x.id}`}
                >
                  {packLabel(x.pack)}
                  {!isBuyable(x) && <span className="sr-only"> (slutsåld)</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="product-card-foot">
          <div>
            <p className="price" data-testid={`text-price-${testId}`}>
              {priceVaries && <span className="price-from">från</span>}
              {kr(v.price)}
            </p>
            {cmp && <p className="price-compare">Jämförpris {cmp}</p>}
            {depositTotal(v) > 0 && <p className="price-compare">+ pant {kr(depositTotal(v))}</p>}
          </div>
          {clear && isBuyable(clear) ? (
            <button
              type="button"
              className={`quick-buy ${added ? 'quick-buy--done' : ''}`}
              aria-label={added ? `${title} tillagd i varukorgen` : `Lägg ${title} ${packLabel(clear.pack)} i varukorgen`}
              onClick={() => {
                if (add(clear.id)) setAdded(true);
              }}
              data-testid={`button-quickbuy-${testId}`}
            >
              {added ? <Check size={20} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
            </button>
          ) : (
            <Link
              href={href}
              className="quick-buy quick-buy--outline"
              aria-label={allOut ? `${title} är slutsåld, visa produkt` : `Välj förpackning för ${title}`}
              data-testid={`link-choose-${testId}`}
            >
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
