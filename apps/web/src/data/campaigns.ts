/**
 * Kampanjer: ett nedsatt pris som syns direkt i butiken (inte en rabatt i kassan).
 * Används av både butiken och servern. Servern räknar priserna, butiken visar banner och kampanjsida.
 *
 * Kampanjpriset läggs ovanpå det ordinarie priset i prishistoriken. Då räknas
 * "lägsta pris senaste 30 dagarna" automatiskt med samma regel som för andra prissänkningar.
 */

export type CampaignValueType = 'percent' | 'amount' | 'price';
export type CampaignPlacement = 'none' | 'home' | 'topbar' | 'both';

export interface CampaignAppliesTo {
  type: 'all' | 'categories' | 'brands' | 'products';
  categories: string[];
  brands: string[];
  products: string[];
}

/** En rad i en kampanj: en prissänkning för ett urval. value: procent (1–99) eller öre. */
export interface CampaignLine {
  id: string;
  valueType: CampaignValueType;
  value: number;
  appliesTo: CampaignAppliesTo;
}

/** Det som behövs för att räkna ut priset. Alla rader delar datum, banner och kampanjsida. */
export interface CampaignRule {
  id: string;
  slug: string;
  title: string;
  lines: CampaignLine[];
  /** Första dagen, "ÅÅÅÅ-MM-DD" (svensk tid). */
  startsOn: string;
  /** Sista dagen (gäller hela dagen), eller null = tills vidare. */
  endsOn: string | null;
  enabled: boolean;
}

/** Det butiken får veta om en kampanj som pågår (för banner och kampanjsida). */
export interface PublicCampaign {
  slug: string;
  title: string;
  intro: string;
  endsOn: string | null;
  banner: { text: string; placement: CampaignPlacement };
}

/** Vad en produkt är, för att se om en kampanj gäller den. */
export interface CampaignTarget {
  slug: string;
  brand: string;
  categories: string[];
}

export const CAMPAIGN_VALUE_LABELS: Record<CampaignValueType, string> = {
  percent: 'Procent',
  amount: 'Kronor av priset',
  price: 'Fast kampanjpris',
};

const nextDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export function campaignActiveOn(c: Pick<CampaignRule, 'enabled' | 'startsOn' | 'endsOn'>, date: string) {
  return c.enabled && c.startsOn <= date && (c.endsOn === null || c.endsOn >= date);
}

/** Aktiv, schemalagd, avslutad eller avstängd. */
export function campaignState(c: Pick<CampaignRule, 'enabled' | 'startsOn' | 'endsOn'>, date: string) {
  if (!c.enabled) return 'disabled' as const;
  if (c.endsOn !== null && c.endsOn < date) return 'expired' as const;
  if (c.startsOn > date) return 'scheduled' as const;
  return 'active' as const;
}

/** Hur specifik en rad är: produkt före varumärke före kategori före allt. */
export const SPECIFICITY: Record<CampaignAppliesTo['type'], number> = { products: 3, brands: 2, categories: 1, all: 0 };

export function lineMatches(l: Pick<CampaignLine, 'appliesTo'>, t: CampaignTarget) {
  const a = l.appliesTo;
  if (a.type === 'all') return true;
  if (a.type === 'products') return a.products.includes(t.slug);
  if (a.type === 'brands') return a.brands.includes(t.brand);
  return t.categories.some((cat) => a.categories.includes(cat));
}

/** Gäller kampanjen produkten (någon rad)? */
export function campaignMatches(c: Pick<CampaignRule, 'lines'>, t: CampaignTarget) {
  return c.lines.some((l) => lineMatches(l, t));
}

/**
 * Kampanjpriset i öre, eller null om raden inte sänker priset.
 * Procent avrundas till hela kronor, så att priset blir snyggt (t.ex. 279 kr i stället för 279,20 kr).
 */
export function campaignPrice(l: Pick<CampaignLine, 'valueType' | 'value'>, baseOre: number): number | null {
  let ore: number;
  if (l.valueType === 'percent') ore = Math.round((baseOre * (100 - l.value)) / 100 / 100) * 100;
  else if (l.valueType === 'amount') ore = baseOre - l.value;
  else ore = l.value;
  ore = Math.max(0, ore);
  return ore < baseOre ? ore : null;
}

/**
 * Raden som gäller en produkt i en kampanj: den mest specifika (produkt före varumärke före kategori).
 * Aldrig dubbel rabatt. Matchar flera rader på samma nivå gäller den som ger lägst pris.
 */
export function lineFor<L extends CampaignLine>(lines: L[], t: CampaignTarget, baseOre: number): { line: L; ore: number | null } | null {
  const hits = lines.filter((l) => lineMatches(l, t));
  if (!hits.length) return null;
  const top = Math.max(...hits.map((l) => SPECIFICITY[l.appliesTo.type]));
  let best: { line: L; ore: number | null } | null = null;
  for (const line of hits.filter((l) => SPECIFICITY[l.appliesTo.type] === top)) {
    const ore = campaignPrice(line, baseOre);
    if (best === null || (ore !== null && (best.ore === null || ore < best.ore))) best = { line, ore };
  }
  return best;
}

/**
 * Det bästa kampanjpriset en viss dag. Pågår flera kampanjer för samma produkt
 * gäller det lägsta priset (Admin varnar för sådana krockar).
 */
export function bestCampaign<C extends CampaignRule>(list: C[], t: CampaignTarget, baseOre: number, date: string): { campaign: C; line: CampaignLine; ore: number } | null {
  let best: { campaign: C; line: CampaignLine; ore: number } | null = null;
  for (const c of list) {
    if (!campaignActiveOn(c, date)) continue;
    const hit = lineFor(c.lines, t, baseOre);
    if (hit?.ore != null && (best === null || hit.ore < best.ore)) best = { campaign: c, line: hit.line, ore: hit.ore };
  }
  return best;
}

/** Krockar två kampanjers perioder (minst en dag gemensam)? */
export function periodsOverlap(a: Pick<CampaignRule, 'startsOn' | 'endsOn'>, b: Pick<CampaignRule, 'startsOn' | 'endsOn'>) {
  return (a.endsOn === null || a.endsOn >= b.startsOn) && (b.endsOn === null || b.endsOn >= a.startsOn);
}

/**
 * Lägger kampanjerna ovanpå den ordinarie prishistoriken (öre, äldst först, varje rad gäller tills nästa börjar).
 * Bara datum till och med `date` tas med.
 */
export function withCampaigns(base: { from: string; ore: number }[], list: CampaignRule[], t: CampaignTarget, date: string) {
  const own = list.filter((c) => c.enabled && campaignMatches(c, t));
  if (!own.length) return base.filter((p) => p.from <= date);
  const days = new Set(base.map((p) => p.from));
  for (const c of own) {
    days.add(c.startsOn);
    if (c.endsOn) days.add(nextDay(c.endsOn));
  }
  const out: { from: string; ore: number }[] = [];
  for (const day of [...days].sort()) {
    if (day > date) break;
    let baseOre: number | undefined;
    for (const p of base) if (p.from <= day) baseOre = p.ore;
    if (baseOre === undefined) continue;
    const ore = bestCampaign(own, t, baseOre, day)?.ore ?? baseOre;
    if (out.at(-1)?.ore !== ore) out.push({ from: day, ore });
  }
  return out;
}

// ---------------------------------------------------------------- Butiken

let active: PublicCampaign[] = [];

/** Kampanjer som pågår just nu. Inbäddade i sidan av servern (#campaign-data). */
export function replaceCampaigns(list: PublicCampaign[]) {
  active = list;
}
export const activeCampaigns = () => active;
export const getCampaign = (slug: string) => active.find((c) => c.slug === slug);
export const campaignHref = (slug: string) => `/kampanj/${slug}`;
