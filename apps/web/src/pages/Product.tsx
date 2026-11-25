import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearch } from 'wouter';
import { Clock, Info, Plus, Truck, RotateCcw, AlertTriangle, Check, Maximize2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ProductCard } from '@/components/ProductCard';
import { QuantityStepper } from '@/components/QuantityStepper';
import { ProductImage, galleryViews, type ImageView } from '@/components/art/ProductImage';
import { PwoPack } from '@/components/art/PwoCan';
import { ImageLightbox } from '@/components/ImageLightbox';
import { usePageMeta } from '@/hooks/use-page-meta';
import { getCategory, getSubcategory } from '@/data/categories';
import { getFlavour, getProduct, pwoFlavours, CAN_ML } from '@/data/products';
import type { Product, Variant } from '@/data/types';
import { itemsForSlugs } from '@/lib/catalog';
import { comparison, depositTotal, isBuyable, kr, litres, packLabel, stockState, stockText } from '@/lib/format';
import { lowestPrice30Days } from '@/lib/price-history';
import { PriceHistory } from '@/components/PriceHistory';
import { useCart } from '@/state/cart';
import NotFound from './not-found';

/** Obligatorisk text för kosttillskott (LIVSFS 2003:9). */
const SUPPLEMENT_WARNING =
  'Detta är ett kosttillskott. Rekommenderad daglig dos bör inte överskridas. Kosttillskott bör inte användas som ersättning för en varierad kost och en hälsosam livsstil. Förvaras utom räckhåll för små barn.';

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

function flavourStatus(product: Product, slug: string, pack?: number) {
  const variants = product.variants.filter((v) => v.flavour === slug);
  if (pack !== undefined) {
    const combination = variants.find((v) => v.pack === pack);
    if (!combination || !combination.offered) {
      return { state: 'unavailable' as const, text: 'Finns inte i denna förpackning' };
    }
    if (combination.stock <= 0) return { state: 'soldout' as const, text: 'Slut i lager' };
    return { state: 'ok' as const, text: '' };
  }
  if (variants.some(isBuyable)) return { state: 'ok' as const, text: '' };
  if (variants.some((v) => v.offered)) return { state: 'soldout' as const, text: 'Slut i lager' };
  return { state: 'unavailable' as const, text: 'Finns inte i denna förpackning' };
}

/** Resolve URL query to a variant, falling back gracefully. */
function resolve(product: Product, smak: string | null, pack: string | null) {
  const flavours = uniq(product.variants.map((v) => v.flavour));
  const flavour = flavours.includes(smak ?? '') ? smak! : flavours[0];
  const inFlavour = product.variants.filter((v) => v.flavour === flavour);
  const packNum = Number(pack);
  const exact = inFlavour.find((v) => v.pack === packNum);
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
  const [zoomOpen, setZoomOpen] = useState(false);
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
  const low30 = lowestPrice30Days(variant.priceHistory);
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
    if (flavourStatus(product, slug, variant.pack).state !== 'ok') return;
    const inF = product.variants.filter((v) => v.flavour === slug);
    const same = inF.find((v) => v.pack === variant.pack);
    if (same && isBuyable(same)) {
      setNotice(null);
      go(same);
      return;
    }
    const fallback = firstBuyable(inF);
    if (!fallback) return;
    const fName = getFlavour(slug)?.name ?? '';
    if (variant.pack && fallback.pack !== variant.pack) {
      const why = same && same.offered ? 'är slutsåld' : 'finns inte';
      setNotice(`${packLabel(variant.pack)} ${why} i smaken ${fName}. Vi har valt ${packLabel(fallback.pack)} åt dig.`);
    } else setNotice(null);
    go(fallback);
  };

  const selectPack = (p: number) => {
    const v = product.variants.find((x) => x.pack === p && x.flavour === variant.flavour);
    if (v && isBuyable(v)) {
      setNotice(null);
      go(v);
    }
  };

  const packStatus = (p: number) => {
    const v = product.variants.find((x) => x.pack === p && x.flavour === variant.flavour);
    if (!v || !v.offered) return { v, state: 'unavailable' as const, text: 'Finns inte i denna förpackning' };
    if (v.stock <= 0) return { v, state: 'soldout' as const, text: 'Slut i lager' };
    return { v, state: 'ok' as const, text: comparison(v) ?? '' };
  };

  /** Burkprodukter får förpackningskort med bild, som hos Apotea. */
  const canPacks = variant.image.startsWith('can:');
  const basePerUnit = (() => {
    const smallest = product.variants.find((x) => x.pack === packs[0] && x.flavour === variant.flavour);
    return smallest && packs[0] ? smallest.price / packs[0] : null;
  })();

  const st = stockState(variant);
  const sub = getSubcategory(product.subcategory);
  const warningTexts = [
    ...(product.kind === 'kosttillskott' ? [SUPPLEMENT_WARNING] : []),
    ...(product.warnings ?? []),
  ];
  const related = itemsForSlugs(product.related.length ? product.related : []);
  const pairs = itemsForSlugs(product.pairsWith);

  return (
    <div className="container page">
      <Breadcrumbs
        items={[
          ...(category ? [{ label: category.name, href: `/kategori/${category.slug}` }] : []),
          ...(sub ? [{ label: sub.name, href: `/kategori/${sub.slug}` }] : []),
          { label: title },
        ]}
      />

      <div className="pdp">
        <section className="pdp-gallery" aria-label="Produktbilder">
          <button
            type="button"
            className={`gallery-main tone-${category?.tone ?? 'lavender'} ${view === 'photo' ? 'gallery-main--photo' : ''}`}
            onClick={() => setZoomOpen(true)}
            aria-label="Förstora bilden"
            data-testid="img-product-main"
          >
            <ProductImage key={`${variant.id}-${view}`} product={product} variant={variant} view={view} />
            <span className="gallery-zoom-hint" aria-hidden="true">
              <Maximize2 size={16} /> Förstora
            </span>
          </button>
          <ImageLightbox
            open={zoomOpen}
            onClose={() => setZoomOpen(false)}
            product={product}
            variant={variant}
            views={views}
            view={view}
            onView={setView}
            title={title}
          />
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
                    const status = flavourStatus(product, f.slug, variant.pack);
                    const unavailable = status.state !== 'ok';
                    const statusId = `flavour-${f.slug}-meta`;
                    return (
                      <button
                        key={f.slug}
                        type="button"
                        className="option"
                        aria-pressed={variant.flavour === f.slug}
                        aria-disabled={unavailable}
                        aria-describedby={unavailable ? statusId : undefined}
                        data-state={status.state}
                        onClick={() => {
                          if (!unavailable) selectFlavour(f.slug);
                        }}
                        data-testid={`button-flavour-${f.slug}`}
                      >
                        <span className="swatch" style={{ background: `var(--flavour-${f.slug})` }} aria-hidden="true" />
                        <span className="option-name">{f.name}</span>
                        {unavailable && (
                          <span className="option-meta" id={statusId}>
                            {status.text}
                          </span>
                        )}
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
              <div className={canPacks ? 'pack-tiles' : 'options'}>
                {packs.map((p) => {
                  const s = packStatus(p);
                  const perUnit = s.v ? s.v.price / p : null;
                  const save = perUnit !== null && basePerUnit ? Math.floor((1 - perUnit / basePerUnit) * 100) : 0;
                  if (canPacks) {
                    return (
                      <button
                        key={p}
                        type="button"
                        className="option option-tile"
                        aria-pressed={variant.pack === p}
                        aria-disabled={s.state !== 'ok'}
                        data-state={s.state}
                        aria-describedby={`pack-${p}-meta`}
                        onClick={() => selectPack(p)}
                        data-testid={`button-pack-${p}`}
                      >
                        {s.state === 'ok' && save >= 1 && <span className="option-save">Spara {save} %</span>}
                        <span className="option-tile-media" aria-hidden="true">
                          <PwoPack flavour={variant.image.slice(4)} pack={p} />
                        </span>
                        <span className="option-name">{packLabel(p)}</span>
                        {s.state === 'ok' && s.v && <span className="option-tile-price">{kr(s.v.price)}</span>}
                        <span className="option-meta" id={`pack-${p}-meta`}>
                          {s.state === 'ok' && perUnit !== null ? `${kr(perUnit)}/burk` : s.text}
                        </span>
                      </button>
                    );
                  }
                  return (
                    <button
                      key={p}
                      type="button"
                      className="option option-pack"
                      aria-pressed={variant.pack === p}
                      aria-disabled={s.state !== 'ok'}
                      data-state={s.state}
                      aria-describedby={`pack-${p}-meta`}
                      onClick={() => selectPack(p)}
                      data-testid={`button-pack-${p}`}
                    >
                      <span className="option-name">{packLabel(p)}</span>
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
              <p className={`buy-price${low30 !== null ? ' price--sale' : ''}`} data-testid="text-product-price">
                {kr(variant.price)}
                {low30 !== null && <span className="price-was">{kr(low30)}</span>}
              </p>
              <div className="buy-meta">
                {low30 !== null && (
                  <p className="price-lowest" data-testid="text-lowest-30">
                    Lägsta pris senaste 30 dagarna: {kr(low30)}
                  </p>
                )}
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
                  ? `${stockText(variant)}. Välj en annan smak eller förpackning.`
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
                {!buyable
                  ? variant.offered
                    ? 'Slut i lager'
                    : 'Finns inte i denna förpackning'
                  : justAdded
                    ? 'Tillagd'
                    : 'Lägg i varukorgen'}
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

          {warningTexts.length > 0 && (
            <aside className="label-warning" aria-label="Viktig information" data-testid="text-product-warning">
              <AlertTriangle size={18} aria-hidden="true" />
              <div>
                {warningTexts.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
            </aside>
          )}

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
                <p>{highlightAllergens((variant.flavour && product.ingredientsByFlavour?.[variant.flavour]) || product.ingredients, product.allergens)}</p>
                <p className="small muted">
                  {product.allergens.length
                    ? 'Allergener är markerade med fetstil och understrykning.'
                    : product.allergenInfoKnown === false
                      ? 'Allergeninformation saknas i exempeldata. Kontrollera alltid förpackningen.'
                      : 'Innehåller inga av de 14 vanligaste allergenerna.'}
                </p>
                {product.nutrition && (
                  <table className="data-table">
                    <caption className="sr-only">Näringsvärde</caption>
                    <thead>
                      <tr>
                        <th scope="col">Näringsvärde</th>
                        <th scope="col">{product.nutrition.referenceLabel ?? 'per 100 ml'}</th>
                        {product.nutrition.servingLabel && <th scope="col">{product.nutrition.servingLabel}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {product.nutrition.rows.map((r) => (
                        <tr key={r.label}>
                          <th scope="row">{r.label}</th>
                          <td>{r.per100}</td>
                          {product.nutrition?.servingLabel && <td>{r.perServing ?? '—'}</td>}
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
            {variant.priceHistory && (
              <details className="details-item" data-testid="details-price-history">
                <summary>
                  Prishistorik <Plus size={20} aria-hidden="true" />
                </summary>
                <div className="details-body">
                  <PriceHistory key={variant.id} history={variant.priceHistory} />
                </div>
              </details>
            )}
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
