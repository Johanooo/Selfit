import type { Flavour, PricePoint, Product, Variant } from './types';

/** Builds a valid EAN-13 from a 12-digit body. */
function ean(body: string): string {
  const digits = body.padStart(12, '0').slice(0, 12);
  const sum = digits.split('').reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return digits + ((10 - (sum % 10)) % 10);
}

export const CAN_ML = 330;
export const DEPOSIT_PER_CAN = 1;

export const pwoFlavours: Flavour[] = [
  { slug: 'blueberry', name: 'Blåbär', note: 'Söt och fyllig blåbärssmak' },
  { slug: 'strawberry', name: 'Jordgubb', note: 'Frisk smak av jordgubb' },
  { slug: 'berry-fusion', name: 'Bärmix', note: 'En blandning av blåbär och hallon' },
  { slug: 'mango-passion', name: 'Mango & passionsfrukt', note: 'Fruktig mango med passionsfrukt' },
  { slug: 'green-apple', name: 'Grönt äpple', note: 'Frisk smak av grönt äpple' },
  { slug: 'black-edition', name: 'Black Edition', note: 'SELFITs Black Edition-smak' },
];

const PWO_PACKS = [6, 12, 24];
const PWO_PRICES: Record<number, number> = { 6: 149, 12: 279, 24: 529 };
const PWO_EXCEPTIONS: Record<string, Partial<Variant>> = {
  'green-apple-6': { stock: 0 },
  'black-edition-24': { offered: false, stock: 0 },
  'strawberry-6': { stock: 4 },
  'strawberry-24': { stock: 0 },
  'mango-passion-24': { stock: 3 },
};

const pwoVariants: Variant[] = pwoFlavours.flatMap((f, fi) =>
  PWO_PACKS.map((pack, pi) => {
    const id = `${f.slug}-${pack}`;
    return {
      id: `pwo-plus-${id}`,
      flavour: f.slug,
      pack,
      price: PWO_PRICES[pack],
      depositPerUnit: DEPOSIT_PER_CAN,
      stock: 38 + fi * 7 + pi * 3,
      offered: true,
      ean: ean(`735012${fi}${pi}00${pack}`),
      image: `can:${f.slug}`,
      measure: { amount: Math.round(pack * CAN_ML) / 1000, unit: 'l' as const },
      ...PWO_EXCEPTIONS[id],
    };
  }),
);

const pwo: Product = {
  slug: 'pwo-plus',
  name: 'PWO+ Pre-workout',
  brand: 'SELFIT',
  brandSlug: 'selfit',
  category: 'traning',
  collections: ['pwo-plus', 'nyheter', 'bastsaljare'],
  tagline: 'Kolsyrad pre-workout med beta-alanin, AAKG och koffein.',
  description: [
    'PWO+ är vår första egna produkt: en lätt kolsyrad pre-workout-dryck som är färdig att dricka. Ingen shaker, inga pulverklumpar och en dos du vet exakt.',
    'En burk på 330 ml innehåller 3 500 mg beta-alanin, 3 000 mg AAKG och 300 mg koffein.',
  ],
  usage:
    'Avsedd att drickas före träning. Burken innehåller 300 mg koffein. Läs alltid förpackningens bruksanvisning och varningstext före användning. Rekommenderas inte för barn, gravida eller ammande.',
  ingredients:
    'Se förpackningens fullständiga innehållsförteckning. Produktbilden visar endast utvalda ingredienser och aktiva ämnen.',
  allergens: [],
  nutrition: {
    servingLabel: 'per burk (330 ml)',
    rows: [
      { label: 'Energi', per100: '4 kJ / 1 kcal', perServing: '13 kJ / 3 kcal' },
      { label: 'Fett', per100: '0 g', perServing: '0 g' },
      { label: 'Beta-alanin', per100: '1 061 mg', perServing: '3 500 mg' },
      { label: 'AAKG', per100: '909 mg', perServing: '3 000 mg' },
      { label: 'Koffein', per100: '91 mg', perServing: '300 mg' },
    ],
  },
  facts: [
    { label: 'Volym per burk', value: '330 ml' },
    { label: 'Pant', value: '1 kr per burk' },
    { label: 'Hög koffeinhalt', value: 'cirka 91 mg/100 ml' },
    { label: 'Tillverkad i', value: 'Sverige' },
  ],
  art: 'can',
  artTone: 'plum',
  unitLabel: 'burk',
  sizeLabel: '330 ml',
  vatRate: 0.12,
  popularity: 100,
  isNew: true,
  related: ['elektrolyt-brus', 'kreatin-monohydrat', 'proteinbar-kakao'],
  pairsWith: ['shaker-600', 'magnesium-kvall', 'traningsband-set'],
  variants: pwoVariants,
};

const proteinPancakes: Product = {
  slug: 'protein-pannkakor',
  name: 'Protein pannkakor',
  brand: 'SELFIT',
  brandSlug: 'selfit',
  category: 'traning',
  collections: ['nyheter'],
  tagline: 'Pannkaksmix med 30 g protein per 100 g mix.',
  description: [
    'SELFIT Protein Pannkakor är en bakmix i blåbärs- och jordgubbssmak.',
    'Enligt förpackningen innehåller mixen 30 g protein per 100 g, utan tillsatt socker. Tillsätt bara vatten.',
  ],
  usage: 'Blanda och tillaga pannkakorna enligt anvisningarna på förpackningen.',
  ingredients: 'Fullständig ingrediensförteckning saknas i exempeldata. Kontrollera förpackningen.',
  allergens: [],
  allergenInfoKnown: false,
  nutrition: {
    referenceLabel: 'per 100 g mix',
    rows: [{ label: 'Protein', per100: '30 g' }],
  },
  facts: [
    { label: 'Förpackning', value: '500 g' },
    { label: 'Tillagning', value: 'Tillsätt bara vatten' },
    { label: 'Socker', value: 'Utan tillsatt socker' },
  ],
  art: 'box',
  artTone: 'ink',
  unitLabel: 'påse',
  sizeLabel: '500 g',
  vatRate: 0.12,
  popularity: 67,
  isNew: true,
  related: ['proteinbar-kakao', 'kreatin-monohydrat'],
  pairsWith: ['pwo-plus'],
  variants: [
    {
      id: 'protein-pannkakor-blueberry',
      flavour: 'blueberry',
      price: 129,
      depositPerUnit: 0,
      stock: 28,
      offered: true,
      ean: ean('735020000088'),
      image: 'photo:/images/protein-pannkakor/blueberry.webp',
      measure: { amount: 0.5, unit: 'kg' },
    },
    {
      id: 'protein-pannkakor-strawberry',
      flavour: 'strawberry',
      price: 129,
      depositPerUnit: 0,
      stock: 24,
      offered: true,
      ean: ean('735020000089'),
      image: 'photo:/images/protein-pannkakor/strawberry.webp',
      measure: { amount: 0.5, unit: 'kg' },
    },
  ],
};

interface SimpleInput extends Omit<Product, 'variants' | 'collections' | 'related' | 'pairsWith' | 'facts'> {
  collections?: string[];
  related?: string[];
  pairsWith?: string[];
  facts?: Product['facts'];
  price: number;
  stock?: number;
  measure?: Variant['measure'];
  eanBody: string;
  packs?: { pack: number; price: number; stock?: number }[];
}

function simple(input: SimpleInput): Product {
  const { price, stock = 60, measure, eanBody, packs, ...rest } = input;
  const variants: Variant[] = packs
    ? packs.map((p, i) => ({
        id: `${rest.slug}-${p.pack}`,
        pack: p.pack,
        price: p.price,
        depositPerUnit: 0,
        stock: p.stock ?? stock,
        offered: true,
        ean: ean(`${eanBody}${i}`),
        image: 'art',
        measure: measure ? { ...measure, amount: measure.amount * p.pack } : undefined,
      }))
    : [
        {
          id: rest.slug,
          price,
          depositPerUnit: 0,
          stock,
          offered: true,
          ean: ean(eanBody),
          image: 'art',
          measure,
        },
      ];
  return {
    collections: [],
    related: [],
    pairsWith: [],
    facts: [],
    ...rest,
    variants,
  };
}

const others: Product[] = [
  simple({
    slug: 'elektrolyt-brus',
    name: 'Elektrolyt Brustabletter',
    brand: 'Kraftverk',
    brandSlug: 'kraftverk',
    category: 'traning',
    collections: ['bastsaljare'],
    tagline: 'Natrium, kalium och magnesium för långa pass och varma dagar.',
    description: ['Lös en tablett i 500 ml vatten för en lätt, salt-syrlig dryck som ersätter salter du förlorar genom svett.'],
    usage: '1–2 tabletter per dag, lösta i 500 ml vatten.',
    ingredients:
      'Surhetsreglerande medel (citronsyra, natriumvätekarbonat), natriumklorid, kaliumklorid, magnesiumkarbonat, arom (citron), sötningsmedel (sukralos), färgämne (betakaroten).',
    allergens: [],
    art: 'tube',
    artTone: 'sky',
    unitLabel: 'tub',
    sizeLabel: '20 tabletter',
    vatRate: 0.12,
    popularity: 78,
    related: ['pwo-plus', 'shaker-600'],
    pairsWith: ['pwo-plus', 'c-vitamin-brus'],
    price: 59,
    measure: { amount: 20, unit: 'st' },
    eanBody: '735020000011',
  }),
  simple({
    slug: 'proteinbar-kakao',
    name: 'Proteinbar Kakao och hasselnöt',
    brand: 'Kraftverk',
    brandSlug: 'kraftverk',
    category: 'traning',
    tagline: '20 g protein per bar, mjuk kärna och tunt chokladlager.',
    description: ['En mättande bar efter passet eller som mellanmål. Låg sockerhalt och lång hållbarhet.'],
    usage: 'Ät som mellanmål eller efter träning.',
    ingredients:
      'Mjölkproteinisolat, sötningsmedel (maltitol), hasselnötter (8 %), kakaosmör, vassleprotein (mjölk), sojaprotein, kakaopulver, emulgeringsmedel (sojalecitin), arom, salt.',
    allergens: ['mjölk', 'hasselnöt', 'soja', 'mjölkproteinisolat'],
    art: 'box',
    artTone: 'ink',
    unitLabel: 'förpackning',
    sizeLabel: '12 × 55 g',
    vatRate: 0.12,
    popularity: 64,
    related: ['pwo-plus', 'kreatin-monohydrat'],
    pairsWith: ['shaker-600'],
    price: 229,
    packs: [
      { pack: 12, price: 229 },
      { pack: 24, price: 429, stock: 0 },
    ],
    measure: { amount: 0.055, unit: 'kg' },
    eanBody: '73502000002',
  }),
  simple({
    slug: 'shaker-600',
    name: 'Shaker 600 ml',
    brand: 'SELFIT',
    brandSlug: 'selfit',
    category: 'traning',
    collections: ['nyheter'],
    tagline: 'Läckagesäker shaker med mätskala och diskmaskinssäkert lock.',
    description: ['Tillverkad i BPA-fri polypropen med en stålboll som blandar utan klumpar.'],
    usage: 'Diska före första användning. Tål diskmaskin upp till 60 grader.',
    ingredients: 'Polypropen (BPA-fri), rostfritt stål.',
    allergens: [],
    art: 'shaker',
    artTone: 'plum',
    unitLabel: 'st',
    sizeLabel: '600 ml',
    vatRate: 0.25,
    popularity: 55,
    isNew: true,
    related: ['proteinbar-kakao'],
    pairsWith: ['kreatin-monohydrat', 'elektrolyt-brus'],
    price: 99,
    eanBody: '735020000033',
  }),
  simple({
    slug: 'kreatin-monohydrat',
    name: 'Kreatin Monohydrat',
    brand: 'Kraftverk',
    brandSlug: 'kraftverk',
    category: 'traning',
    collections: ['bastsaljare'],
    tagline: 'Rent kreatinmonohydrat, smaksatt neutralt. 100 doser.',
    description: ['Kreatin ökar den fysiska prestationen vid upprepade korta perioder av högintensiv träning. Effekten uppnås vid ett dagligt intag av 3 g.'],
    usage: 'Blanda 3 g (en struken skopa) i vatten eller juice en gång per dag.',
    ingredients: 'Kreatinmonohydrat (100 %).',
    allergens: [],
    art: 'jar',
    artTone: 'ink',
    unitLabel: 'burk',
    sizeLabel: '300 g',
    vatRate: 0.12,
    popularity: 82,
    related: ['pwo-plus', 'proteinbar-kakao'],
    pairsWith: ['shaker-600'],
    price: 249,
    measure: { amount: 0.3, unit: 'kg' },
    eanBody: '735020000044',
    primaryImage: '/images/kreatin-monohydrat-demo.webp',
    primaryImageAlt: 'Tillfällig exempelbild för Kreatin Monohydrat: burk med kreatingummies',
  }),
  simple({
    slug: 'traningsband-set',
    name: 'Träningsband, set om 3',
    brand: 'Kraftverk',
    brandSlug: 'kraftverk',
    category: 'traning',
    tagline: 'Tre motståndsnivåer i textil som inte rullar sig.',
    description: ['Lätt, medel och tung. Perfekt för uppvärmning, rehab och träning hemma.'],
    usage: 'Kontrollera bandet före varje användning.',
    ingredients: 'Polyester, naturgummi (latex).',
    allergens: ['latex'],
    art: 'band',
    artTone: 'rose',
    unitLabel: 'set',
    sizeLabel: '3 st',
    vatRate: 0.25,
    popularity: 41,
    price: 179,
    stock: 3,
    eanBody: '735020000055',
  }),
  simple({
    slug: 'd-vitamin-50',
    name: 'D-vitamin 50 µg',
    brand: 'Nordvital',
    brandSlug: 'nordvital',
    category: 'halsa',
    collections: ['bastsaljare'],
    tagline: 'Hög dos för det mörka halvåret. 90 små kapslar.',
    description: ['D-vitamin bidrar till att bibehålla normal benstomme, muskelfunktion och immunförsvar.'],
    usage: '1 kapsel per dag. Överskrid inte rekommenderad dos. Kosttillskott ska inte ersätta en varierad kost.',
    ingredients: 'Olivolja, gelatin (nöt), fuktighetsbevarande medel (glycerol), kolekalciferol (vitamin D3).',
    allergens: [],
    art: 'jar',
    artTone: 'sand',
    unitLabel: 'burk',
    sizeLabel: '90 kapslar',
    vatRate: 0.12,
    popularity: 91,
    related: ['omega-3', 'multivitamin'],
    pairsWith: ['magnesium-kvall', 'zink-15'],
    price: 89,
    measure: { amount: 90, unit: 'st' },
    eanBody: '735030000011',
  }),
  simple({
    slug: 'omega-3',
    name: 'Omega-3 Fiskolja',
    brand: 'Nordvital',
    brandSlug: 'nordvital',
    category: 'halsa',
    tagline: 'EPA och DHA från MSC-märkt fisk. 120 kapslar.',
    description: ['DHA bidrar till att bibehålla normal hjärnfunktion och syn. EPA och DHA bidrar till hjärtats normala funktion.'],
    usage: '2 kapslar per dag i samband med måltid.',
    ingredients: 'Fiskolja (fisk), gelatin (nöt), fuktighetsbevarande medel (glycerol), antioxidationsmedel (tokoferolrikt extrakt).',
    allergens: ['fisk'],
    art: 'jar',
    artTone: 'sky',
    unitLabel: 'burk',
    sizeLabel: '120 kapslar',
    vatRate: 0.12,
    popularity: 73,
    related: ['d-vitamin-50', 'multivitamin'],
    pairsWith: ['d-vitamin-50'],
    price: 189,
    packs: [
      { pack: 1, price: 189 },
      { pack: 3, price: 499 },
    ],
    measure: { amount: 120, unit: 'st' },
    eanBody: '73503000002',
  }),
  simple({
    slug: 'magnesium-kvall',
    name: 'Magnesium Kväll',
    brand: 'Nordvital',
    brandSlug: 'nordvital',
    category: 'halsa',
    collections: ['nyheter'],
    isNew: true,
    tagline: 'Magnesiumbisglycinat, skonsamt för magen. 60 tabletter.',
    description: ['Magnesium bidrar till att minska trötthet och utmattning samt till normal muskelfunktion.'],
    usage: '2 tabletter på kvällen med ett glas vatten.',
    ingredients: 'Magnesiumbisglycinat, fyllnadsmedel (mikrokristallin cellulosa), klumpförebyggande medel (magnesiumstearat).',
    allergens: [],
    art: 'jar',
    artTone: 'plum',
    unitLabel: 'burk',
    sizeLabel: '60 tabletter',
    vatRate: 0.12,
    popularity: 69,
    related: ['zink-15', 'd-vitamin-50'],
    pairsWith: ['pwo-plus'],
    price: 119,
    measure: { amount: 60, unit: 'st' },
    eanBody: '735030000033',
  }),
  simple({
    slug: 'jarn-c',
    name: 'Järn + C-vitamin',
    brand: 'Nordvital',
    brandSlug: 'nordvital',
    category: 'halsa',
    tagline: 'Järnbisglycinat med C-vitamin för bättre upptag. 30 tabletter.',
    description: ['Järn bidrar till normal bildning av röda blodkroppar och hemoglobin.'],
    usage: '1 tablett per dag. Förvaras oåtkomligt för barn.',
    ingredients: 'Fyllnadsmedel (mikrokristallin cellulosa), askorbinsyra, järnbisglycinat, klumpförebyggande medel (magnesiumstearat).',
    allergens: [],
    art: 'jar',
    artTone: 'rose',
    unitLabel: 'burk',
    sizeLabel: '30 tabletter',
    vatRate: 0.12,
    popularity: 48,
    price: 79,
    stock: 0,
    measure: { amount: 30, unit: 'st' },
    eanBody: '735030000044',
  }),
  simple({
    slug: 'probiotika',
    name: 'Probiotika Daglig',
    brand: 'Nordvital',
    brandSlug: 'nordvital',
    category: 'halsa',
    tagline: 'Fem bakteriestammar, 10 miljarder per kapsel. 30 kapslar.',
    description: ['Förvaras svalt och torrt. Tål rumstemperatur, behöver inte kylas.'],
    usage: '1 kapsel per dag i samband med frukost.',
    ingredients: 'Inulin, kapselhölje (hydroxipropylmetylcellulosa), bakteriekulturer, klumpförebyggande medel (magnesiumstearat).',
    allergens: [],
    art: 'jar',
    artTone: 'sage',
    unitLabel: 'burk',
    sizeLabel: '30 kapslar',
    vatRate: 0.12,
    popularity: 52,
    price: 249,
    measure: { amount: 30, unit: 'st' },
    eanBody: '735030000055',
  }),
  simple({
    slug: 'multivitamin',
    name: 'Multivitamin Bas',
    brand: 'Nordvital',
    brandSlug: 'nordvital',
    category: 'halsa',
    collections: ['bastsaljare'],
    tagline: '23 vitaminer och mineraler i en daglig tablett.',
    description: ['Ett enkelt komplement när kosten inte räcker hela vägen.'],
    usage: '1 tablett per dag med måltid.',
    ingredients: 'Kalciumkarbonat, magnesiumoxid, askorbinsyra, fyllnadsmedel (cellulosa), zinkcitrat, vitaminer och mineraler.',
    allergens: [],
    art: 'jar',
    artTone: 'sage',
    unitLabel: 'burk',
    sizeLabel: '60 tabletter',
    vatRate: 0.12,
    popularity: 80,
    related: ['d-vitamin-50', 'omega-3'],
    pairsWith: ['omega-3'],
    price: 139,
    measure: { amount: 60, unit: 'st' },
    eanBody: '735030000066',
  }),
  simple({
    slug: 'zink-15',
    name: 'Zink 15 mg',
    brand: 'Nordvital',
    brandSlug: 'nordvital',
    category: 'halsa',
    tagline: 'Zinkpikolinat, 100 små tabletter.',
    description: ['Zink bidrar till normal funktion i immunsystemet och till att bibehålla normal hud.'],
    usage: '1 tablett per dag.',
    ingredients: 'Fyllnadsmedel (cellulosa), zinkpikolinat, klumpförebyggande medel (magnesiumstearat).',
    allergens: [],
    art: 'jar',
    artTone: 'sky',
    unitLabel: 'burk',
    sizeLabel: '100 tabletter',
    vatRate: 0.12,
    popularity: 37,
    price: 69,
    measure: { amount: 100, unit: 'st' },
    eanBody: '735030000077',
  }),
  simple({
    slug: 'c-vitamin-brus',
    name: 'C-vitamin Brus 1000 mg',
    brand: 'Nordvital',
    brandSlug: 'nordvital',
    category: 'halsa',
    tagline: 'Brustabletter med apelsinsmak. 20 st.',
    description: ['C-vitamin bidrar till immunsystemets normala funktion.'],
    usage: '1 tablett per dag löst i ett glas vatten.',
    ingredients: 'Surhetsreglerande medel (citronsyra, natriumvätekarbonat), askorbinsyra, arom (apelsin), sötningsmedel (sukralos).',
    allergens: [],
    art: 'tube',
    artTone: 'sand',
    unitLabel: 'tub',
    sizeLabel: '20 tabletter',
    vatRate: 0.12,
    popularity: 44,
    price: 49,
    measure: { amount: 20, unit: 'st' },
    eanBody: '735030000088',
  }),
  simple({
    slug: 'fuktkram-ansikte',
    name: 'Fuktkräm Ansikte',
    brand: 'Hudro',
    brandSlug: 'hudro',
    category: 'skonhet',
    collections: ['bastsaljare'],
    tagline: 'Parfymfri dagkräm med ceramider och niacinamid. 50 ml.',
    description: ['Återfuktar i upp till 24 timmar och stärker hudens barriär. Passar torr och känslig hud.'],
    usage: 'Applicera morgon och kväll på rengjord hud.',
    ingredients: 'Aqua, Glycerin, Caprylic/Capric Triglyceride, Niacinamide, Cetearyl Alcohol, Ceramide NP, Panthenol, Sodium Hyaluronate.',
    allergens: [],
    art: 'jar',
    artTone: 'sand',
    unitLabel: 'burk',
    sizeLabel: '50 ml',
    vatRate: 0.25,
    popularity: 86,
    related: ['ansiktsrengoring', 'solskydd-50'],
    pairsWith: ['ansiktsrengoring', 'laeppbalsam'],
    price: 229,
    measure: { amount: 0.05, unit: 'l' },
    eanBody: '735040000011',
  }),
  simple({
    slug: 'ansiktsrengoring',
    name: 'Mild Ansiktsrengöring',
    brand: 'Hudro',
    brandSlug: 'hudro',
    category: 'skonhet',
    tagline: 'Krämig gelrengöring som inte torkar ut. 150 ml.',
    description: ['pH-balanserad och parfymfri. Tar bort smuts och lätt smink.'],
    usage: 'Massera in på fuktig hud och skölj av med ljummet vatten.',
    ingredients: 'Aqua, Glycerin, Cocamidopropyl Betaine, Sodium Lauroyl Glutamate, Avena Sativa Kernel Extract (havre), Citric Acid.',
    allergens: ['havre'],
    art: 'tube',
    artTone: 'sage',
    unitLabel: 'tub',
    sizeLabel: '150 ml',
    vatRate: 0.25,
    popularity: 62,
    related: ['fuktkram-ansikte'],
    pairsWith: ['fuktkram-ansikte'],
    price: 159,
    measure: { amount: 0.15, unit: 'l' },
    eanBody: '735040000022',
  }),
  simple({
    slug: 'solskydd-50',
    name: 'Solskydd SPF 50',
    brand: 'Hudro',
    brandSlug: 'hudro',
    category: 'skonhet',
    collections: ['nyheter'],
    isNew: true,
    tagline: 'Lätt fluid för ansikte och kropp, vattenfast. 100 ml.',
    description: ['Bredspektrumskydd mot UVA och UVB. Lämnar inga vita rander.'],
    usage: 'Applicera rikligt före solexponering. Förnya ofta, särskilt efter bad.',
    ingredients: 'Aqua, Alcohol Denat., Diisopropyl Sebacate, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Glycerin, Tocopherol.',
    allergens: [],
    art: 'bottle',
    artTone: 'sand',
    unitLabel: 'flaska',
    sizeLabel: '100 ml',
    vatRate: 0.25,
    popularity: 58,
    related: ['fuktkram-ansikte', 'laeppbalsam'],
    pairsWith: ['laeppbalsam'],
    price: 199,
    measure: { amount: 0.1, unit: 'l' },
    eanBody: '735040000033',
  }),
  simple({
    slug: 'handkram',
    name: 'Handkräm Intensiv',
    brand: 'Hudro',
    brandSlug: 'hudro',
    category: 'skonhet',
    tagline: '10 % urea för mycket torra händer. 75 ml.',
    description: ['Snabbt absorberande, lämnar inga feta fingeravtryck.'],
    usage: 'Använd vid behov, gärna efter handtvätt.',
    ingredients: 'Aqua, Urea, Glycerin, Paraffinum Liquidum, Cetearyl Alcohol, Butyrospermum Parkii Butter (shea), Lactic Acid.',
    allergens: [],
    art: 'tube',
    artTone: 'rose',
    unitLabel: 'tub',
    sizeLabel: '75 ml',
    vatRate: 0.25,
    popularity: 47,
    price: 79,
    measure: { amount: 0.075, unit: 'l' },
    eanBody: '735040000044',
  }),
  simple({
    slug: 'duschkram-havre',
    name: 'Duschkräm Havre',
    brand: 'Hudro',
    brandSlug: 'hudro',
    category: 'skonhet',
    tagline: 'Mild duschkräm med havre och glycerin. 250 ml.',
    description: ['Skummar lätt och lämnar huden mjuk. Mild doft av havre.'],
    usage: 'Används i duschen, skölj noga.',
    ingredients: 'Aqua, Sodium Laureth Sulfate, Glycerin, Avena Sativa Kernel Flour (havre), Parfum, Citric Acid, Limonene.',
    allergens: ['havre', 'limonene'],
    art: 'bottle',
    artTone: 'sage',
    unitLabel: 'flaska',
    sizeLabel: '250 ml',
    vatRate: 0.25,
    popularity: 53,
    price: 69,
    packs: [
      { pack: 1, price: 69 },
      { pack: 3, price: 179 },
    ],
    measure: { amount: 0.25, unit: 'l' },
    eanBody: '73504000005',
  }),
  simple({
    slug: 'laeppbalsam',
    name: 'Läppbalsam SPF 15',
    brand: 'Hudro',
    brandSlug: 'hudro',
    category: 'skonhet',
    tagline: 'Vårdande läppbalsam med sheasmör. 4,8 g.',
    description: ['Skyddar mot sol och kyla. Parfymfri.'],
    usage: 'Applicera vid behov.',
    ingredients: 'Ricinus Communis Seed Oil, Cera Alba, Butyrospermum Parkii Butter (shea), Octocrylene, Tocopherol.',
    allergens: [],
    art: 'tube',
    artTone: 'plum',
    unitLabel: 'st',
    sizeLabel: '4,8 g',
    vatRate: 0.25,
    popularity: 39,
    price: 49,
    eanBody: '735040000066',
  }),
  simple({
    slug: 'deo-roll-on',
    name: 'Deo Roll-on Parfymfri',
    brand: 'Hudro',
    brandSlug: 'hudro',
    category: 'skonhet',
    tagline: 'Skydd i 48 timmar utan parfym. 50 ml.',
    description: ['Torkar snabbt och lämnar inga fläckar på kläderna.'],
    usage: 'Applicera på ren, torr hud.',
    ingredients: 'Aqua, Aluminum Chlorohydrate, Glycerin, Hydroxyethylcellulose, Allantoin.',
    allergens: [],
    art: 'bottle',
    artTone: 'sky',
    unitLabel: 'st',
    sizeLabel: '50 ml',
    vatRate: 0.25,
    popularity: 45,
    price: 59,
    measure: { amount: 0.05, unit: 'l' },
    eanBody: '735040000077',
  }),
];

// ---------- Exempel på prishistorik ----------
// Påhittad historik för ett år bakåt, så att prisgrafen och lagkravet om
// "lägsta pris senaste 30 dagarna" går att visa. Ersätts av riktiga priser från databasen.

/** Pågående rea i exempeldatan: nytt pris och hur många dagar sedan sänkningen gjordes. */
const DEMO_SALES: Record<string, { price: number; daysAgo: number }> = {
  'pwo-plus-blueberry-12': { price: 249, daysAgo: 6 },
  'omega-3-1': { price: 159, daysAgo: 3 },
};

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

/** Avrunda till ett pris som slutar på 9 (149, 179 …). */
const nine = (x: number) => Math.max(9, Math.round(x / 10) * 10 - 1);

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function demoHistory(v: Variant): { price: number; history: PricePoint[] } {
  const h = hash(v.id);
  const sale = DEMO_SALES[v.id];
  const base = v.price;

  // Var tredje variant har fått en prishöjning någon gång under året.
  const raisedDaysAgo = h % 3 === 0 ? 90 + (h % 120) : null;
  const regular = (daysAgo: number) => (raisedDaysAgo !== null && daysAgo > raisedDaysAgo ? nine(base * 0.93) : base);

  // En tidsbegränsad kampanj någon gång under året (20, 15 eller 10 % rabatt).
  const campaignStart = 45 + ((h >>> 3) % 260);
  const campaignEnd = campaignStart - (7 + ((h >>> 7) % 15));
  const discount = 0.8 + ((h >>> 11) % 3) * 0.05;

  const events: { daysAgo: number; price: number }[] = [
    { daysAgo: 400, price: regular(400) },
    { daysAgo: campaignStart, price: nine(regular(campaignStart) * discount) },
    { daysAgo: campaignEnd, price: regular(campaignEnd) },
  ];
  const insideCampaign = (d: number) => d <= campaignStart && d > campaignEnd;
  if (raisedDaysAgo !== null && !insideCampaign(raisedDaysAgo)) events.push({ daysAgo: raisedDaysAgo, price: base });
  if (sale) events.push({ daysAgo: sale.daysAgo, price: sale.price });

  events.sort((a, b) => b.daysAgo - a.daysAgo);
  const history: PricePoint[] = [];
  for (const e of events) {
    if (history.at(-1)?.price === e.price) continue;
    history.push({ from: isoDaysAgo(e.daysAgo), price: e.price });
  }
  return { price: sale ? sale.price : base, history };
}

// ---------- Klassificering och underkategori ----------
// Klassificeringen ska verifieras mot varje produkts etikett före lansering.
const META: Record<string, Pick<Product, 'kind' | 'subcategory' | 'warnings'>> = {
  'pwo-plus': {
    kind: 'dryck',
    subcategory: 'pre-workout',
    warnings: ['Hög koffeinhalt (300 mg per burk). Rekommenderas inte för barn eller gravida eller ammande kvinnor.'],
  },
  'kreatin-monohydrat': { kind: 'kosttillskott', subcategory: 'kreatin-och-prestation' },
  'elektrolyt-brus': { kind: 'kosttillskott', subcategory: 'kreatin-och-prestation' },
  'protein-pannkakor': { kind: 'livsmedel', subcategory: 'proteinprodukter' },
  'proteinbar-kakao': { kind: 'livsmedel', subcategory: 'proteinprodukter' },
  'shaker-600': { kind: 'redskap', subcategory: 'traningstillbehor' },
  'traningsband-set': { kind: 'redskap', subcategory: 'traningstillbehor' },
  'd-vitamin-50': { kind: 'kosttillskott', subcategory: 'vitaminer' },
  multivitamin: { kind: 'kosttillskott', subcategory: 'vitaminer' },
  'c-vitamin-brus': { kind: 'kosttillskott', subcategory: 'vitaminer' },
  'magnesium-kvall': { kind: 'kosttillskott', subcategory: 'mineraler' },
  'jarn-c': { kind: 'kosttillskott', subcategory: 'mineraler' },
  'zink-15': { kind: 'kosttillskott', subcategory: 'mineraler' },
  'omega-3': { kind: 'kosttillskott', subcategory: 'omega-3' },
  probiotika: { kind: 'kosttillskott', subcategory: 'mage-och-tarm' },
  'fuktkram-ansikte': { kind: 'kroppsvard', subcategory: 'ansiktsvard' },
  ansiktsrengoring: { kind: 'kroppsvard', subcategory: 'ansiktsvard' },
  'solskydd-50': { kind: 'kroppsvard', subcategory: 'sol-och-lappar' },
  laeppbalsam: { kind: 'kroppsvard', subcategory: 'sol-och-lappar' },
  handkram: { kind: 'kroppsvard', subcategory: 'kroppsvard' },
  'duschkram-havre': { kind: 'kroppsvard', subcategory: 'kroppsvard' },
  'deo-roll-on': { kind: 'kroppsvard', subcategory: 'kroppsvard' },
};

const withHistory = (list: Product[]): Product[] =>
  list.map((p) => ({
    ...p,
    ...META[p.slug],
    variants: p.variants.map((v) => {
      const { price, history } = demoHistory(v);
      return { ...v, price, priceHistory: history };
    }),
  }));

export const products: Product[] = withHistory([pwo, proteinPancakes, ...others]);

export const getProduct = (slug?: string) => products.find((p) => p.slug === slug);

export function findVariant(id: string): { product: Product; variant: Variant } | undefined {
  for (const product of products) {
    const variant = product.variants.find((v) => v.id === id);
    if (variant) return { product, variant };
  }
  return undefined;
}

export const getFlavour = (slug?: string) => pwoFlavours.find((f) => f.slug === slug);
