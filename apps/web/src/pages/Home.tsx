import { kr } from '@/lib/format';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/cart-math';
import { Fragment } from 'react';
import { Link } from 'wouter';
import { ArrowRight, ChevronRight, Gift, Heart, MessageCircle, RotateCcw, ShieldCheck, Star, Truck, Zap, type LucideIcon } from 'lucide-react';
import { usePageMeta } from '@/hooks/use-page-meta';
import { filledCategories, productsIn } from '@/data/taxonomy';
import { ProductImage } from '@/components/art/ProductImage';
import { pwoFlavours, PWO_RECIPE } from '@/data/products';
import { PwoCan } from '@/components/art/PwoCan';
import { ProductRail } from '@/components/ProductRail';
import { RichText } from '@/components/RichText';
import type { ServiceIcon } from '@/data/homeDefaults';
import { fillFields } from '@/data/support';
import { itemsForSource } from '@/lib/homeContent';
import { useSettings } from '@/state/settings';

const nf = new Intl.NumberFormat('sv-SE');
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const ICONS: Record<ServiceIcon, LucideIcon> = { truck: Truck, zap: Zap, rotate: RotateCcw, chat: MessageCircle, shield: ShieldCheck, gift: Gift, heart: Heart, star: Star };

/** Bilder i public/images har färdiga mindre versioner för mobilen. */
const heroSrcSet = (src: string) =>
  src === '/images/hero.webp' ? `${base}/images/hero-480.webp 480w, ${base}/images/hero-720.webp 720w, ${base}/images/hero.webp 900w` : undefined;
const withBase = (src: string) => (src.startsWith('/') ? `${base}${src}` : src);

export default function Home() {
  const settings = useSettings();
  const { policies, home } = settings;
  const f = (t: string) => fillFields(t, settings);
  usePageMeta(
    'SELFIT – Träning, hälsa och kroppsvård',
    `Handla träning, hälsa och kroppsvård hos SELFIT. Tydliga priser, fri frakt över ${kr(FREE_SHIPPING_THRESHOLD)} och leverans inom ${policies.dispatchDays}. Prova PWO+, vår egen pre-workout.`,
  );
  const cats = filledCategories();
  const { hero } = home;

  const section = (s: (typeof home.sections)[number], i: number) => {
    if (s.kind === 'row') {
      const row = home.rows.find((r) => r.id === s.id);
      if (!row || !row.visible) return null;
      return (
        <ProductRail
          key={`row-${row.id}`}
          id={`row-${row.id}-title`}
          title={f(row.title)}
          items={itemsForSource(row.source, row.limit)}
          moreHref={row.moreHref || undefined}
          moreLabel={row.moreLabel || 'Se alla'}
        />
      );
    }
    if (s.kind === 'categories') {
      return (
        <section className="section" aria-labelledby="cat-title" key={`cats-${i}`}>
          <div className="container">
            <div className="rail-head">
              <h2 id="cat-title" className="h2">
                {f(home.categoriesTitle) || 'Kategorier'}
              </h2>
            </div>
            <div className="cat-cards">
              {cats.map((c) => {
                const top = productsIn(c.slug).sort((a, b) => b.popularity - a.popularity)[0];
                return (
                  <Link key={c.slug} href={`/kategori/${c.slug}`} className="cat-card" data-testid={`link-category-${c.slug}`}>
                    <span className="cat-card-media">
                      {c.image ? (
                        <img src={`${base}${c.image}`} alt="" loading="lazy" width={640} height={640} />
                      ) : (
                        <span className="cat-card-product" aria-hidden="true">
                          <ProductImage product={top} variant={top.variants.find((v) => v.offered) ?? top.variants[0]} />
                        </span>
                      )}
                    </span>
                    <span className="cat-card-name">
                      {c.name} <ChevronRight size={16} aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      );
    }
    if (s.kind === 'pwo') {
      return (
        <section className="section--tight" aria-labelledby="pwo-title" key={`pwo-${i}`}>
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
                {pwoFlavours.map((fl) => (
                  <li key={fl.slug}>
                    <Link href={`/produkt/pwo-plus?smak=${fl.slug}`} data-testid={`link-flavour-${fl.slug}`}>
                      <PwoCan flavour={fl.slug} label="" />
                      <span>{fl.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      );
    }
    if (s.kind === 'tiles' && home.tiles.length) {
      return (
        <section className="section" aria-label="Utvalt" key={`tiles-${i}`}>
          <div className={`container promo-tiles promo-tiles--${Math.min(home.tiles.length, 4)}`}>
            {home.tiles.map((t, j) => (
              <Link key={j} href={t.href || '/'} className="promo-tile" data-testid={`link-promo-${j}`}>
                <img src={withBase(t.image)} alt="" loading="lazy" width={640} height={800} />
                <span className="promo-tile-body">
                  {t.title && <span className="promo-tile-title">{f(t.title)}</span>}
                  {t.buttonLabel && <span className="btn btn--on-dark btn--sm">{f(t.buttonLabel)}</span>}
                </span>
              </Link>
            ))}
          </div>
        </section>
      );
    }
    if (s.kind === 'instagram' && home.instagram.images.length) {
      const ig = home.instagram;
      const external = (href: string) => /^https?:/.test(href);
      // Listan dubbleras så att remsan kan glida runt utan glapp.
      const loop = [...ig.images, ...ig.images];
      return (
        <section className="ig-strip" aria-label={`Instagram ${ig.handle}`} key={`ig-${i}`}>
          <div className="ig-track">
            <ul className="ig-list">
              {loop.map((img, j) => {
                const href = img.href || ig.url;
                return (
                  <li key={j} aria-hidden={j >= ig.images.length ? true : undefined}>
                    <a href={href} target={external(href) ? '_blank' : undefined} rel={external(href) ? 'noopener' : undefined} tabIndex={j >= ig.images.length ? -1 : undefined}>
                      <img src={withBase(img.src)} alt={`Bild från Instagram ${ig.handle}`} loading="lazy" width={320} height={480} />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
          {ig.handle && (
            <a className="ig-handle" href={ig.url} target={external(ig.url) ? '_blank' : undefined} rel={external(ig.url) ? 'noopener' : undefined} data-testid="link-instagram">
              {ig.handle}
            </a>
          )}
        </section>
      );
    }
    if (s.kind === 'services' && home.services.length) {
      return (
        <section className="service-strip" aria-label="Därför handlar du hos SELFIT" key={`services-${i}`}>
          <ul className="container">
            {home.services.map((sv, j) => {
              const Icon = ICONS[sv.icon] ?? Star;
              return (
                <li key={j}>
                  <Icon size={26} aria-hidden="true" />
                  <strong>{f(sv.title)}</strong>
                  <span>
                    <RichText text={f(sv.text)} />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      );
    }
    return null;
  };

  return (
    <>
      <section className="hero-banner" aria-labelledby="hero-title">
        <img
          className="hero-banner-img"
          src={withBase(hero.image)}
          srcSet={heroSrcSet(hero.image)}
          sizes="100vw"
          width={900}
          height={900}
          alt=""
          fetchPriority="high"
        />
        <div className="container hero-banner-content">
          {hero.tag && <span className="hero-tag">{f(hero.tag)}</span>}
          <h1 id="hero-title" className="hero-banner-title">
            {f(hero.title)
              .split('\n')
              .map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
          </h1>
          {hero.lead && <p className="hero-banner-lead">{f(hero.lead)}</p>}
          <div className="hero-actions">
            {hero.primary.label && (
              <Link href={hero.primary.href || '/'} className="btn btn--on-dark" data-testid="link-hero-pwo">
                {f(hero.primary.label)}
              </Link>
            )}
            {hero.secondary.label && (
              <Link href={hero.secondary.href || '/'} className="btn btn--outline-light" data-testid="link-hero-shop">
                {f(hero.secondary.label)}
              </Link>
            )}
          </div>
        </div>
      </section>

      {home.quickLinks.length > 0 && (
        <nav className="quick-links" aria-label="Populära kategorier">
          <ul className="container">
            {home.quickLinks.map((l, i) => (
              <li key={i}>
                <Link href={l.href || '/'}>{f(l.label)}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {home.sections.map(section)}
    </>
  );
}
