import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearch } from 'wouter';
import { Clock, Info, Plus, Truck, RotateCcw, AlertTriangle, Check } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ProductCard } from '@/components/ProductCard';
import { QuantityStepper } from '@/components/QuantityStepper';
import { ProductImage, galleryViews, type ImageView } from '@/components/art/ProductImage';
import { usePageMeta } from '@/hooks/use-page-meta';
import { getCategory } from '@/data/categories';
import { getFlavour, getProduct, pwoFlavours, CAN_ML } from '@/data/products';
import type { Product, Variant } from '@/data/types';
import { itemsForSlugs } from '@/lib/catalog';
import { comparison, depositTotal, isBuyable, kr, litres, packLabel, stockState, stockText } from '@/lib/format';
import { useCart } from '@/state/cart';
import NotFound from './not-found';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const product = getProduct(slug);
  if (!product) return <NotFound />;
  return <ProductView key={product.slug} product={product} />;
}

function uniq<T>(arr: (T | undefined)[]): T[] {
  return [...new Set(arr.filter((x): x is T => x !== undefined))];
}

function firstBuyable(list: Variant[]): Variant | undefined {
  return list.find(isBuyable) ?? list.find((v) => v.offered) ?? list[0];
}

/** Resolve URL query to a variant, falling back gracefully. */
function resolve(product: Product, smak: string | null, pack: string | null) {
  const flavours = uniq(product.variants.map((v) => v.flavour));
  const flavour = flavours.includes(smak ?? '') ? smak! : flavours[0];
  const inFlavour = product.variants.filter((v) => v.flavour === flavour);
  const packNum = Number(pack);
  const exact = inFlavour.find((v) => v.pack === packNum && v.offered);
  return exact ?? firstBuyable(inFlavour.length ? inFlavour : product.variants)!;
}

function highlightAllergens(text: string, allergens: string[]) {
  if (!allergens.length) return text;
  const re = new RegExp(`(${allergens.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.split(re).map((part, i) =>
    allergens.some((a) => a.toLowerCase() === part.toLowerCase()) ? (
      <strong key={i} className="allergen">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

function ProductView({ product }: { product: Product }) {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(useSearch());
  const variant = resolve(product, params.get('smak'), params.get('pack'));
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<ImageView>('front');
  const [notice, setNotice] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const { add } = useCart();

  const category = getCategory(product.category);
  const flavour = getFlavour(variant.flavour);
  const flavours = uniq(product.variants.map((v) => v.flavour));
  const packs = uniq(product.variants.map((v) => v.pack)).sort((a, b) => a - b);
  const showFlavours = flavours.length > 1;
  const showPacks = packs.length > 1;
  const buyable = isBuyable(variant);
  const deposit = depositTotal(variant);
  const cmp = comparison(variant);
  const views = galleryViews(product, variant);
  const title = flavour ? `${product.name} ${flavour.name}` : product.name;

  usePageMeta(
    `${title}${variant.pack && showPacks ? ` ${packLabel(variant.pack)}` : ''} – ${kr(variant.price)}`,
    `${product.tagline} ${kr(variant.price)}${cmp ? `, jämförpris ${cmp}` : ''}. Skickas inom 1–2 vardagar.`,
  );

  // Keep canonical URL in sync with the resolved variant
  useEffect(() => {
    const qs = new URLSearchParams();
    if (variant.flavour && showFlavours) qs.set('smak', variant.flavour);
    if (variant.pack && showPacks) qs.set('pack', String(variant.pack));
    const want = qs.toString();
    const current = new URLSearchParams(window.location.search).toString();
    if (want !== current) navigate(`/produkt/${product.slug}${want ? `?${want}` : ''}`, { replace: true });
  }, [variant.id, product.slug, showFlavours, showPacks, navigate, variant.flavour, variant.pack]);

  useEffect(() => {
    if (!views.includes(view)) setView('front');
  }, [variant.id, view, views]);

  useEffect(() => {
    if (!justAdded) return;
    const t = window.setTimeout(() => setJustAdded(false), 1800);
    return () => window.clearTimeout(t);
  }, [justAdded]);

  const go = (v: Variant) => {
    const qs = new URLSearchParams();
    if (v.flavour && showFlavours) qs.set('smak', v.flavour);
    if (v.pack && showPacks) qs.set('pack', String(v.pack));
    const s = qs.toString();
    navigate(`/produkt/${product.slug}${s ? `?${s}` : ''}`, { replace: true });
    setQty(1);
  };

  const selectFlavour = (slug: string) => {
    const inF = product.variants.filter((v) => v.flavour === slug);
    const same = inF.find((v) => v.pack === variant.pack);
    if (same && isBuyable(same)) {
      setNotice(null);
      go(same);
      return;
    }
    const fallback = firstBuyable(inF)!;
    const fName = getFlavour(slug)?.name ?? '';
    if (variant.pack && fallback.pack !== variant.pack) {
      const why = same && same.offered ? 'är slutsåld' : 'finns inte';
      setNotice(`${packLabel(variant.pack)} ${why} i smaken ${fName}. Vi har valt ${packLabel(fallback.pack)} åt dig.`);
    } else setNotice(null);
    go(fallback);
  };

  const selectPack = (p: number) => {
    const v = product.variants.find((x) => x.pack === p && x.flavour === variant.flavour);
    if (v && v.offered) {
      setNotice(null);
      go(v);
    }
  };

  const packStatus = (p: number) => {
    const v = product.variants.find((x) => x.pack === p && x.flavour === variant.flavour);
    if (!v || !v.offered) return { v, state: 'unavailable' as const, text: 'Finns ej i denna smak' };
    if (v.stock <= 0) return { v, state: 'soldout' as const, text: 'Slutsåld' };
    return { v, state: 'ok' as const, text: comparison(v) ?? '' };
  };

  const st = stockState(variant);
  const related = itemsForSlugs(product.related.length ? product.related : []);
  const pairs = itemsForSlugs(product.pairsWith);

  return (
    <div className="container page">
      <Breadcrumbs
        items={[
          ...(category ? [{ label: category.name, href: `/kategori/${category.slug}` }] : []),
          { label: title },
        ]}
      />

      <div className="pdp">
        <section className="pdp-gallery" aria-label="Produktbilder">
          <div
            className={`gallery-main tone-${category?.tone ?? 'lavender'} ${view === 'photo' ? 'gallery-main--photo' : ''}`}
            data-testid="img-product-main"
          >
            <ProductImage key={`${variant.id}-${view}`} product={product} variant={variant} view={view} />
          </div>
          {product.primaryImage && <p className="image-placeholder-note">Tillfällig exempelbild – kan bytas ut senare.</p>}
          {views.length > 1 && (
            <ul className="thumbs" aria-label="Välj bild">
              {views.map((v) => (
                <li key={v}>
                  <button
                    type="button"
                    className={`thumb tone-${category?.tone ?? 'lavender'}`}
                    aria-pressed={view === v}
                    aria-label={v === 'front' ? 'Visa produktbild' : v === 'pack' ? 'Visa förpackning' : product.slug === 'pwo-plus' ? 'Visa smakbilder' : 'Visa miljöbild'}
                    onClick={() => setView(v)}
                    data-testid={`button-thumb-${v}`}
                  >
                    <ProductImage product={product} variant={variant} view={v} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="pdp-info">
          <div className="stack-3">
            <Link href={`/varumarke/${product.brandSlug}`} className="eyebrow" data-testid="link-brand">
              {product.brand}
            </Link>
            <h1 className="pdp-title" data-testid="text-product-name">
              {title}
            </h1>
            <p className="lead">{product.tagline}</p>
          </div>

          {showFlavours && (
            <fieldset className="option-group">
              <legend>
                Smak: <span>{flavour?.name}</span>
              </legend>
              <div className="options">
                {pwoFlavours
                  .filter((f) => flavours.includes(f.slug))
                  .map((f) => {
                    const anyBuyable = product.variants.some((v) => v.flavour === f.slug && isBuyable(v));
                    return (
                      <button
                        key={f.slug}
                        type="button"
                        className="option"
                        aria-pressed={variant.flavour === f.slug}
                        data-state={anyBuyable ? 'ok' : 'soldout'}
                        onClick={() => selectFlavour(f.slug)}
                        data-testid={`button-flavour-${f.slug}`}
                      >
                        <span className="swatch" style={{ background: `var(--flavour-${f.slug})` }} aria-hidden="true" />
                        {f.name}
                        {!anyBuyable && <span className="option-meta">Slutsåld</span>}
                      </button>
                    );
                  })}
              </div>
            </fieldset>
          )}

          {showPacks && (
            <fieldset className="option-group">
              <legend>
                Förpackning: <span>{packLabel(variant.pack)}</span>
              </legend>
              <div className="options">
                {packs.map((p) => {
                  const s = packStatus(p);
                  const unavailable = s.state === 'unavailable';
                  return (
                    <button
                      key={p}
                      type="button"
                      className="option option-pack"
                      aria-pressed={variant.pack === p}
                      disabled={unavailable}
                      data-state={s.state}
                      aria-describedby={`pack-${p}-meta`}
                      onClick={() => selectPack(p)}
                      data-testid={`button-pack-${p}`}
                    >
                      {packLabel(p)}
                      <span className="option-meta" id={`pack-${p}-meta`}>
                        {s.state === 'ok' && s.v ? `${kr(s.v.price)} · ${s.text}` : s.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {notice && (
            <p className="notice notice--info" role="status" data-testid="text-variant-notice">
              <Info size={16} aria-hidden="true" />
              {notice}
            </p>
          )}

          <section className="buy-box" aria-label="Köp">
            <div className="stack-2">
              <p className="buy-price" data-testid="text-product-price">
                {kr(variant.price)}
              </p>
              <div className="buy-meta">
                {cmp && <p data-testid="text-comparison">Jämförpris {cmp}</p>}
                {deposit > 0 && (
                  <p data-testid="text-deposit">
                    + pant {kr(deposit)} ({kr(variant.depositPerUnit)} per {product.unitLabel}, tillkommer)
                  </p>
                )}
                <p>Pris inkl. moms</p>
              </div>
            </div>
            <p className={`stock stock--${st === 'unavailable' ? 'out' : st}`} data-testid="text-stock">
              {stockText(variant)}
            </p>
            {!buyable && (
              <p className="notice notice--danger">
                <AlertTriangle size={16} aria-hidden="true" />
                {showPacks || showFlavours
                  ? 'Den här kombinationen går inte att köpa just nu. Välj en annan smak eller förpackning.'
                  : 'Produkten är tillfälligt slut. Vi fyller på så snart vi kan.'}
              </p>
            )}
            <div className="buy-row">
              <QuantityStepper value={qty} onChange={setQty} label="Antal" id="product" max={buyable ? Math.min(20, variant.stock) : 1} />
              <button
                type="button"
                className="btn btn--primary"
                disabled={!buyable}
                onClick={() => {
                  if (add(variant.id, qty)) setJustAdded(true);
                }}
                data-testid="button-add-to-cart"
              >
                {justAdded ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                {!buyable ? 'Ej köpbar' : justAdded ? 'Tillagd' : 'Lägg i varukorgen'}
              </button>
            </div>
            <ul className="delivery-list">
              <li>
                <Clock size={16} aria-hidden="true" /> Skickas inom 1–2 vardagar
              </li>
              <li>
                <Truck size={16} aria-hidden="true" /> Fri frakt till ombud över 499 kr
              </li>
              <li>
                <RotateCcw size={16} aria-hidden="true" /> 30 dagars öppet köp på oöppnade varor
              </li>
            </ul>
          </section>

          <div className="details-list">
            <details className="details-item" open>
              <summary>
                Beskrivning <Plus size={20} aria-hidden="true" />
              </summary>
              <div className="details-body">
                {product.description.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </details>
            <details className="details-item">
              <summary>
                Användning <Plus size={20} aria-hidden="true" />
              </summary>
              <div className="details-body">
                <p>{product.usage}</p>
              </div>
            </details>
            <details className="details-item">
              <summary>
                Ingredienser och näringsvärde <Plus size={20} aria-hidden="true" />
              </summary>
              <div className="details-body">
                <p>{highlightAllergens(product.ingredients, product.allergens)}</p>
                <p className="small muted">
                  {product.allergens.length
                    ? 'Allergener är markerade med fetstil och understrykning.'
                    : 'Innehåller inga av de 14 vanligaste allergenerna.'}
                </p>
                {product.nutrition && (
                  <table className="data-table">
                    <caption className="sr-only">Näringsvärde</caption>
                    <thead>
                      <tr>
                        <th scope="col">Näringsvärde</th>
                        <th scope="col">per 100 ml</th>
                        <th scope="col">{product.nutrition.servingLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.nutrition.rows.map((r) => (
                        <tr key={r.label}>
                          <th scope="row">{r.label}</th>
                          <td>{r.per100}</td>
                          <td>{r.perServing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </details>
            <details className="details-item">
              <summary>
                Produktfakta <Plus size={20} aria-hidden="true" />
              </summary>
              <div className="details-body">
                <dl className="facts">
                  <dt>Varumärke</dt>
                  <dd>{product.brand}</dd>
                  <dt>EAN</dt>
                  <dd data-testid="text-ean">{variant.ean}</dd>
                  {variant.pack && (
                    <>
                      <dt>Förpackning</dt>
                      <dd>
                        {variant.flavour
                          ? `${variant.pack} × ${CAN_ML} ml = ${litres(variant.measure?.amount ?? 0)}`
                          : `${variant.pack} × ${product.sizeLabel}`}
                      </dd>
                    </>
                  )}
                  {!variant.pack && (
                    <>
                      <dt>Storlek</dt>
                      <dd>{product.sizeLabel}</dd>
                    </>
                  )}
                  {product.facts.map((f) => (
                    <div key={f.label} style={{ display: 'contents' }}>
                      <dt>{f.label}</dt>
                      <dd>{f.value}</dd>
                    </div>
                  ))}
                  <dt>Moms</dt>
                  <dd>{Math.round(product.vatRate * 100)} %</dd>
                </dl>
              </div>
            </details>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section" aria-labelledby="similar-title">
          <h2 id="similar-title" className="h1" style={{ marginBottom: 'var(--space-6)' }}>
            Liknande produkter
          </h2>
          <ul className="product-grid product-grid--4">
            {related.map((item, i) => (
              <li key={item.key}>
                <ProductCard item={item} index={i} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {pairs.length > 0 && (
        <section className="section--tight" aria-labelledby="pairs-title">
          <h2 id="pairs-title" className="h1" style={{ marginBottom: 'var(--space-6)' }}>
            Passar ihop med
          </h2>
          <ul className="product-grid product-grid--4">
            {pairs.map((item, i) => (
              <li key={item.key}>
                <ProductCard item={item} index={i} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
