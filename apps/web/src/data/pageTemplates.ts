/**
 * Standardtexterna för butikens sidor (köpvillkor, integritet, retur …).
 *
 * Texterna kan skrivas om i Admin → Innehåll → Sidor och sparas då i databasen.
 * Den här filen används när en sida inte har ändrats, och för "Återställ originaltext".
 *
 * Skrivsätt i texterna:
 *  - Tom rad = nytt stycke.
 *  - Rader som börjar med "- " = punktlista.
 *  - [text](adress) = länk, t.ex. [integritetspolicy](/support/integritet).
 *  - {fält} = ersätts med företagsuppgifter och villkor, t.ex. {e-post} eller {öppet köp}.
 *
 * OBS: Utkast. Låt en jurist granska innan skarp lansering.
 */

export interface PageSection {
  heading: string;
  body: string;
}
export interface Faq {
  q: string;
  a: string;
  /** Rubrik som frågan visas under, t.ex. "Frakt och leverans". */
  category?: string;
  /** true = sparad men visas inte i butiken. */
  hidden?: boolean;
}
export interface PageContent {
  slug: string;
  title: string;
  summary: string;
  sections: PageSection[];
  faq?: Faq[];
}

export const defaultPages: PageContent[] = [
  {
    "slug": "kontakt",
    "title": "Kontakt",
    "summary": "Kundtjänst svarar {öppettider}.",
    "sections": [
      {
        "heading": "Så når du oss",
        "body": "Du får svar från en människa som kan våra produkter. Ha gärna ditt ordernummer till hands.\n\n- E-post: {e-post}\n- Telefon: {telefon} ({öppettider})\n- Postadress: {bolagsnamn}, {adress}"
      },
      {
        "heading": "Företagsuppgifter",
        "body": "- Företag: {bolagsnamn}\n- Organisationsnummer: {org.nr}\n- Momsregistreringsnummer: {momsnummer}"
      },
      {
        "heading": "Frågor om kosttillskott",
        "body": "Vi kan berätta vad en produkt innehåller och hur den används. Vi ger inte medicinska råd. Har du en sjukdom, tar läkemedel, är gravid eller ammar – prata med läkare eller farmaceut innan du börjar med ett kosttillskott."
      }
    ]
  },
  {
    "slug": "om-selfit",
    "title": "Om SELFIT",
    "summary": "Tillskott för dig som tränar – med tydligt innehåll och ärliga priser.",
    "sections": [
      {
        "heading": "Vilka vi är",
        "body": "{varumärke} är ett svenskt varumärke för träning och återhämtning. Vi säljer våra egna produkter direkt till dig, utan mellanhänder. {varumärke} drivs av {bolagsnamn}.\n\n[FYLL I: 2–3 meningar om varför SELFIT startades och vem som står bakom.]"
      },
      {
        "heading": "Vårt sortiment",
        "body": "Vi håller sortimentet litet och genomtänkt.\n\n- PWO+ – färdig pre workout-dryck på burk.\n- Proteinpannkakor – snabb mix för frukost eller mellanmål.\n- Kreatin gummies – kreatin i tuggbar form.\n- Fler produkter kommer."
      },
      {
        "heading": "Så jobbar vi",
        "body": "- Hela innehållsförteckningen och näringsvärdet står på varje produktsida.\n- Vi använder bara hälsopåståenden som är godkända av EU.\n- Priser visas alltid inklusive moms. Pant visas separat.\n- Vid kampanjer visar vi det lägsta priset de senaste 30 dagarna, och hela prishistoriken."
      }
    ]
  },
  {
    "slug": "frakt-och-leverans",
    "title": "Frakt och leverans",
    "summary": "Fri frakt över {fri frakt}. Vi skickar inom {leveranstid}.",
    "sections": [
      {
        "heading": "Leveranssätt och pris",
        "body": "Du väljer leveranssätt i kassan. Fraktkostnaden visas innan du betalar.\n\n- Ombud: {frakt ombud}\n- Hemleverans: {frakt hem}\n- Fri frakt till ombud när du handlar för {fri frakt} eller mer"
      },
      {
        "heading": "När kommer paketet?",
        "body": "Vi skickar din order inom {leveranstid}. Du får ett spårningsnummer via e-post när paketet har lämnat lagret. Leveranstiden efter det beror på transportören, oftast 1–3 vardagar.\n\nOm en leverans blir försenad mer än 30 dagar har du rätt att häva köpet och få pengarna tillbaka."
      },
      {
        "heading": "Paket som inte hämtas ut",
        "body": "Paket som inte hämtas ut skickas tillbaka till oss. Det räknas inte som att du ångrat köpet. Vi debiterar då våra faktiska kostnader för frakt, returfrakt och hantering, normalt {outhämtat paket} kr (konsumentköplagen 41 §). Vill du ångra dig – anmäl det hellre via [returformuläret](/retur), så blir det billigare för dig.\n\nOmbudet håller oftast paketet i 7–14 dagar. Paketboxar skickar tillbaka efter kortare tid."
      }
    ],
    "faq": [
      {
        "q": "Kan jag ändra leveransadress?",
        "a": "Ja, så länge ordern inte har skickats. Kontakta kundtjänst så snabbt som möjligt."
      },
      {
        "q": "Levererar ni utanför Sverige?",
        "a": "Just nu levererar vi endast inom Sverige."
      }
    ]
  },
  {
    "slug": "retur-och-angerratt",
    "title": "Retur och ångerrätt",
    "summary": "{öppet köp} dagars öppet köp på oöppnade varor. Så här gör du.",
    "sections": [
      {
        "heading": "Du har 14 dagars ångerrätt",
        "body": "Du får ångra ditt köp inom 14 dagar från den dag du (eller någon du utsett) tog emot varan. Du behöver inte ange något skäl. Har du beställt flera varor som levereras vid olika tillfällen räknas tiden från den sista leveransen."
      },
      {
        "heading": "{öppet köp} dagars öppet köp",
        "body": "Utöver ångerrätten har du {öppet köp} dagars öppet köp från leveransdagen. Öppet köp är ett frivilligt erbjudande från oss och gäller när varan är oöppnad, oskadad och i originalförpackning med förseglingen kvar.\n\nÖppet köp gäller inte varor som sålts till nedsatt pris på grund av kort bäst före-datum. Vid upprepade returer eller misstänkt missbruk kan vi neka öppet köp. Din lagstadgade ångerrätt på 14 dagar påverkas inte."
      },
      {
        "heading": "Undantag – öppnade förpackningar",
        "body": "Våra produkter är livsmedel och kosttillskott i förseglade förpackningar. Av hälso- och hygienskäl gäller ångerrätten inte om förseglingen har brutits efter leveransen (lagen om distansavtal 2 kap. 11 § punkt 5). Ångerrätten gäller inte heller varor som snabbt kan försämras eller bli för gamla (punkt 4).\n\nDet här påverkar inte din rätt att reklamera en vara som är felaktig – se nedan."
      },
      {
        "heading": "Så ångrar du ditt köp",
        "body": "Meddela oss innan de 14 dagarna har gått. Du kan göra det på flera sätt:\n\n- fyll i [returformuläret](/retur), eller\n- skicka ett mejl till {e-post} med ordernummer och vilka varor du ångrar, eller\n- använd ångerblanketten längre ner på sidan."
      },
      {
        "heading": "Skicka tillbaka varan",
        "body": "Skicka tillbaka varan senast 14 dagar efter att du meddelat oss. Returfrakten betalar du själv. Använder du vår returetikett drar vi {returavgift} kr från återbetalningen. Varan ska vara oöppnad och väl förpackad.\n\nSpara kvittot och kollinumret från ombudet. Det är ditt bevis på att paketet är skickat. Returer som skickas utan att ha anmälts tar längre tid att hantera.\n\nOm varan har hanterats mer än vad som behövs för att se vad det är för vara, får vi dra av för värdeminskningen."
      },
      {
        "heading": "Återbetalning",
        "body": "Vi betalar tillbaka varans pris, panten och den ursprungliga fraktkostnaden (för vårt billigaste leveranssätt) senast 14 dagar efter att vi fått ditt meddelande. Vi kontrollerar varan när den kommer tillbaka och väntar med återbetalningen tills vi har fått den, eller du visat att den är skickad. Pengarna betalas tillbaka med samma betalsätt som du använde.\n\nVid öppet köp (dag 15–{öppet köp}) återbetalar vi varans pris och pant när vi har tagit emot och godkänt varan. Den ursprungliga frakten återbetalas inte."
      },
      {
        "heading": "Ångerblankett",
        "body": "Kopiera texten, fyll i och mejla eller skicka den till oss.\n\n- Till: {bolagsnamn}, {adress}, {e-post}\n- Jag meddelar härmed att jag vill frånträda mitt avtal om köp av följande varor: …\n- Ordernummer: …\n- Beställd den / mottagen den: …\n- Namn: …\n- Adress: …\n- Datum: …"
      }
    ],
    "faq": [
      {
        "q": "Kostar det att returnera?",
        "a": "Ångrar du dig drar vi {returavgift} kr för returfrakten. Är varan felaktig står vi för alla kostnader."
      },
      {
        "q": "Hur byter jag en vara?",
        "a": "Returnera varan och lägg en ny beställning. Det går snabbast så."
      },
      {
        "q": "Får jag tillbaka pant?",
        "a": "Ja, pant för returnerade burkar betalas tillbaka tillsammans med varans pris."
      },
      {
        "q": "Jag har öppnat en förpackning och ångrar mig. Vad gäller?",
        "a": "Då gäller inte ångerrätten, eftersom förseglingen är bruten. Är varan trasig eller felaktig kan du alltid reklamera."
      }
    ]
  },
  {
    "slug": "kopvillkor",
    "title": "Köpvillkor",
    "summary": "Villkoren som gäller när du handlar hos {varumärke}. Senast uppdaterade {villkorsdatum}.",
    "sections": [
      {
        "heading": "1. Säljare",
        "body": "Säljare är {bolagsnamn}, org.nr {org.nr}, {adress}. E-post {e-post}, telefon {telefon}."
      },
      {
        "heading": "2. Vem kan handla",
        "body": "Du ska vara minst {åldersgräns} år för att handla, eller ha målsmans godkännande. Genom att lägga en order intygar du detta. Vi säljer till privatpersoner med leveransadress i Sverige.\n\nFlera av våra produkter innehåller koffein. De rekommenderas inte för barn och ungdomar under 16 år, gravida eller ammande. Vi säljer inte koffeinprodukter till personer under 15 år. Vid misstanke om att köparen är för ung kan vi stoppa ordern och betala tillbaka pengarna."
      },
      {
        "heading": "3. Avtalet",
        "body": "Avtalet blir bindande när du har fått en orderbekräftelse via e-post. Kontrollera att uppgifterna i bekräftelsen stämmer och hör av dig direkt om något är fel. Om en vara inte finns i lager meddelar vi dig, och du får välja att vänta eller få pengarna tillbaka.\n\nVi kan behöva kontrollera en order innan den skickas, till exempel vid ovanligt stora köp eller om leveransadressen inte stämmer med betalningen. Vid misstanke om bedrägeri eller missbruk har vi rätt att stoppa eller häva ordern. Redan betalda belopp betalas då tillbaka. Bedrägeriförsök polisanmäls.\n\nVi kan begränsa hur många av en vara man får köpa per order eller hushåll, till exempel vid kampanjer."
      },
      {
        "heading": "4. Priser",
        "body": "Alla priser anges i svenska kronor inklusive moms. Pant (1 kr per burk) visas separat. Fraktkostnaden visas i kassan innan du betalar. Vi reserverar oss för uppenbara felskrivningar av priser – då kontaktar vi dig innan ordern skickas.\n\nNär ett pris sänks i en kampanj visar vi också det lägsta priset de senaste 30 dagarna före sänkningen, enligt prisinformationslagen.\n\nRabattkoder gäller under angiven tid och kan inte kombineras med varandra. Om en kod gäller redan nedsatta varor står det i erbjudandet. Har du glömt koden kan vi lägga till den så länge ordern inte är skickad. Rabattkoder kan inte bytas mot pengar."
      },
      {
        "heading": "5. Betalning",
        "body": "Betalningen hanteras av vår betalpartner Kustom. Vilka betalsätt som finns visas i kassan. För vissa betalsätt gäller betalpartnerns egna villkor, som visas i kassan."
      },
      {
        "heading": "6. Leverans",
        "body": "Vi skickar inom {leveranstid}. Risken för varan går över till dig när du har tagit emot den. Läs mer under [Frakt och leverans](/support/frakt-och-leverans)."
      },
      {
        "heading": "7. Ångerrätt och öppet köp",
        "body": "Du har 14 dagars ångerrätt enligt lagen om distansavtal och {öppet köp} dagars öppet köp på oöppnade varor. Ångerrätten gäller inte förseglade livsmedel och kosttillskott där förseglingen har brutits. Vid ånger drar vi {returavgift} kr för returfrakt om du använder vår returetikett. Läs hela villkoren och hitta ångerblanketten under [Retur och ångerrätt](/support/retur-och-angerratt)."
      },
      {
        "heading": "8. Reklamation (fel på varan)",
        "body": "Är varan trasig, felaktig eller inte som utlovat har du rätt att reklamera enligt konsumentköplagen. Du kan reklamera fel som fanns när du tog emot varan i upp till tre år. Fel som visar sig inom två år räknas som att de fanns från början, om vi inte kan visa något annat.\n\nMeddela oss inom skälig tid efter att du upptäckt felet. Inom två månader räknas alltid som i tid. Vi står för returfrakten vid godkänd reklamation.\n\nSå går det snabbast: skicka ordernummer, en kort beskrivning av felet och en bild på varan, förpackningen och bäst före-datum/batchnummer. Spara varan tills ärendet är klart. Du får hjälp även utan bild, men då behöver vi oftast få tillbaka varan för att undersöka den, och det tar längre tid.\n\nTänk på att livsmedel har ett bäst före-datum. Att en vara blivit sämre efter bäst före-datum räknas normalt inte som fel."
      },
      {
        "heading": "9. Utebliven eller försenad leverans",
        "body": "Paket som inte hämtas ut skickas tillbaka till oss. Vi debiterar då våra faktiska kostnader, normalt {outhämtat paket} kr. Vid försening har du de rättigheter som konsumentköplagen ger, till exempel att häva köpet om leveransen dröjer väsentligt. Vi ansvarar inte för förseningar orsakade av omständigheter utanför vår kontroll, till exempel strejk, extremväder eller störningar hos transportören."
      },
      {
        "heading": "10. Personuppgifter",
        "body": "Hur vi hanterar dina personuppgifter står i vår [integritetspolicy](/support/integritet)."
      },
      {
        "heading": "11. Om vi inte kommer överens",
        "body": "[Kontakta oss](/support/kontakt) först, så försöker vi lösa det. Om vi ändå inte blir överens kan du vända dig till [Allmänna reklamationsnämnden (ARN)](https://www.arn.se). Vi följer ARN:s rekommendationer. Tvist kan också prövas i svensk allmän domstol."
      },
      {
        "heading": "12. Ändringar",
        "body": "Vi kan ändra villkoren. De villkor som gällde när du lade din order gäller för den ordern."
      }
    ]
  },
  {
    "slug": "integritet",
    "title": "Integritetspolicy",
    "summary": "Hur {varumärke} hanterar dina personuppgifter. Senast uppdaterad {villkorsdatum}.",
    "sections": [
      {
        "heading": "Vem ansvarar för dina uppgifter",
        "body": "{bolagsnamn} (org.nr {org.nr}) är personuppgiftsansvarig. Det betyder att vi bestämmer hur dina uppgifter används och ansvarar för att det sker enligt dataskyddsförordningen (GDPR). Frågor skickar du till {e-post}."
      },
      {
        "heading": "Vilka uppgifter vi samlar in",
        "body": "- Namn, adress, e-post och telefonnummer – när du handlar.\n- Orderuppgifter: vad du köpt, pris, betalsätt och leverans.\n- Det du skriver till kundtjänst.\n- Tekniska uppgifter (till exempel IP-adress) i serverloggar, för säkerhet."
      },
      {
        "heading": "Varför vi använder dem och vad som ger oss rätt",
        "body": "- Leverera din order, ta emot betalning och hantera returer – för att fullgöra avtalet med dig.\n- Spara kvitton och verifikationer i 7 år – för att bokföringslagen kräver det.\n- Svara på frågor och reklamationer, förhindra bedrägerier och hålla sidan säker – vårt berättigade intresse.\n- Nyhetsbrev och statistik – bara om du har samtyckt. Du kan ta tillbaka samtycket när som helst."
      },
      {
        "heading": "Vilka vi delar uppgifter med",
        "body": "Vi säljer aldrig dina uppgifter. Vi delar bara det som behövs med:\n\n- Kustom – betalning (egen personuppgiftsansvarig för betalningen).\n- DSV och transportören du väljer – lager och leverans.\n- Hostinger – drift av webbplats och databas.\n- {e-posttjänst} – utskick av orderbekräftelser och leveransbesked.\n- Myndigheter, om lagen kräver det."
      },
      {
        "heading": "Var uppgifterna lagras",
        "body": "Vi strävar efter att lagra uppgifterna inom EU/EES. Om en leverantör behandlar uppgifter utanför EU/EES ser vi till att det finns skydd enligt GDPR, till exempel EU-kommissionens standardavtalsklausuler."
      },
      {
        "heading": "Hur länge vi sparar uppgifterna",
        "body": "- Orderuppgifter: så länge det behövs för leverans, retur och reklamation (upp till 3 år).\n- Bokföringsunderlag: 7 år efter räkenskapsårets slut.\n- Kundtjänstärenden: upp till 3 år.\n- Nyhetsbrev: tills du avregistrerar dig."
      },
      {
        "heading": "Dina rättigheter",
        "body": "Du har rätt att:\n\n- få veta vilka uppgifter vi har om dig (registerutdrag),\n- få felaktiga uppgifter rättade,\n- få uppgifter raderade när vi inte längre behöver dem,\n- begränsa eller invända mot viss behandling,\n- få ut uppgifterna i ett maskinläsbart format (dataportabilitet),\n- ta tillbaka ett samtycke."
      },
      {
        "heading": "Klagomål",
        "body": "Hör av dig till oss på {e-post} först. Du har också rätt att klaga hos [Integritetsskyddsmyndigheten (IMY)](https://www.imy.se)."
      }
    ]
  },
  {
    "slug": "cookies",
    "title": "Cookies",
    "summary": "Vad vi sparar i din webbläsare och hur du ändrar dina val.",
    "sections": [
      {
        "heading": "Vad är cookies?",
        "body": "Cookies och liknande tekniker (som lokal lagring) är små filer som sparas i din webbläsare. De gör att sidan kommer ihåg saker, till exempel vad du har i varukorgen."
      },
      {
        "heading": "Nödvändiga – alltid på",
        "body": "Utan dessa fungerar inte butiken. De kräver inte samtycke.\n\n- selfit-cart-v1 – din varukorg. Sparas tills du tömmer den.\n- selfit-checkout-draft – det du skrivit i kassan, så det inte försvinner om du läser villkoren. Raderas när du stänger fliken.\n- selfit-last-order – visar din orderbekräftelse efter köpet.\n- selfit-cookies-v1 – dina cookieval. Sparas tills du ändrar dem."
      },
      {
        "heading": "Funktionella, statistik och marknadsföring",
        "body": "Används bara om du säger ja. Just nu använder vi inga sådana. Om vi lägger till någon tjänst (till exempel besöksstatistik) listar vi den här först."
      },
      {
        "heading": "Ändra dina val",
        "body": "Klicka på [Cookieinställningar](#cookieinstallningar) här, eller längst ner på varje sida. Du kan också rensa sparade data i din webbläsares inställningar."
      }
    ]
  },
  {
    "slug": "vanliga-fragor",
    "title": "Vanliga frågor",
    "summary": "Snabba svar på det kunder frågar oss mest.",
    "sections": [],
    "faq": [
      {
        "q": "Hur mycket koffein innehåller PWO+?",
        "category": "PWO+",
        "a": "Koffeinhalten står på burken och på produktsidan. Drick inte mer än det som rekommenderas per dag."
      },
      {
        "q": "Varför pirrar det i huden?",
        "category": "PWO+",
        "a": "Beta-alanin kan ge en ofarlig, övergående stickande känsla. Den brukar gå över efter en stund."
      },
      {
        "q": "Hur fungerar pant?",
        "category": "Priser och pant",
        "a": "Varje burk har 1 kr pant som visas separat i varukorgen. Pantar du burken i en butik får du tillbaka beloppet."
      },
      {
        "q": "Vad betyder jämförpris?",
        "category": "Priser och pant",
        "a": "Jämförpriset visar vad produkten kostar per liter, kilo eller styck, så att du enkelt kan jämföra olika förpackningar."
      },
      {
        "q": "Hur spårar jag min order?",
        "category": "Order och leverans",
        "a": "Använd sidan [Spåra order](/ordersparning) med ditt ordernummer, eller länken i leveransbeskedet."
      },
      {
        "q": "Kan jag ångra ett köp?",
        "category": "Retur och reklamation",
        "a": "Ja, du har {öppet köp} dagars öppet köp om förpackningen är oöppnad. Läs mer under [Retur och ångerrätt](/support/retur-och-angerratt)."
      },
      {
        "q": "Varan är trasig. Vad gör jag?",
        "category": "Retur och reklamation",
        "a": "Kontakta kundtjänst med ordernummer och en bild på varan och bäst före-datumet. Med bild kan vi oftast lösa det direkt, utan att du behöver skicka tillbaka något."
      }
    ]
  }
];

export const getDefaultPage = (slug: string) => defaultPages.find((p) => p.slug === slug);
