import { Link } from 'wouter';
import { ArrowRight, Truck, Clock, ShieldCheck, MessageCircle, PackageSearch, RotateCcw, HelpCircle } from 'lucide-react';
import { usePageMeta } from '@/hooks/use-page-meta';
import { categories, subcategoriesOf } from '@/data/categories';
import { products, pwoFlavours } from '@/data/products';
import { comparison, kr } from '@/lib/format';
import { lowestPrice30Days } from '@/lib/price-history';
import { PwoCan } from '@/components/art/PwoCan';
import { ProductCard } from '@/components/ProductCard';
import { allItems, sortItems } from '@/lib/catalog';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
/** Bildbredd i layouten: hela bredden på mobil, en kolumn på dator. Samma värde används i serverns förladdning. */
const HERO_SIZES = '(min-width: 1024px) 440px, (min-width: 900px) 45vw, 92vw';
const EMPTY = { packs: [], flavours: [], prices: [] };

export default function Home() {
  usePageMeta(
    'SELFIT – Träning, hälsa och kroppsvård',
    'Handla träning, hälsa och kroppsvård hos SELFIT. Tydliga priser, fri frakt över 499 kr och leverans inom 1–2 vardagar. Prova PWO+, vår egen pre-workout.',
  );

  const items = sortItems(allItems(), 'popularitet', EMPTY);
  const onSale = items.filter((i) => i.variants.some((v) => lowestPrice30Days(v.priceHistory) !== null)).slice(0, 4);
  const featured = [
    ...items.filter((i) => i.product.slug === 'pwo-plus').slice(0, 2),
    ...items.filter((i) => i.product.slug === 'protein-pannkakor').slice(0, 2),
    ...items.filter((i) => !['pwo-plus', 'protein-pannkakor'].includes(i.product.slug)).slice(0, 4),
  ];
  // Produkten i bildens pratbubbla: pris och jämförpris hämtas från datan.
  const badgeVariant = products.find((p) => p.slug === 'pwo-plus')?.variants.find((v) => v.id === 'pwo-plus-blueberry-12');
  const badgeCmp = badgeVariant ? comparison(badgeVariant) : null;

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero-grid">
          <div className="stack-5">
            <p className="eyebrow">Svensk webbutik för träning och hälsa</p>
            <h1 id="hero-title" className="hero-title">
              Må bra, <em>utan krångel.</em>
            </h1>
            <p className="lead">
              Vitaminer, hudvård och träningsprodukter med tydliga innehållsförteckningar, ärliga jämförpriser och
              svar från riktiga människor. Nu också med vår egen pre-workout.
            </p>
            <div className="hero-actions">
              <Link href="/produkt/pwo-plus?smak=blueberry&pack=6" className="btn btn--primary" data-testid="link-hero-pwo">
                Upptäck PWO+ <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/kategori/halsa" className="btn btn--secondary" data-testid="link-hero-shop">
                Handla hälsa
              </Link>
            </div>
          </div>
          <div className="hero-media">
            <img
              src={`${base}/images/hero.webp`}
              srcSet={`${base}/images/hero-480.webp 480w, ${base}/images/hero-720.webp 720w, ${base}/images/hero.webp 900w`}
              sizes={HERO_SIZES}
              width={900}
              height={900}
              alt="En löpare i lavendelfärgade träningskläder vilar på en solig kaj i Stockholm med en burk PWO+ i handen"
              fetchPriority="high"
            />
            <Link href="/produkt/pwo-plus?smak=blueberry&pack=12" className="hero-badge" data-testid="link-hero-badge">
              <PwoCan flavour="blueberry" label="PWO+ Blåbär" />
              <span className="small">
                <strong>PWO+ Blåbär, 12-pack</strong>
                <br />
                <span className="muted">
                  {badgeVariant ? kr(badgeVariant.price) : ''}
                  {badgeCmp ? ` · Jämförpris ${badgeCmp}` : ''}
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <div className="section--surface">
        <ul className="container trust-strip" aria-label="Därför handlar du hos SELFIT">
          <li>
            <span className="trust-icon" aria-hidden="true">
              <Truck size={18} />
            </span>
            <span>
              <strong>Fri frakt över 499 kr</strong>
              <span className="muted">Till ombud i hela Sverige</span>
            </span>
          </li>
          <li>
            <span className="trust-icon" aria-hidden="true">
              <Clock size={18} />
            </span>
            <span>
              <strong>Skickas inom 1–2 vardagar</strong>
              <span className="muted">Beställ före 14 för snabbast leverans</span>
            </span>
          </li>
          <li>
            <span className="trust-icon" aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <span>
              <strong>30 dagars öppet köp</strong>
              <span className="muted">På oöppnade varor</span>
            </span>
          </li>
          <li>
            <span className="trust-icon" aria-hidden="true">
              <MessageCircle size={18} />
            </span>
            <span>
              <strong>Kundtjänst som svarar</strong>
              <span className="muted">Vardagar 08–17</span>
            </span>
          </li>
        </ul>
      </div>

      {onSale.length > 0 && (
        <section className="section--tight" aria-labelledby="sale-title">
          <div className="container">
            <div className="section-head">
              <div className="stack-2">
                <p className="eyebrow">Sänkt pris</p>
                <h2 id="sale-title" className="h2">
                  Kampanjer just nu
                </h2>
              </div>
              <Link href="/kollektion/kampanjer" className="arrow-link">
                Alla kampanjer <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <ul className="product-grid product-grid--4">
              {onSale.map((item, i) => (
                <li key={item.key}>
                  <ProductCard item={item} index={i} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="cat-title">
        <div className="container">
          <div className="section-head">
            <div className="stack-2">
              <p className="eyebrow">Sortiment</p>
              <h2 id="cat-title" className="h2">
                Tre områden. Ett ställe.
              </h2>
            </div>
          </div>
          <div className="cat-tiles">
            {categories.map((c) => (
              <Link key={c.slug} href={`/kategori/${c.slug}`} className={`cat-tile tone-${c.tone}`} data-testid={`link-category-${c.slug}`}>
                <img src={`${base}${c.image}`} alt="" loading="lazy" />
                <div className="cat-tile-body">
                  <h3>{c.name}</h3>
                  <p>{c.short}</p>
                  <span className="arrow-link">
                    Visa sortimentet <ArrowRight size={18} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="cat-quicklinks">
            {categories.map((c) => (
              <div key={c.slug} className="cat-quicklinks-group">
                <h3 className="sr-only">{c.name}</h3>
                <ul aria-label={`Underkategorier i ${c.name}`}>
                  {subcategoriesOf(c.slug)
                    .filter((sc) => products.some((p) => p.subcategory === sc.slug))
                    .map((sc) => (
                      <li key={sc.slug}>
                        <Link href={`/kategori/${sc.slug}`} className="chip">
                          {sc.name}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section--tight" aria-labelledby="pwo-title">
        <div className="container">
          <div className="pwo-band">
            <div className="stack-5">
              <p className="eyebrow">Vårt första egna</p>
              <h2 id="pwo-title" className="h2">
                PWO+. Pre-workout du bara öppnar.
              </h2>
              <p className="lead">
                Färdig att dricka, med 3 500 mg beta-alanin, 3 000 mg AAKG och 300 mg koffein i varje 330 ml-burk.
                Sex smaker, från 66 kr/l.
              </p>
              <ul className="pwo-facts" aria-label="Innehåll per burk">
                <li>300 mg koffein</li>
                <li>3 500 mg beta-alanin</li>
                <li>3 000 mg AAKG</li>
                <li>330 ml per burk</li>
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

      <section className="section" aria-labelledby="featured-title">
        <div className="container">
          <div className="section-head">
            <div className="stack-2">
              <p className="eyebrow">Populärt just nu</p>
              <h2 id="featured-title" className="h2">
                Det andra lägger i korgen
              </h2>
            </div>
            <Link href="/kollektion/bastsaljare" className="arrow-link">
              Alla bästsäljare <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <ul className="product-grid product-grid--4">
            {featured.map((item, i) => (
              <li key={item.key}>
                <ProductCard item={item} index={i} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--surface" aria-labelledby="how-title">
        <div className="container">
          <div className="section-head">
            <div className="stack-2">
              <p className="eyebrow">Så väljer vi</p>
              <h2 id="how-title" className="h2">
                Färre produkter. Bättre förklarade.
              </h2>
            </div>
          </div>
          <ol className="steps">
            <li>
              <h3 className="h3">Vi läser innehållsförteckningen först</h3>
              <p className="muted">
                Allergener markeras tydligt och doseringar anges per portion, inte bara per 100 gram.
              </p>
            </li>
            <li>
              <h3 className="h3">Jämförpris på allt</h3>
              <p className="muted">
                Kronor per liter, kilo eller styck står bredvid varje pris. Pant visas alltid separat.
              </p>
            </li>
            <li>
              <h3 className="h3">Ingen överförsäljning</h3>
              <p className="muted">
                Tar du läkemedel eller är osäker – vi hänvisar hellre till läkare eller farmaceut än säljer en burk till.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="help-title">
        <div className="container">
          <h2 id="help-title" className="h2" style={{ marginBottom: 'var(--space-6)' }}>
            Hjälp när du behöver den
          </h2>
          <div className="help-grid">
            <Link href="/support" className="help-card tone-lavender" data-testid="link-help-support">
              <HelpCircle size={24} aria-hidden="true" />
              <h3 className="h3">Kundservice</h3>
              <p className="muted">Frakt, betalning, pant och allt om PWO+. Svar på det vanligaste direkt.</p>
              <span className="arrow-link">
                Till kundservice <ArrowRight size={18} aria-hidden="true" />
              </span>
            </Link>
            <Link href="/ordersparning" className="help-card" data-testid="link-help-tracking">
              <PackageSearch size={24} aria-hidden="true" />
              <h3 className="h3">Spåra order</h3>
              <p className="muted small">Se var ditt paket är med ordernumret.</p>
            </Link>
            <Link href="/retur" className="help-card" data-testid="link-help-return">
              <RotateCcw size={24} aria-hidden="true" />
              <h3 className="h3">Returnera</h3>
              <p className="muted small">Anmäl en retur och få en returetikett.</p>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
