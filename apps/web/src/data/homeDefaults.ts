/**
 * Startsidan, toppraden och menyn – standardvärden.
 * Ändras i Admin → Innehåll → Startsida / Topprad och meny och sparas i databasen.
 * Texterna kan innehålla fält som {leveranstid} och {öppet köp}, precis som Sidor.
 */

export interface LinkItem {
  label: string;
  href: string;
}

/** Varifrån en produktrad hämtar sina produkter. */
export type RowSource = 'sale' | 'popular' | 'new' | `category:${string}` | `collection:${string}`;

export interface ProductRow {
  id: string;
  title: string;
  source: RowSource;
  /** Hur många produkter som visas (4–20). */
  limit: number;
  moreLabel: string;
  moreHref: string;
  visible: boolean;
}

export type ServiceIcon = 'truck' | 'zap' | 'rotate' | 'chat' | 'shield' | 'gift' | 'heart' | 'star';

export interface ServiceItem {
  icon: ServiceIcon;
  title: string;
  text: string;
}

export interface HomeSettings {
  hero: {
    tag: string;
    /** Radbrytning med Enter. */
    title: string;
    lead: string;
    /** Bildens adress, t.ex. /images/hero.webp eller en uppladdad bild. */
    image: string;
    primary: LinkItem;
    /** Tom etikett = ingen andra knapp. */
    secondary: LinkItem;
  };
  quickLinks: LinkItem[];
  /** Kampanjer, kategorier, PWO+ m.m. Ordningen här är ordningen på sidan. */
  sections: HomeSection[];
  rows: ProductRow[];
  categoriesTitle: string;
  services: ServiceItem[];
  instagram: InstagramSettings;
  tiles: TileItem[];
}

/** Stora bildrutor med rubrik och knapp, t.ex. "Kläder herr" / "Kläder dam" / "Tillbehör". */
export interface TileItem {
  image: string;
  title: string;
  /** Tom = ingen knapp, bara bilden och rubriken. */
  buttonLabel: string;
  href: string;
}

/** Bilder från Instagram som visas i en remsa längst ner. Väljs för hand i Admin. */
export interface InstagramSettings {
  /** T.ex. @selfit – visas i bubblan i mitten. */
  handle: string;
  /** Länk till profilen. */
  url: string;
  /** Varje bild kan länka till sitt inlägg. Tom länk = profilen. */
  images: { src: string; href: string }[];
}

/** Blocken under bilden och snabblänkarna, i den ordning de visas. */
export type HomeSection = { kind: 'row'; id: string } | { kind: 'categories' } | { kind: 'pwo' } | { kind: 'services' } | { kind: 'instagram' } | { kind: 'tiles' };

export interface MenuLink extends LinkItem {
  /** Före eller efter kategorierna i menyn. */
  position: 'before' | 'after';
  /** Röd text, t.ex. för Kampanjer. */
  highlight: boolean;
}

export interface NavigationSettings {
  topbar: LinkItem[];
  menuLinks: MenuLink[];
}

export const defaultHome: HomeSettings = {
  hero: {
    tag: 'Nyhet · PWO+',
    title: 'Må bra.\nUtan krångel.',
    lead: 'Träning, hälsa och kroppsvård med tydliga priser. Nu med vår egen pre-workout.',
    image: '/images/hero.webp',
    primary: { label: 'Upptäck PWO+', href: '/kollektion/pwo-plus' },
    secondary: { label: 'Handla kosttillskott', href: '/kategori/kosttillskott' },
  },
  quickLinks: [
    { label: 'Kampanjer', href: '/kollektion/kampanjer' },
    { label: 'Drycker', href: '/kategori/drycker' },
    { label: 'Kosttillskott', href: '/kategori/kosttillskott' },
    { label: 'Bars', href: '/kategori/bars' },
    { label: 'Livsmedel', href: '/kategori/livsmedel' },
    { label: 'Träningsutrustning', href: '/kategori/traningsutrustning' },
    { label: 'Kroppsvård', href: '/kategori/kroppsvard' },
    { label: 'Bästsäljare', href: '/kollektion/bastsaljare' },
  ],
  sections: [
    { kind: 'row', id: 'sale' },
    { kind: 'categories' },
    { kind: 'row', id: 'popular' },
    { kind: 'tiles' },
    { kind: 'pwo' },
    { kind: 'row', id: 'new' },
    { kind: 'instagram' },
    { kind: 'services' },
  ],
  rows: [
    { id: 'sale', title: 'Kampanjer just nu', source: 'sale', limit: 10, moreLabel: 'Se alla kampanjer', moreHref: '/kollektion/kampanjer', visible: true },
    { id: 'popular', title: 'Populärt just nu', source: 'popular', limit: 10, moreLabel: 'Se bästsäljare', moreHref: '/kollektion/bastsaljare', visible: true },
    { id: 'new', title: 'Nyheter', source: 'new', limit: 10, moreLabel: 'Se alla nyheter', moreHref: '/kollektion/nyheter', visible: true },
  ],
  categoriesTitle: 'Handla efter kategori',
  services: [
    { icon: 'truck', title: 'Fri frakt', text: 'När du handlar för 499 kr eller mer' },
    { icon: 'zap', title: 'Snabb leverans', text: 'Beställ före 14, skickas inom {leveranstid}' },
    { icon: 'rotate', title: '{öppet köp} dagars öppet köp', text: 'På oöppnade varor' },
    { icon: 'chat', title: 'Kundtjänst som svarar', text: '[Till kundservice](/support)' },
  ],
  tiles: [
    { image: '/images/traning.webp', title: 'Träning', buttonLabel: 'Handla nu', href: '/kategori/traningsutrustning' },
    { image: '/images/halsa.webp', title: 'Hälsa', buttonLabel: 'Handla nu', href: '/kategori/kosttillskott' },
    { image: '/images/skonhet.webp', title: 'Kroppsvård', buttonLabel: 'Handla nu', href: '/kategori/kroppsvard' },
  ],
  // Exempelbilder från butiken tills riktiga Instagram-bilder valts i Admin.
  instagram: {
    handle: '@selfit.se',
    url: 'https://www.instagram.com/selfit.se/',
    images: [
      { src: '/images/pwo-plus/blueberry-campaign.webp', href: '' },
      { src: '/images/traning.webp', href: '' },
      { src: '/images/hero.webp', href: '' },
      { src: '/images/pwo-plus/flavour-lineup.jpeg', href: '' },
      { src: '/images/halsa.webp', href: '' },
      { src: '/images/protein-pannkakor/blueberry.webp', href: '' },
      { src: '/images/skonhet.webp', href: '' },
    ],
  },
};

export const defaultNavigation: NavigationSettings = {
  topbar: [
    { label: 'Fri frakt över 499 kr', href: '/support/frakt-och-leverans' },
    { label: 'Beställ före 14 – skickas inom {leveranstid}', href: '' },
    { label: '{öppet köp} dagars öppet köp', href: '/support/retur-och-angerratt' },
    { label: 'Kundtjänst som svarar', href: '/support' },
  ],
  menuLinks: [
    { label: 'Kampanjer', href: '/kollektion/kampanjer', position: 'before', highlight: true },
    { label: 'Nyheter', href: '/kollektion/nyheter', position: 'after', highlight: false },
    { label: 'PWO+', href: '/kollektion/pwo-plus', position: 'after', highlight: false },
  ],
};

export const SERVICE_ICONS: { value: ServiceIcon; label: string }[] = [
  { value: 'truck', label: 'Lastbil (frakt)' },
  { value: 'zap', label: 'Blixt (snabbt)' },
  { value: 'rotate', label: 'Pil runt (retur)' },
  { value: 'chat', label: 'Pratbubbla (kundtjänst)' },
  { value: 'shield', label: 'Sköld (trygghet)' },
  { value: 'gift', label: 'Paket (present)' },
  { value: 'heart', label: 'Hjärta' },
  { value: 'star', label: 'Stjärna' },
];
