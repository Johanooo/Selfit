/**
 * Support- och villkorstexter. Ren data så att texten kan ändras utan att röra komponenterna.
 *
 * Allt som inte är beslutat står som [FYLL I] i COMPANY nedan. Fyll i det där en gång,
 * så uppdateras alla sidor (kontakt, köpvillkor, integritet, sidfot).
 *
 * OBS: Utkast. Låt en jurist eller Konsumentverkets checklista granska innan skarp lansering.
 */
import { FREE_SHIPPING_THRESHOLD, SHIPPING } from '@/lib/cart-math';

export const COMPANY = {
  brand: 'SELFIT',
  legalName: '[FYLL I: bolagsnamn, t.ex. SELFIT AB]',
  orgNr: '[FYLL I: org.nr]',
  vatNr: '[FYLL I: momsreg.nr, SE…01]',
  address: '[FYLL I: gatuadress, postnummer och ort]',
  email: '[FYLL I: e-post till kundtjänst]',
  phone: '[FYLL I: telefon]',
  hours: '[FYLL I: öppettider, t.ex. vardagar 09–16]',
  emailProvider: '[FYLL I: e-posttjänst för orderbekräftelser]',
  ageLimit: 18,
  dispatchDays: '1–2 vardagar',
  /** Senast uppdaterad – ändra när villkoren ändras. */
  termsUpdated: '2026-11-25',
} as const;

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

const C = COMPANY;
const kr = (n: number) => `${n} kr`;

export const supportPages: SupportPage[] = [
  {
    slug: 'kontakt',
    title: 'Kontakt',
    summary: `Kundtjänst svarar ${C.hours}.`,
    sections: [
      {
        heading: 'Så når du oss',
        paragraphs: ['Du får svar från en människa som kan våra produkter. Ha gärna ditt ordernummer till hands.'],
        list: [`E-post: ${C.email}`, `Telefon: ${C.phone} (${C.hours})`, `Postadress: ${C.legalName}, ${C.address}`],
      },
      {
        heading: 'Företagsuppgifter',
        paragraphs: [],
        list: [`Företag: ${C.legalName}`, `Organisationsnummer: ${C.orgNr}`, `Momsregistreringsnummer: ${C.vatNr}`],
      },
      {
        heading: 'Frågor om kosttillskott',
        paragraphs: [
          'Vi kan berätta vad en produkt innehåller och hur den används. Vi ger inte medicinska råd. Har du en sjukdom, tar läkemedel, är gravid eller ammar – prata med läkare eller farmaceut innan du börjar med ett kosttillskott.',
        ],
      },
    ],
  },
  {
    slug: 'om-selfit',
    title: 'Om SELFIT',
    summary: 'Tillskott för dig som tränar – med tydligt innehåll och ärliga priser.',
    sections: [
      {
        heading: 'Vilka vi är',
        paragraphs: [
          `${C.brand} är ett svenskt varumärke för träning och återhämtning. Vi säljer våra egna produkter direkt till dig, utan mellanhänder. ${C.brand} drivs av ${C.legalName}.`,
          '[FYLL I: 2–3 meningar om varför SELFIT startades och vem som står bakom.]',
        ],
      },
      {
        heading: 'Vårt sortiment',
        paragraphs: ['Vi håller sortimentet litet och genomtänkt.'],
        list: [
          'PWO+ – färdig pre workout-dryck på burk.',
          'Proteinpannkakor – snabb mix för frukost eller mellanmål.',
          'Kreatin gummies – kreatin i tuggbar form.',
          'Fler produkter kommer.',
        ],
      },
      {
        heading: 'Så jobbar vi',
        list: [
          'Hela innehållsförteckningen och näringsvärdet står på varje produktsida.',
          'Vi använder bara hälsopåståenden som är godkända av EU.',
          'Priser visas alltid inklusive moms. Pant visas separat.',
          'Vid kampanjer visar vi det lägsta priset de senaste 30 dagarna, och hela prishistoriken.',
        ],
        paragraphs: [],
      },
    ],
  },
  {
    slug: 'frakt-och-leverans',
    title: 'Frakt och leverans',
    summary: `Fri frakt över ${kr(FREE_SHIPPING_THRESHOLD)}. Vi skickar inom ${C.dispatchDays}.`,
    sections: [
      {
        heading: 'Leveranssätt och pris',
        paragraphs: ['Du väljer leveranssätt i kassan. Fraktkostnaden visas innan du betalar.'],
        list: [
          `Ombud: ${kr(SHIPPING.ombud)}`,
          `Hemleverans: ${kr(SHIPPING.hem)}`,
          `Fri frakt till ombud när du handlar för ${kr(FREE_SHIPPING_THRESHOLD)} eller mer`,
        ],
      },
      {
        heading: 'När kommer paketet?',
        paragraphs: [
          `Vi skickar din order inom ${C.dispatchDays}. Du får ett spårningsnummer via e-post när paketet har lämnat lagret. Leveranstiden efter det beror på transportören, oftast 1–3 vardagar.`,
          'Om en leverans blir försenad mer än 30 dagar har du rätt att häva köpet och få pengarna tillbaka.',
        ],
      },
      {
        heading: 'Paket som inte hämtas ut',
        paragraphs: [
          'Hämtar du inte ut paketet räknas det inte som att du ångrat köpet. Vi får då ta betalt för våra faktiska kostnader för frakt och returfrakt. Vill du ångra dig – gör det hellre via returformuläret.',
        ],
      },
    ],
    faq: [
      { q: 'Kan jag ändra leveransadress?', a: 'Ja, så länge ordern inte har skickats. Kontakta kundtjänst så snabbt som möjligt.' },
      { q: 'Levererar ni utanför Sverige?', a: 'Just nu levererar vi endast inom Sverige.' },
    ],
  },
  {
    slug: 'retur-och-angerratt',
    title: 'Retur och ångerrätt',
    summary: '14 dagars ångerrätt på oöppnade varor. Så här gör du.',
    sections: [
      {
        heading: 'Du har 14 dagars ångerrätt',
        paragraphs: [
          'Du får ångra ditt köp inom 14 dagar från den dag du (eller någon du utsett) tog emot varan. Du behöver inte ange något skäl. Har du beställt flera varor som levereras vid olika tillfällen räknas tiden från den sista leveransen.',
        ],
      },
      {
        heading: 'Undantag – öppnade förpackningar',
        paragraphs: [
          'Våra produkter är livsmedel och kosttillskott i förseglade förpackningar. Av hälso- och hygienskäl gäller ångerrätten inte om förseglingen har brutits efter leveransen (lagen om distansavtal 2 kap. 11 § punkt 5). Ångerrätten gäller inte heller varor som snabbt kan försämras eller bli för gamla (punkt 4).',
          'Det här påverkar inte din rätt att reklamera en vara som är felaktig – se nedan.',
        ],
      },
      {
        heading: 'Så ångrar du ditt köp',
        paragraphs: ['Meddela oss innan de 14 dagarna har gått. Du kan göra det på flera sätt:'],
        list: [
          'Fyll i vårt returformulär under Anmäl retur, eller',
          `skicka ett mejl till ${C.email} med ordernummer och vilka varor du ångrar, eller`,
          'använd ångerblanketten längre ner på sidan.',
        ],
      },
      {
        heading: 'Skicka tillbaka varan',
        paragraphs: [
          'Skicka tillbaka varan senast 14 dagar efter att du meddelat oss. Du står för kostnaden för returfrakten. Varan ska vara oöppnad och väl förpackad.',
          'Om varan har hanterats mer än vad som behövs för att se vad det är för vara, får vi dra av för värdeminskningen.',
        ],
      },
      {
        heading: 'Återbetalning',
        paragraphs: [
          'Vi betalar tillbaka varans pris, panten och den ursprungliga fraktkostnaden (för vårt billigaste leveranssätt) senast 14 dagar efter att vi fått ditt meddelande. Vi får vänta med återbetalningen tills vi har fått tillbaka varan, eller du visat att den är skickad. Pengarna betalas tillbaka med samma betalsätt som du använde.',
        ],
      },
      {
        heading: 'Ångerblankett',
        paragraphs: ['Kopiera texten, fyll i och mejla eller skicka den till oss.'],
        list: [
          `Till: ${C.legalName}, ${C.address}, ${C.email}`,
          'Jag meddelar härmed att jag vill frånträda mitt avtal om köp av följande varor: …',
          'Ordernummer: …',
          'Beställd den / mottagen den: …',
          'Namn: …',
          'Adress: …',
          'Datum: …',
        ],
      },
    ],
    faq: [
      { q: 'Kostar det att returnera?', a: 'Ångrar du dig betalar du returfrakten. Är varan felaktig står vi för alla kostnader.' },
      { q: 'Får jag tillbaka pant?', a: 'Ja, pant för returnerade burkar betalas tillbaka tillsammans med varans pris.' },
      { q: 'Jag har öppnat en förpackning och ångrar mig. Vad gäller?', a: 'Då gäller inte ångerrätten, eftersom förseglingen är bruten. Är varan trasig eller felaktig kan du alltid reklamera.' },
    ],
  },
  {
    slug: 'kopvillkor',
    title: 'Köpvillkor',
    summary: `Villkoren som gäller när du handlar hos ${C.brand}. Senast uppdaterade ${C.termsUpdated}.`,
    sections: [
      {
        heading: '1. Säljare',
        paragraphs: [`Säljare är ${C.legalName}, org.nr ${C.orgNr}, ${C.address}. E-post ${C.email}, telefon ${C.phone}.`],
      },
      {
        heading: '2. Vem kan handla',
        paragraphs: [
          `Du måste vara minst ${C.ageLimit} år för att handla. Vi säljer till privatpersoner med leveransadress i Sverige. Flera av våra produkter innehåller koffein och rekommenderas inte för barn eller gravida och ammande.`,
        ],
      },
      {
        heading: '3. Avtalet',
        paragraphs: [
          'Avtalet blir bindande när du har fått en orderbekräftelse via e-post. Kontrollera att uppgifterna i bekräftelsen stämmer och hör av dig direkt om något är fel. Om en vara inte finns i lager meddelar vi dig, och du får välja att vänta eller få pengarna tillbaka.',
        ],
      },
      {
        heading: '4. Priser',
        paragraphs: [
          'Alla priser anges i svenska kronor inklusive moms. Pant (1 kr per burk) visas separat. Fraktkostnaden visas i kassan innan du betalar. Vi reserverar oss för uppenbara felskrivningar av priser – då kontaktar vi dig innan ordern skickas.',
          'När ett pris sänks i en kampanj visar vi också det lägsta priset de senaste 30 dagarna före sänkningen, enligt prisinformationslagen.',
        ],
      },
      {
        heading: '5. Betalning',
        paragraphs: [
          'Betalningen hanteras av vår betalpartner Kustom. Vilka betalsätt som finns visas i kassan. För vissa betalsätt gäller betalpartnerns egna villkor, som visas i kassan.',
        ],
      },
      {
        heading: '6. Leverans',
        paragraphs: [
          `Vi skickar inom ${C.dispatchDays}. Risken för varan går över till dig när du har tagit emot den. Läs mer under Frakt och leverans.`,
        ],
      },
      {
        heading: '7. Ångerrätt',
        paragraphs: [
          'Du har 14 dagars ångerrätt enligt lagen om distansavtal. Ångerrätten gäller inte förseglade livsmedel och kosttillskott där förseglingen har brutits. Läs hela villkoren och hitta ångerblanketten under Retur och ångerrätt.',
        ],
      },
      {
        heading: '8. Reklamation (fel på varan)',
        paragraphs: [
          'Är varan trasig, felaktig eller inte som utlovat har du rätt att reklamera enligt konsumentköplagen. Du kan reklamera fel som fanns när du tog emot varan i upp till tre år. Fel som visar sig inom två år räknas som att de fanns från början, om vi inte kan visa något annat.',
          'Meddela oss inom skälig tid efter att du upptäckt felet. Inom två månader räknas alltid som i tid. Skicka ordernummer och gärna en bild. Vi står för returfrakten vid godkänd reklamation.',
          'Tänk på att livsmedel har ett bäst före-datum. Att en vara blivit sämre efter bäst före-datum räknas normalt inte som fel.',
        ],
      },
      {
        heading: '9. Personuppgifter',
        paragraphs: ['Hur vi hanterar dina personuppgifter står i vår integritetspolicy.'],
      },
      {
        heading: '10. Om vi inte kommer överens',
        paragraphs: [
          'Kontakta oss först, så försöker vi lösa det. Om vi ändå inte blir överens kan du vända dig till Allmänna reklamationsnämnden (ARN), arn.se. Vi följer ARN:s rekommendationer. Tvist kan också prövas i svensk allmän domstol.',
        ],
      },
      {
        heading: '11. Ändringar',
        paragraphs: ['Vi kan ändra villkoren. De villkor som gällde när du lade din order gäller för den ordern.'],
      },
    ],
  },
  {
    slug: 'integritet',
    title: 'Integritetspolicy',
    summary: `Hur ${C.brand} hanterar dina personuppgifter. Senast uppdaterad ${C.termsUpdated}.`,
    sections: [
      {
        heading: 'Vem ansvarar för dina uppgifter',
        paragraphs: [
          `${C.legalName} (org.nr ${C.orgNr}) är personuppgiftsansvarig. Det betyder att vi bestämmer hur dina uppgifter används och ansvarar för att det sker enligt dataskyddsförordningen (GDPR). Frågor skickar du till ${C.email}.`,
        ],
      },
      {
        heading: 'Vilka uppgifter vi samlar in',
        paragraphs: [],
        list: [
          'Namn, adress, e-post och telefonnummer – när du handlar.',
          'Orderuppgifter: vad du köpt, pris, betalsätt och leverans.',
          'Det du skriver till kundtjänst.',
          'Tekniska uppgifter (till exempel IP-adress) i serverloggar, för säkerhet.',
        ],
      },
      {
        heading: 'Varför vi använder dem och vad som ger oss rätt',
        paragraphs: [],
        list: [
          'Leverera din order, ta emot betalning och hantera returer – för att fullgöra avtalet med dig.',
          'Spara kvitton och verifikationer i 7 år – för att bokföringslagen kräver det.',
          'Svara på frågor och reklamationer, förhindra bedrägerier och hålla sidan säker – vårt berättigade intresse.',
          'Nyhetsbrev och statistik – bara om du har samtyckt. Du kan ta tillbaka samtycket när som helst.',
        ],
      },
      {
        heading: 'Vilka vi delar uppgifter med',
        paragraphs: ['Vi säljer aldrig dina uppgifter. Vi delar bara det som behövs med:'],
        list: [
          'Kustom – betalning (egen personuppgiftsansvarig för betalningen).',
          'DSV och transportören du väljer – lager och leverans.',
          'Hostinger – drift av webbplats och databas.',
          `${C.emailProvider} – utskick av orderbekräftelser och leveransbesked.`,
          'Myndigheter, om lagen kräver det.',
        ],
      },
      {
        heading: 'Var uppgifterna lagras',
        paragraphs: [
          'Vi strävar efter att lagra uppgifterna inom EU/EES. Om en leverantör behandlar uppgifter utanför EU/EES ser vi till att det finns skydd enligt GDPR, till exempel EU-kommissionens standardavtalsklausuler.',
        ],
      },
      {
        heading: 'Hur länge vi sparar uppgifterna',
        paragraphs: [],
        list: [
          'Orderuppgifter: så länge det behövs för leverans, retur och reklamation (upp till 3 år).',
          'Bokföringsunderlag: 7 år efter räkenskapsårets slut.',
          'Kundtjänstärenden: upp till 3 år.',
          'Nyhetsbrev: tills du avregistrerar dig.',
        ],
      },
      {
        heading: 'Dina rättigheter',
        paragraphs: ['Du har rätt att:'],
        list: [
          'få veta vilka uppgifter vi har om dig (registerutdrag),',
          'få felaktiga uppgifter rättade,',
          'få uppgifter raderade när vi inte längre behöver dem,',
          'begränsa eller invända mot viss behandling,',
          'få ut uppgifterna i ett maskinläsbart format (dataportabilitet),',
          'ta tillbaka ett samtycke.',
        ],
      },
      {
        heading: 'Klagomål',
        paragraphs: [
          `Hör av dig till oss på ${C.email} först. Du har också rätt att klaga hos Integritetsskyddsmyndigheten (IMY), imy.se.`,
        ],
      },
    ],
  },
  {
    slug: 'cookies',
    title: 'Cookies',
    summary: 'Vad vi sparar i din webbläsare och hur du ändrar dina val.',
    sections: [
      {
        heading: 'Vad är cookies?',
        paragraphs: [
          'Cookies och liknande tekniker (som lokal lagring) är små filer som sparas i din webbläsare. De gör att sidan kommer ihåg saker, till exempel vad du har i varukorgen.',
        ],
      },
      {
        heading: 'Nödvändiga – alltid på',
        paragraphs: ['Utan dessa fungerar inte butiken. De kräver inte samtycke.'],
        list: [
          'selfit-cart-v1 – din varukorg. Sparas tills du tömmer den.',
          'selfit-checkout-draft – det du skrivit i kassan, så det inte försvinner om du läser villkoren. Raderas när du stänger fliken.',
          'selfit-last-order – visar din orderbekräftelse efter köpet.',
          'selfit-cookies-v1 – dina cookieval. Sparas tills du ändrar dem.',
        ],
      },
      {
        heading: 'Funktionella, statistik och marknadsföring',
        paragraphs: [
          'Används bara om du säger ja. Just nu använder vi inga sådana. Om vi lägger till någon tjänst (till exempel besöksstatistik) listar vi den här först.',
        ],
      },
      {
        heading: 'Ändra dina val',
        paragraphs: [
          'Klicka på Cookieinställningar längst ner på sidan. Du kan också rensa sparade data i din webbläsares inställningar.',
        ],
      },
    ],
  },
  {
    slug: 'vanliga-fragor',
    title: 'Vanliga frågor',
    summary: 'Snabba svar på det kunder frågar oss mest.',
    sections: [],
    faq: [
      { q: 'Hur mycket koffein innehåller PWO+?', a: 'Koffeinhalten står på burken och på produktsidan. Drick inte mer än det som rekommenderas per dag.' },
      { q: 'Varför pirrar det i huden?', a: 'Beta-alanin kan ge en ofarlig, övergående stickande känsla. Den brukar gå över efter en stund.' },
      { q: 'Hur fungerar pant?', a: 'Varje burk har 1 kr pant som visas separat i varukorgen. Pantar du burken i en butik får du tillbaka beloppet.' },
      { q: 'Vad betyder jämförpris?', a: 'Jämförpriset visar vad produkten kostar per liter, kilo eller styck, så att du enkelt kan jämföra olika förpackningar.' },
      { q: 'Hur spårar jag min order?', a: 'Använd sidan Spåra order med ditt ordernummer, eller länken i leveransbeskedet.' },
      { q: 'Kan jag ångra ett köp?', a: 'Ja, inom 14 dagar om förpackningen är oöppnad. Läs mer under Retur och ångerrätt.' },
    ],
  },
];

export const getSupportPage = (slug?: string) => supportPages.find((p) => p.slug === slug);
