import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Check } from 'lucide-react';
import { ProductImage } from '@/components/art/ProductImage';
import { getCategory } from '@/data/categories';
import { clearVariant, displayVariant, productHref, type Filters, type ListingItem } from '@/lib/catalog';
import { comparison, depositTotal, isBuyable, kr, packLabel, stockState } from '@/lib/format';
import { lowestPrice30Days } from '@/lib/price-history';
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
  const low30 = lowestPrice30Days(v.priceHistory);
  // En annan förpackning än den som visas kan vara på kampanj.
  const otherSale = low30 === null ? item.variants.find((x) => isBuyable(x) && lowestPrice30Days(x.priceHistory) !== null) : undefined;
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
          {allOut ? (
            <span className="badge badge--out">Slutsåld</span>
          ) : low30 !== null || otherSale ? (
            <span className="badge badge--sale">Kampanj</span>
          ) : product.isNew ? (
            <span className="badge badge--new">Nyhet</span>
          ) : low ? (
            <span className="badge badge--low">Få kvar</span>
          ) : null}
          {product.primaryImage && <span className="badge badge--muted">Exempelbild</span>}
        </div>
        {item.variants.length > 1 && (
          <span className="product-card-count">
            {flavour || !item.variants.some((x) => x.pack) ? `${item.variants.length} varianter` : `${item.variants.length} storlekar`}
          </span>
        )}
      </div>
      {clear && isBuyable(clear) ? (
        <button
          type="button"
          className={`card-buy${added ? ' card-buy--done' : ''}`}
          aria-label={added ? `${title} tillagd i varukorgen` : `Lägg ${title} ${packLabel(clear.pack)} i varukorgen`}
          onClick={() => {
            if (add(clear.id)) setAdded(true);
          }}
          data-testid={`button-quickbuy-${testId}`}
        >
          {added ? (
            <>
              <Check size={16} aria-hidden="true" /> Tillagd
            </>
          ) : (
            'Köp'
          )}
        </button>
      ) : (
        <Link
          href={href}
          className={`card-buy${allOut ? ' card-buy--off' : ''}`}
          aria-label={allOut ? `${title} är slutsåld, visa produkt` : `Välj förpackning för ${title}`}
          data-testid={`link-choose-${testId}`}
        >
          {allOut ? 'Slutsåld' : 'Välj'}
        </Link>
      )}
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
          <p className={`price${low30 !== null ? ' price--sale' : ''}`} data-testid={`text-price-${testId}`}>
            {priceVaries && <span className="price-from">från</span>}
            {kr(v.price)}
            {low30 !== null && <span className="price-was">{kr(low30)}</span>}
          </p>
          {/* En kort rad med jämförpris och pant. Mer detaljer finns på produktsidan. */}
          {(cmp || depositTotal(v) > 0) && (
            <p className="price-compare">{[cmp, depositTotal(v) > 0 ? `+ pant ${kr(depositTotal(v))}` : null].filter(Boolean).join(' · ')}</p>
          )}
        </div>
      </div>
    </article>
  );
}
