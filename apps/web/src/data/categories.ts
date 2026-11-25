import type { Brand, Category, Collection, Subcategory } from './types';

/**
 * Visa kategorier som ännu saknar produkter? true på testsidan så att hela strukturen syns.
 * Sätt till false före lansering – då visas bara kategorier som har produkter.
 */
export const SHOW_EMPTY_CATEGORIES = true;

export const categories: Category[] = [
  {
    slug: 'drycker',
    name: 'Drycker',
    short: 'Energidryck, pre-workout, protein- och sportdryck.',
    intro: 'Färdiga drycker före, under och efter passet. Pant visas alltid separat.',
    tone: 'lavender',
  },
  {
    slug: 'kosttillskott',
    name: 'Kosttillskott',
    short: 'Protein, kreatin, vitaminer, mineraler och mer.',
    intro: 'Kosttillskott för träning och vardag. Tydliga innehållsförteckningar och doser du förstår.',
    tone: 'sage',
    image: '/images/halsa.webp',
    imageAlt: 'Burkar med kosttillskott och kapslar mot salviagrön bakgrund',
  },
  {
    slug: 'halsokost',
    name: 'Hälsokost',
    short: 'Greens, örter, te och superfoods.',
    intro: 'Hälsokost med enkla, tydliga ingredienser.',
    tone: 'sage',
  },
  {
    slug: 'bars',
    name: 'Bars',
    short: 'Protein-, energi- och veganska bars.',
    intro: 'Bars för mellanmålet, gymväskan och resan.',
    tone: 'sand',
  },
  {
    slug: 'livsmedel',
    name: 'Livsmedel',
    short: 'Proteinmat, gröt, spreads, såser och snacks.',
    intro: 'Proteinrik mat och skafferivaror för vardagen.',
    tone: 'sand',
  },
  {
    slug: 'traningsklader',
    name: 'Träningskläder',
    short: 'T-shirts, hoodies, tights, strumpor och skor.',
    intro: 'Bekväma träningskläder för gymmet, löprundan och vardagen.',
    tone: 'lavender',
  },
  {
    slug: 'traningsutrustning',
    name: 'Träningsutrustning',
    short: 'Shakers, band, vikter, yoga och grepp.',
    intro: 'Utrustning som gör passet enklare, hemma och på gymmet.',
    tone: 'lavender',
    image: '/images/traning.webp',
    imageAlt: 'Ihoprullad yogamatta, gummiband och burkar mot ljus bakgrund',
  },
  {
    slug: 'kroppsvard',
    name: 'Kroppsvård',
    short: 'Hudvård, dusch och solskydd.',
    intro: 'Hudvård och kroppsvård utan krångel. Parfymfria alternativ och tydliga INCI-listor.',
    tone: 'sand',
    image: '/images/skonhet.webp',
    imageAlt: 'Tuber och en burk med hudvård på sandfärgad sten i mjukt ljus',
  },
];

const sub = (parent: string, slug: string, name: string, intro: string): Subcategory => ({ slug, name, parent, intro });

export const subcategories: Subcategory[] = [
  sub('drycker', 'energidryck', 'Energi- och pre-workoutdryck', 'Färdiga drycker med koffein inför passet.'),
  sub('drycker', 'proteindryck', 'Proteindryck', 'Färdiga proteindrycker och shakes.'),
  sub('drycker', 'sportdryck', 'Sportdryck', 'Drycker med kolhydrater och salter.'),
  sub('drycker', 'vitamindryck', 'Vitamindryck', 'Drycker med tillsatta vitaminer.'),
  sub('drycker', 'sockerfri-lask', 'Sockerfri läsk', 'Läsk utan socker.'),
  sub('drycker', 'mixflak', 'Mixflak', 'Blandade flak med flera smaker.'),

  sub('kosttillskott', 'proteinpulver', 'Proteinpulver', 'Vassle, kasein, clear whey och veganskt protein.'),
  sub('kosttillskott', 'kreatin', 'Kreatin', 'Kreatin som pulver, kapslar och gummies.'),
  sub('kosttillskott', 'pre-workout', 'Pre-workout och prestation', 'Pre-workout, koffein och shots inför passet.'),
  sub('kosttillskott', 'aminosyror', 'Aminosyror och BCAA', 'EAA, BCAA, beta-alanin, citrullin och fler.'),
  sub('kosttillskott', 'vitaminer', 'Vitaminer', 'D-vitamin, B-vitamin, C-vitamin och multivitaminer.'),
  sub('kosttillskott', 'mineraler', 'Mineraler', 'Magnesium, järn, zink och kalcium.'),
  sub('kosttillskott', 'omega-3', 'Omega-3 och fettsyror', 'Fiskolja, algolja, MCT och andra fettsyror.'),
  sub('kosttillskott', 'kollagen', 'Kollagen', 'Kollagen som pulver och kapslar.'),
  sub('kosttillskott', 'elektrolyter', 'Elektrolyter och vätskeersättning', 'Salter och vätska för långa och svettiga pass.'),
  sub('kosttillskott', 'kolhydrater-och-gainer', 'Kolhydrater och gainer', 'Gainer, kolhydratladdning och cream of rice.'),
  sub('kosttillskott', 'maltidsersattning', 'Måltidsersättning', 'Kompletta måltider att blanda.'),
  sub('kosttillskott', 'mage-och-tarm', 'Probiotika och mage', 'Mjölksyrabakterier, enzymer och fibrer.'),
  sub('kosttillskott', 'graviditet-och-amning', 'Graviditet och amning', 'Folsyra och tillskott under graviditet och amning.'),
  sub('kosttillskott', 'veganska-kosttillskott', 'Veganska kosttillskott', 'Kosttillskott utan animaliska ingredienser.'),

  sub('halsokost', 'greens-och-superfoods', 'Greens och superfoods', 'Greensblandningar, spirulina, chlorella och bärpulver.'),
  sub('halsokost', 'orter-och-vaxtextrakt', 'Örter och växtextrakt', 'Ashwagandha, gurkmeja, rosenrot, maca och svampar.'),
  sub('halsokost', 'te-och-matcha', 'Te och matcha', 'Matcha, te och kaffealternativ.'),
  sub('halsokost', 'halsokost-ovrigt', 'Övrig hälsokost', 'Kokosolja, tranbär, rödbetsjuice och mer.'),

  sub('bars', 'proteinbars', 'Proteinbars', 'Bars med mycket protein och lite socker.'),
  sub('bars', 'energibars', 'Energibars', 'Bars med kolhydrater för långa pass.'),
  sub('bars', 'veganska-bars', 'Veganska bars', 'Bars utan animaliska ingredienser.'),

  sub('livsmedel', 'proteinmat', 'Proteinpannkakor och pudding', 'Proteinpannkakor, pudding och bakmixer.'),
  sub('livsmedel', 'grot-och-gryn', 'Gröt och gryn', 'Proteingröt, havre och gryn.'),
  sub('livsmedel', 'spreads', 'Jordnötssmör och spreads', 'Nötsmör och spreads.'),
  sub('livsmedel', 'saser-och-smakdroppar', 'Såser och smakdroppar', 'Kalorisnåla såser och smakdroppar.'),
  sub('livsmedel', 'oljor', 'Oljor', 'Oljor för matlagning och bakning.'),
  sub('livsmedel', 'snacks-och-godis', 'Snacks och godis', 'Chips, choklad och godis med mer protein.'),

  sub('traningsklader', 't-shirts-och-linnen', 'T-shirts och linnen', 'T-shirts och linnen för träning.'),
  sub('traningsklader', 'hoodies-och-trojor', 'Hoodies och tröjor', 'Hoodies, tröjor och jackor.'),
  sub('traningsklader', 'tights-och-byxor', 'Tights och byxor', 'Tights, joggers och träningsbyxor.'),
  sub('traningsklader', 'shorts', 'Shorts', 'Träningsshorts.'),
  sub('traningsklader', 'sport-bh', 'Sport-BH och crop tops', 'Sport-BH och crop tops.'),
  sub('traningsklader', 'strumpor', 'Strumpor', 'Tränings- och vardagsstrumpor.'),
  sub('traningsklader', 'mossor-och-kepsar', 'Mössor och kepsar', 'Mössor, kepsar och pannband.'),
  sub('traningsklader', 'skor', 'Skor', 'Träningsskor.'),

  sub('traningsutrustning', 'shakers-och-flaskor', 'Shakers och flaskor', 'Shakers, vattenflaskor och dosor.'),
  sub('traningsutrustning', 'traningsband', 'Träningsband', 'Gummiband och miniband för hemmaträning.'),
  sub('traningsutrustning', 'hantlar-och-vikter', 'Hantlar och vikter', 'Hantlar, kettlebells, skivstänger och viktvästar.'),
  sub('traningsutrustning', 'yoga-och-foam-roller', 'Yoga och foam roller', 'Yogamattor, block och foam rollers.'),
  sub('traningsutrustning', 'grepp-och-remmar', 'Dragremmar och grepp', 'Dragremmar, krita och grepp.'),
  sub('traningsutrustning', 'traningsbalten', 'Träningsbälten', 'Lyftbälten och dippbälten.'),
  sub('traningsutrustning', 'handskar-och-skydd', 'Handskar och skydd', 'Handskar, knäskydd och handledslindor.'),
  sub('traningsutrustning', 'kondition', 'Hopprep och kondition', 'Hopprep, medicinbollar och boxning.'),
  sub('traningsutrustning', 'traningsvaskor', 'Träningsväskor', 'Väskor för gym och resa.'),

  sub('kroppsvard', 'ansiktsvard', 'Ansiktsvård', 'Rengöring och fukt för ansiktet.'),
  sub('kroppsvard', 'dusch-och-hud', 'Dusch och hudvård', 'Handkräm, dusch och deodorant.'),
  sub('kroppsvard', 'sol-och-lappar', 'Sol och läppar', 'Solskydd och läppbalsam.'),
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
