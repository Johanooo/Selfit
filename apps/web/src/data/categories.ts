import type { Brand, Category, Collection, Subcategory } from './types';

export const categories: Category[] = [
  {
    slug: 'traning',
    name: 'Träning',
    short: 'Energi, återhämtning och utrustning för passet.',
    intro:
      'Allt du behöver före, under och efter passet. Vi har valt produkter med tydliga innehållsförteckningar och doseringar du förstår.',
    tone: 'lavender',
    image: '/images/traning.jpg',
    imageAlt: 'Ihoprullad lavendelfärgad yogamatta, gummiband och burkar mot ljus bakgrund',
  },
  {
    slug: 'halsa',
    name: 'Hälsa',
    short: 'Vitaminer, mineraler och vardagens basbehov.',
    intro:
      'Kosttillskott för vardagen, från D-vitamin under vinterhalvåret till magnesium för kvällen. Rätt dos, tydligt förklarat.',
    tone: 'sage',
    image: '/images/halsa.jpg',
    imageAlt: 'Burkar med kosttillskott och kapslar mot salviagrön bakgrund',
  },
  {
    slug: 'skonhet',
    name: 'Skönhet och kroppsvård',
    short: 'Milda produkter för hud, händer och dusch.',
    intro:
      'Hudvård och kroppsvård utan krångel. Parfymfria alternativ, tydliga INCI-listor och storlekar som räcker.',
    tone: 'sand',
    image: '/images/skonhet.jpg',
    imageAlt: 'Tuber och en burk med hudvård på sandfärgad sten i mjukt ljus',
  },
];

export const subcategories: Subcategory[] = [
  { slug: 'pre-workout', name: 'Pre-workout', parent: 'traning', intro: 'Energi och fokus inför passet.' },
  { slug: 'kreatin-och-prestation', name: 'Kreatin och prestation', parent: 'traning', intro: 'Kreatin och vätskeersättning för hårda pass.' },
  { slug: 'proteinprodukter', name: 'Proteinprodukter', parent: 'traning', intro: 'Proteinrika mellanmål och måltider.' },
  { slug: 'traningstillbehor', name: 'Träningstillbehör', parent: 'traning', intro: 'Shakers, band och annat som gör passet enklare.' },
  { slug: 'vitaminer', name: 'Vitaminer', parent: 'halsa', intro: 'D-vitamin, C-vitamin och multivitaminer.' },
  { slug: 'mineraler', name: 'Mineraler', parent: 'halsa', intro: 'Magnesium, järn och zink.' },
  { slug: 'omega-3', name: 'Omega-3', parent: 'halsa', intro: 'Fiskolja med EPA och DHA.' },
  { slug: 'mage-och-tarm', name: 'Mage och tarm', parent: 'halsa', intro: 'Mjölksyrabakterier för magen.' },
  { slug: 'ansiktsvard', name: 'Ansiktsvård', parent: 'skonhet', intro: 'Rengöring och fukt för ansiktet.' },
  { slug: 'kroppsvard', name: 'Kroppsvård', parent: 'skonhet', intro: 'Handkräm, dusch och deodorant.' },
  { slug: 'sol-och-lappar', name: 'Sol och läppar', parent: 'skonhet', intro: 'Solskydd och läppbalsam.' },
];

export const brands: Brand[] = [
  { slug: 'selfit', name: 'SELFIT', intro: 'Våra egna produkter, framtagna i Sverige. PWO+ är först ut.' },
  { slug: 'kraftverk', name: 'Kraftverk', intro: 'Prestation och återhämtning utan onödiga tillsatser.' },
  { slug: 'nordvital', name: 'Nordvital', intro: 'Kosttillskott anpassade för nordiska förhållanden.' },
  { slug: 'hudro', name: 'Hudro', intro: 'Mild hud- och kroppsvård, utvecklad för känslig hud.' },
];

export const collections: Collection[] = [
  { slug: 'pwo-plus', name: 'PWO+', intro: 'Hela PWO+-serien. Sex smaker, tre förpackningsstorlekar.' },
  { slug: 'nyheter', name: 'Nyheter', intro: 'Det senaste i sortimentet, utvalt av oss.' },
  { slug: 'bastsaljare', name: 'Bästsäljare', intro: 'Produkterna våra kunder handlar om och om igen.' },
  { slug: 'kampanjer', name: 'Kampanjer', intro: 'Produkter med sänkt pris just nu. Vi visar alltid lägsta pris de senaste 30 dagarna.' },
];

export const getCategory = (slug?: string) => categories.find((c) => c.slug === slug);
export const getSubcategory = (slug?: string) => subcategories.find((c) => c.slug === slug);
export const subcategoriesOf = (parent: string) => subcategories.filter((c) => c.parent === parent);
export const getBrand = (slug?: string) => brands.find((b) => b.slug === slug);
export const getCollection = (slug?: string) => collections.find((c) => c.slug === slug);
