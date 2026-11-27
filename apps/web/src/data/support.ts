/**
 * Gör om sidornas texter (pageTemplates.ts eller ändrade i Admin) till färdiga sidor:
 * fälten {e-post}, {öppet köp} … fylls i med butikens aktuella uppgifter.
 */
import { normalizeShipping } from './shipping';
import { defaultPages, type Faq, type PageContent } from './pageTemplates';
import { defaultSettings, isPlaceholder, type SiteSettings } from './siteDefaults';

export type { Faq, PageContent };

export interface SupportSection {
  heading: string;
  body: string;
}
export interface SupportPage {
  slug: string;
  title: string;
  summary: string;
  sections: SupportSection[];
  faq?: Faq[];
}

const kr = (n: number) => `${n} kr`;

/** Fält som kan användas i texterna. Visas som knappar i Admin. */
export const TEXT_FIELDS: { token: string; label: string; group: 'Företag' | 'Villkor' | 'Frakt' }[] = [
  { token: 'varumärke', label: 'Varumärke', group: 'Företag' },
  { token: 'bolagsnamn', label: 'Bolagsnamn', group: 'Företag' },
  { token: 'org.nr', label: 'Organisationsnummer', group: 'Företag' },
  { token: 'momsnummer', label: 'Momsnummer', group: 'Företag' },
  { token: 'adress', label: 'Adress', group: 'Företag' },
  { token: 'e-post', label: 'E-post (klickbar)', group: 'Företag' },
  { token: 'telefon', label: 'Telefon (klickbar)', group: 'Företag' },
  { token: 'öppettider', label: 'Öppettider', group: 'Företag' },
  { token: 'e-posttjänst', label: 'E-posttjänst', group: 'Företag' },
  { token: 'öppet köp', label: 'Öppet köp (dagar)', group: 'Villkor' },
  { token: 'returavgift', label: 'Returavgift', group: 'Villkor' },
  { token: 'outhämtat paket', label: 'Avgift outhämtat paket', group: 'Villkor' },
  { token: 'leveranstid', label: 'Leveranstid', group: 'Villkor' },
  { token: 'beställ före', label: 'Beställ före (klockslag)', group: 'Villkor' },
  { token: 'åldersgräns', label: 'Åldersgräns', group: 'Villkor' },
  { token: 'villkorsdatum', label: 'Villkoren senast ändrade', group: 'Villkor' },
  { token: 'fri frakt', label: 'Fri frakt från', group: 'Frakt' },
  { token: 'frakt ombud', label: 'Frakt till ombud', group: 'Frakt' },
  { token: 'frakt hem', label: 'Hemleverans', group: 'Frakt' },
];

function fieldValues(settings: SiteSettings): Record<string, string> {
  const c = settings.company;
  const p = settings.policies;
  const sh = normalizeShipping(settings.shipping);
  return {
    varumärke: c.brand,
    bolagsnamn: c.legalName,
    'org.nr': c.orgNr,
    momsnummer: c.vatNr,
    adress: c.address,
    'e-post': isPlaceholder(c.email) ? c.email : `[${c.email}](mailto:${c.email})`,
    telefon: isPlaceholder(c.phone) ? c.phone : `[${c.phone}](tel:${c.phone.replace(/[^+\d]/g, '')})`,
    öppettider: c.hours,
    'e-posttjänst': c.emailProvider,
    'öppet köp': String(p.openPurchaseDays),
    returavgift: kr(p.returnFee),
    'outhämtat paket': kr(p.uncollectedFee),
    leveranstid: p.dispatchDays,
    'beställ före': p.orderCutoff,
    åldersgräns: String(p.ageLimit),
    villkorsdatum: p.termsUpdated,
    'fri frakt': kr(sh.freeFrom),
    'frakt ombud': kr(sh.methods.ombud.price),
    'frakt hem': kr(sh.methods.hem.price),
  };
}

/** Ersätter {fält} i en text. Okända fält lämnas orörda så att felet syns. */
export function fillFields(text: string, settings: SiteSettings): string {
  const values = fieldValues(settings);
  return text.replace(/\{([^{}]+)\}/g, (all, name: string) => values[name.trim().toLowerCase()] ?? all);
}

export function renderPage(page: PageContent, settings: SiteSettings): SupportPage {
  const f = (t: string) => fillFields(t, settings);
  return {
    slug: page.slug,
    title: f(page.title),
    summary: f(page.summary),
    sections: page.sections.map((s) => ({ heading: f(s.heading), body: f(s.body) })),
    ...(page.faq ? { faq: page.faq.map((q) => ({ ...q, q: f(q.q), a: f(q.a) })) } : {}),
  };
}

/** Lägger ändrade sidor från databasen över standardtexterna och fyller i fälten. */
export function buildSupportPages(settings: SiteSettings, saved: PageContent[] = []): SupportPage[] {
  const bySlug = new Map(saved.map((p) => [p.slug, p]));
  return defaultPages.map((d) => renderPage(bySlug.get(d.slug) ?? d, settings));
}

/** Delar upp en text i stycken och punktlistor (tom rad = nytt stycke, "- " = punkt). */
export type TextBlock = { type: 'p'; text: string } | { type: 'ul'; items: string[] };
export function parseBody(body: string): TextBlock[] {
  return body
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .flatMap((chunk): TextBlock[] => {
      const lines = chunk.split('\n').map((l) => l.trim());
      if (lines.every((l) => /^[-•*]\s+/.test(l))) return [{ type: 'ul', items: lines.map((l) => l.replace(/^[-•*]\s+/, '')) }];
      return [{ type: 'p', text: lines.join(' ') }];
    });
}

/** Sidorna med standardvärden – för listor och sidtitlar. */
export const supportPages = buildSupportPages(defaultSettings);
export const getSupportPage = (slug?: string) => supportPages.find((p) => p.slug === slug);
