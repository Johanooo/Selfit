import type { Brand, Category, Collection } from './types';

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
];

export const getCategory = (slug?: string) => categories.find((c) => c.slug === slug);
export const getBrand = (slug?: string) => brands.find((b) => b.slug === slug);
export const getCollection = (slug?: string) => collections.find((c) => c.slug === slug);
