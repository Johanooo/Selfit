/**
 * Support content. Plain data so copy can be edited without touching
 * components. Each page renders sections and an optional FAQ.
 */
export interface SupportSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}
export interface Faq {
  q: string;
  a: string;
}
export interface SupportPage {
  slug: string;
  title: string;
  summary: string;
  sections: SupportSection[];
  faq?: Faq[];
}

export const supportPages: SupportPage[] = [
  {
    slug: 'kontakt',
    title: 'Kontakt',
    summary: 'Kundtjänst svarar vardagar 08–17. Oftast inom två timmar.',
    sections: [
      {
        heading: 'Så når du oss',
        paragraphs: ['Vi har ingen chattbot. Du får svar från en människa som kan våra produkter.'],
        list: ['E-post: kundtjanst@selfit.se', 'Telefon: 010-123 45 67 (vardagar 08–17)', 'Postadress: SELFIT AB, Box 1234, 111 22 Stockholm'],
      },
      {
        heading: 'Frågor om kosttillskott',
        paragraphs: [
          'Vi kan berätta vad en produkt innehåller och hur den används. Har du en sjukdom, tar läkemedel eller är gravid – prata alltid med läkare eller farmaceut innan du börjar med ett kosttillskott.',
        ],
      },
    ],
  },
  {
    slug: 'frakt-och-leverans',
    title: 'Frakt och leverans',
    summary: 'Fri frakt över 499 kr. Vi skickar inom 1–2 vardagar.',
    sections: [
      {
        heading: 'Leveranssätt',
        paragraphs: ['Välj det som passar dig i kassan.'],
        list: ['Ombud: 49 kr, 1–3 vardagar', 'Hemleverans kväll: 79 kr, 1–2 vardagar', 'Fri frakt till ombud när du handlar för 499 kr eller mer'],
      },
      {
        heading: 'När skickas min order?',
        paragraphs: [
          'Beställningar som läggs före klockan 14 på vardagar plockas samma dag. Du får ett spårningsnummer via e-post när paketet lämnat lagret.',
        ],
      },
    ],
    faq: [
      { q: 'Kan jag ändra leveransadress?', a: 'Ja, så länge ordern inte har plockats. Kontakta kundtjänst så snabbt som möjligt.' },
      { q: 'Levererar ni utanför Sverige?', a: 'Just nu levererar vi endast inom Sverige.' },
    ],
  },
  {
    slug: 'retur-och-angerratt',
    title: 'Retur och ångerrätt',
    summary: '14 dagars ångerrätt enligt lag och 30 dagars öppet köp på oöppnade varor.',
    sections: [
      {
        heading: 'Ångerrätt',
        paragraphs: [
          'Du har 14 dagars ångerrätt från den dag du tog emot varan. Av hygien- och säkerhetsskäl gäller ångerrätten endast oöppnade förpackningar för kosttillskott, livsmedel och hudvård.',
        ],
      },
      {
        heading: 'Så returnerar du',
        paragraphs: ['Anmäl returen via vårt returformulär så skickar vi en returetikett. Pengarna återbetalas inom 5 vardagar efter att vi tagit emot returen.'],
      },
    ],
    faq: [
      { q: 'Kostar det att returnera?', a: 'Returen är kostnadsfri om varan är felaktig. Vid ånger dras 49 kr för returfrakt.' },
      { q: 'Får jag tillbaka pant?', a: 'Ja, pant för returnerade burkar återbetalas tillsammans med varans pris.' },
    ],
  },
  {
    slug: 'kopvillkor',
    title: 'Köpvillkor',
    summary: 'Villkoren som gäller när du handlar hos SELFIT.',
    sections: [
      {
        heading: 'Priser',
        paragraphs: [
          'Alla priser anges i svenska kronor inklusive moms. Pant för burkar redovisas separat och ingår inte i varans pris.',
        ],
      },
      {
        heading: 'Åldersgräns',
        paragraphs: ['Du behöver vara 18 år för att handla. PWO+ innehåller koffein och rekommenderas inte för barn.'],
      },
      {
        heading: 'Reklamation',
        paragraphs: ['Du har tre års reklamationsrätt enligt konsumentköplagen. Kontakta kundtjänst med ordernummer och en bild på felet.'],
      },
    ],
  },
  {
    slug: 'integritet',
    title: 'Integritet',
    summary: 'Hur vi hanterar personuppgifter, kort och tydligt.',
    sections: [
      {
        heading: 'Vad vi sparar',
        paragraphs: [
          'Vi sparar de uppgifter som behövs för att leverera din order: namn, adress, e-post och telefonnummer. Uppgifterna används inte för något annat utan ditt samtycke.',
        ],
      },
      {
        heading: 'Den här demon',
        paragraphs: [
          'Denna version av SELFIT är en designprototyp. Inga personuppgifter skickas eller sparas. Varukorgen sparas endast lokalt i din webbläsare och innehåller inga personuppgifter.',
        ],
      },
    ],
  },
  {
    slug: 'cookies',
    title: 'Cookies',
    summary: 'Vilka cookies vi använder och hur du ändrar dina val.',
    sections: [
      {
        heading: 'Nödvändiga',
        paragraphs: ['Krävs för att varukorgen och dina cookieval ska fungera. Kan inte stängas av.'],
      },
      {
        heading: 'Funktionella, statistik och marknadsföring',
        paragraphs: ['Används endast om du godkänner dem. Du kan ändra dina val när som helst via länken Cookieinställningar längst ner på sidan.'],
      },
    ],
  },
  {
    slug: 'vanliga-fragor',
    title: 'Vanliga frågor',
    summary: 'Snabba svar på det kunder frågar oss mest.',
    sections: [],
    faq: [
      { q: 'Hur mycket koffein innehåller PWO+?', a: 'Produktbilden visar 300 mg koffein per 330 ml-burk. Läs alltid informationen på förpackningen före användning.' },
      { q: 'Varför pirrar det i huden?', a: 'Beta-alanin kan ge en ofarlig, övergående stickande känsla. Den brukar avta efter 15–30 minuter.' },
      { q: 'Hur fungerar pant?', a: 'Varje burk har 1 kr pant som visas separat i varukorgen. Pantar du burken i en butik får du tillbaka beloppet.' },
      { q: 'Vad betyder jämförpris?', a: 'Jämförpriset visar vad produkten kostar per liter, kilo eller styck, så att du enkelt kan jämföra olika förpackningar.' },
      { q: 'Hur spårar jag min order?', a: 'Använd sidan Orderspårning med ditt ordernummer, eller länken i leveransbekräftelsen.' },
    ],
  },
];

export const getSupportPage = (slug?: string) => supportPages.find((p) => p.slug === slug);
