import { Link } from 'wouter';
import { ArrowRight, MessageCircle, RotateCcw, Truck, Zap } from 'lucide-react';
import { usePageMeta } from '@/hooks/use-page-meta';
import { filledCategories, productsIn } from '@/data/taxonomy';
import { ProductImage } from '@/components/art/ProductImage';
import { pwoFlavours, PWO_RECIPE } from '@/data/products';
import { lowestPrice30Days } from '@/lib/price-history';
import { PwoCan } from '@/components/art/PwoCan';
import { ProductRail } from '@/components/ProductRail';
import { allItems, sortItems } from '@/lib/catalog';
import { useSettings } from '@/state/settings';

const nf = new Intl.NumberFormat('sv-SE');
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const EMPTY = { packs: [], flavours: [], prices: [] };

export default function Home() {
  const { policies } = useSettings();
  usePageMeta(
    'SELFIT – Träning, hälsa och kroppsvård',
    `Handla träning, hälsa och kroppsvård hos SELFIT. Tydliga priser, fri frakt över 499 kr och leverans inom ${policies.dispatchDays}. Prova PWO+, vår egen pre-workout.`,
  );

  const items = sortItems(allItems(), 'popularitet', EMPTY);
  const onSale = items.filter((i) => i.variants.some((v) => lowestPrice30Days(v.priceHistory) !== null)).slice(0, 10);
  const newest = items.filter((i) => i.product.isNew).slice(0, 10);
  const popular = items.slice(0, 10);
  const cats = filledCategories();

  return (
    <>
      <section className="hero-banner" aria-labelledby="hero-title">
        <img
          className="hero-banner-img"
          src={`${base}/images/hero.webp`}
          srcSet={`${base}/images/hero-480.webp 480w, ${base}/images/hero-720.webp 720w, ${base}/images/hero.webp 900w`}
          sizes="100vw"
          width={900}
          height={900}
          alt=""
          fetchPriority="high"
        />
        <div className="container hero-banner-content">
          <span className="hero-tag">Nyhet · PWO+</span>
          <h1 id="hero-title" className="hero-banner-title">
            Må bra.
            <br />
            Utan krångel.
          </h1>
          <p className="hero-banner-lead">Träning, hälsa och kroppsvård med tydliga priser. Nu med vår egen pre-workout.</p>
          <div className="hero-actions">
            <Link href="/kollektion/pwo-plus" className="btn btn--on-dark" data-testid="link-hero-pwo">
              Upptäck PWO+
            </Link>
            <Link href="/kategori/kosttillskott" className="btn btn--outline-light" data-testid="link-hero-shop">
              Handla kosttillskott
            </Link>
          </div>
        </div>
      </section>

      <nav className="quick-links" aria-label="Populära kategorier">
        <ul className="container">
          <li>
            <Link href="/kollektion/kampanjer">Kampanjer</Link>
          </li>
          {cats.map((c) => (
            <li key={c.slug}>
              <Link href={`/kategori/${c.slug}`}>{c.name}</Link>
            </li>
          ))}
          <li>
            <Link href="/kollektion/bastsaljare">Bästsäljare</Link>
          </li>
        </ul>
      </nav>

      <ProductRail id="sale-title" title="Kampanjer just nu" items={onSale} moreHref="/kollektion/kampanjer" moreLabel="Se alla kampanjer" />

      <section className="section" aria-labelledby="cat-title">
        <div className="container">
          <div className="rail-head">
            <h2 id="cat-title" className="h2">
              Handla efter kategori
            </h2>
          </div>
          <div className="cat-cards">
            {cats.map((c) => {
              const top = productsIn(c.slug).sort((a, b) => b.popularity - a.popularity)[0];
              return (
                <Link key={c.slug} href={`/kategori/${c.slug}`} className="cat-card" data-testid={`link-category-${c.slug}`}>
                  {c.image ? (
                    <img src={`${base}${c.image}`} alt="" loading="lazy" width={640} height={640} />
                  ) : (
                    <span className="cat-card-product" aria-hidden="true">
                      <ProductImage product={top} variant={top.variants.find((v) => v.offered) ?? top.variants[0]} />
                    </span>
                  )}
                  <span className="cat-card-body">
                    <span className="cat-card-name">{c.name}</span>
                    <span className="btn btn--on-dark btn--sm">Köp nu</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <ProductRail id="popular-title" title="Populärt just nu" items={popular} moreHref="/kollektion/bastsaljare" moreLabel="Se bästsäljare" />

      <section className="section--tight" aria-labelledby="pwo-title">
        <div className="container">
          <div className="pwo-band">
            <div className="stack-5">
              <span className="hero-tag">Vårt första egna</span>
              <h2 id="pwo-title" className="pwo-band-title">
                PWO+. Pre-workout du bara öppnar.
              </h2>
              <p className="pwo-band-lead">
                Färdig att dricka med {PWO_RECIPE.caffeineMg} mg koffein, citrullin och beta-alanin i varje 330 ml-burk. Sockerfri och lätt kolsyrad.
              </p>
              <ul className="pwo-facts" aria-label="Innehåll per burk">
                <li>{PWO_RECIPE.caffeineMg} mg koffein</li>
                <li>{nf.format(PWO_RECIPE.citrullineMg)} mg citrullin</li>
                <li>{nf.format(PWO_RECIPE.betaAlanineMg)} mg beta-alanin</li>
                <li>Sockerfri</li>
              </ul>
              <Link href="/kollektion/pwo-plus" className="btn btn--on-dark" data-testid="link-pwo-collection">
                Se alla smaker <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <ul className="can-row" aria-label="Välj smak">
              {pwoFlavours.map((f) => (
                <li key={f.slug}>
                  <Link href={`/produkt/pwo-plus?smak=${f.slug}`} data-testid={`link-flavour-${f.slug}`}>
                    <PwoCan flavour={f.slug} label="" />
                    <span>{f.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {newest.length > 0 && <ProductRail id="new-title" title="Nyheter" items={newest} moreHref="/kollektion/nyheter" moreLabel="Se alla nyheter" />}

      <section className="service-strip" aria-label="Därför handlar du hos SELFIT">
        <ul className="container">
          <li>
            <Truck size={26} aria-hidden="true" />
            <strong>Fri frakt</strong>
            <span>När du handlar för 499 kr eller mer</span>
          </li>
          <li>
            <Zap size={26} aria-hidden="true" />
            <strong>Snabb leverans</strong>
            <span>Beställ före 14, skickas inom {policies.dispatchDays}</span>
          </li>
          <li>
            <RotateCcw size={26} aria-hidden="true" />
            <strong>{policies.openPurchaseDays} dagars öppet köp</strong>
            <span>På oöppnade varor</span>
          </li>
          <li>
            <MessageCircle size={26} aria-hidden="true" />
            <strong>Kundtjänst som svarar</strong>
            <span>
              <Link href="/support">Till kundservice</Link>
            </span>
          </li>
        </ul>
      </section>
    </>
  );
}
