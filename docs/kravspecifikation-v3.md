# SELFIT · Funktionskarta och byggkrav

*Version 3. Nytt i v3: leverantörsoberoende lager (DSV som första 3PL, stöd för andra lager och eget lager), lag- och regelkrav, kundmejl, frakt, rabatter, returer, drift och säkerhet, designunderlag, kunder och kundtjänst, manuella order, inköpsorder, rapporter samt uppdaterad utvecklingsstatus.*

## Beslut och öppna frågor

| Område | Beslut eller förutsättning |
|---|---|
| Plattform | Egenutvecklad butik. Shopify har valts bort på grund av kostnad och onödig komplexitet. Layout och design tas fram i Replit och därefter fortsätter utvecklingen lokalt. Koden läggs i ett privat GitHub-repo som SELFIT äger, och repot kopplas redan från start. |
| Sortiment | PWO+ i färdigpackade 6-, 12- och 24-pack från leverantören. DSV plockar hela säljförpackningar. Slutliga smaker, inköpsvolymer och priser är öppna. |
| Kassa | Kustom är vald inriktning. Pris, avtalsvillkor och teståtkomst återstår. Begär pris för kort, Swish och Klarna, inklusive startavgift, fast och rörlig transaktionsavgift, månadskostnad och hur en eventuell minimiavgift beräknas. |
| Lager och logistik | Butiken är leverantörsoberoende. Inget lager hårdkodas. DSV är första 3PL-partner och kopplas via API. Det ska gå att lägga till andra 3PL-lager eller lagerföra själv utan att ändra butikens kärna (se avsnittet Lager och logistik). Bekräfta integration, teståtkomst, pris, spårning och återrapportering av batch och bäst före med DSV. |
| GS1 | Planera eget SKU och GTIN per säljbar variant. Bekräfta med DSV vem som skapar SSCC för pallen samt om GSIN behövs för sändningen. |
| Pant | **Öppen fråga.** Bekräfta om PWO+ säljs i burk eller flaska med pant. Om ja gäller kraven under Pant i avsnittet Lag- och regelkrav. |
| Frakt | **Öppen fråga.** Bekräfta om DSV bokar frakt via sina avtal eller om SELFIT har egna transportöravtal. Välj transportörer, ombud och hemleverans samt gräns för fri frakt. |
| Lönsamhet | Sätt pris per pack först när kalkylen innehåller leverantörens pris, emballage, inleverans, lagring, plock, frakt, betalning, pant om tillämpligt, svinn, retur och fasta drift- och integrationskostnader. Jämför kundbetald och fri frakt för varje packstorlek. |

## Design

Vald palett: B, mörkare plommon. Uttrycket är rent och tydligt, nära Apoteas stil.

| Roll | Färg | Används till |
|---|---|---|
| Primär | Djup plommon #4B2A6B | Loggans S, köpknappar, aktiva val och länkar |
| Text | Nästan svart #1C1622 | Brödtext, rubriker och övriga loggan |
| Bakgrund | Vit #FFFFFF | Sidans bakgrund |
| Yta | Ljusgrå #F7F5F9 | Kort, sidhuvud, sökfält och formulärytor |
| Kategori träning | Lavendel #EAE2F2 | Kategoriytor |
| Kategori hälsa | Salvia #DDE8DF | Kategoriytor |
| Kategori skönhet och kroppsvård | Sand #F0E4D6 | Kategoriytor |

Kontrast: vit text på primär 11,5:1 och text på bakgrund 18:1, vilket klarar WCAG AA med god marginal. Text på kategoriytor använder textfärgen. Färgerna ligger i gemensamma temavärden och admin väljer bland godkända kategoriaccentfärger. Sök, filter, pris och köp har samma funktion över kategorierna.

### Designunderlag att ta fram före layout

| Underlag | Krav |
|---|---|
| Logga | Vektorfil (SVG) i färg och i enfärgad version. |
| Typsnitt | Ett typsnitt för rubriker och ett för brödtext, med webblicens. |
| Bildstil | Riktlinjer för produktbilder (bakgrund, ljus, format) och miljöbilder. |
| Ikoner | En sammanhållen ikonstil för varukorg, sök, meny, leverans och liknande. |
| Brytpunkter | Mobil först. Layout för mobil, surfplatta och dator. |
| Tonläge | Hur SELFIT skriver till kunden, till exempel personligt, kort och tydligt. |

## Omfattning och referens

Funktionsgranskning av ett urval publika Apotea-sidor. Tabellen skiljer observerade mönster från SELFITs byggbeslut. Apoteas interna administration, produktdatabas och lagerkoppling utvärderades inte. Kraven för dessa delar är SELFITs egna. Prioritet 1 ingår i första säljbart fungerande version. Prioritet 2 läggs till när sortimentet eller ordervolymen motiverar det.

| Apotea-sida | Observerat | För SELFIT |
|---|---|---|
| Kosttillskott | Sök i urval, filter, sortering efter bl.a. pris och jämförpris, köp från listan | Kategori, sökning, packfilter och produktkort. Snabbköp när den exakta varianten framgår. |
| L’AURA | Varumärkesbeskrivning, kategori- och egenskapsfilter, resultaträkning | Återanvändbar mall för kategorier, varumärken och kollektioner. |
| Optimal Nordic Nutrition Kreatin | Lagerstatus, pris, jämförpris, beskrivning, användning, innehåll och fakta som EAN, klassificering och packstorlek | Egen produktmall med variantval och konsekvent placerad information. Produktens klassificering styr vilka fält som visas. |
| Prenumerationer | Engångsartiklar och återkommande köp i samma varukorg, leveransintervall | Prioritet 2. Egen orderkälla och hantering av paus, ändring och uppsägning när kassa och efterfrågan är klarlagda. |
| Betalning och vanliga frågor | Kustom-kassa, betalvillkor, spårningslänk i leveransmejl och hjälp för vanliga orderfrågor | Kustom, spårning och tydliga supportsidor. |

## Sidkarta

| Sida eller yta | Prioritet | Fält, funktioner och tillstånd |
|---|---:|---|
| Globalt sidhuvud och sidfot | 1 | Meny, sök, varukorg med antal, kontakt, leverans och villkor. Mobilmeny, tangentbordsnavigering och tydlig fokusmarkering. |
| Startsida | 1 | Huvudrubrik, bild med alternativtext, länkade kategorier och utvalda produkter. Admin kan ändra ordning och innehåll. |
| Kategori och underkategori | 1 | Namn, URL, intro, bild, överordnad kategori, brödsmulor, filter, sortering, träffantal, sidindelning och tomt läge. |
| Sökresultat | 1 | Sök på namn, smak och SKU. Visa söktermen, träffantal, filter och väg tillbaka vid noll träffar. Synonymer, stavningstolerans och förslag kan följa i prioritet 2. |
| Produktsida | 1 | Bildgalleri, namn, varumärke, variantval, pris, jämförpris där relevant, pant där relevant, tillgänglighet, köpknapp, leveransinformation, beskrivning, användning och kategorispecifika fakta. Visa slut i lager och otillgänglig variant tydligt. |
| Varukorg | 1 | Exakt smak och pack, antal, pris, pant som egen rad om tillämpligt, rabatt om aktiv, totalsumma och information om frakt, inklusive hur mycket som återstår till fri frakt. Omvalidera pris och lager före köp. Hantera tom korg och utgången produkt. |
| Kassa och orderbekräftelse | 1 | Kustom, leveransalternativ, kontakt, ordersummering och orderreferens. Information om ångerrätt och länk till köpvillkor före köp. Samtycke till nyhetsbrev är ett frivilligt, omarkerat val. Hantera väntande, godkänd och avbruten betalning samt återbesök. |
| Orderspårning | 1 | Skyddad länk, leveransstatus, transportör och spårningsnummer. Stöd flera försändelser i datamodellen. |
| Retur och ånger | 1 | Formulär för att anmäla retur eller utöva ångerrätt med ordernummer och e-post. Visar returinstruktion och status. |
| Support och innehåll | 1 | Kontakt, FAQ, frakt och leverans, retur och reklamation, ångerrätt med ångerblankett, köpvillkor, integritetsinformation och cookieinställningar. Gemensam sidmall och redigerbar text. |
| Varumärke, kampanj och guider | 2 | Introduktion, bild, produkturval, giltighetstid och internlänkar. |
| Kundkonto, omdömen och bevakning | 2 | Orderhistorik, lagerbevakning, omdömesmoderering och eventuellt återköp. Gästköp fungerar i första versionen. |
| Bekvämlighet | 2 | Senast visade produkter, sortering efter populäritet och beräknat leveransdatum ("beställ före kl. X så skickas det i dag"). |
| Försäljningsökning | 2 | Merförsäljning i varukorgen ("lägg till en shaker"), paketpriser ("3 smaker för X kr") och presentkort. |
| Fler kanaler | 2 | Produktflöde till Google Shopping, Instagram och TikTok, e-postmarknadsföring med kundgrupper samt flera språk och valutor vid försäljning utanför Sverige. |

## Variantval och produktrelationer

| Situation | Kundvy | Admin och data |
|---|---|---|
| En säljvariant | Köp direkt. Storlek eller typ visas i produktfakta. | En SKU och ett GTIN. Samma sidmall kan få fler varianter senare. |
| Smak och pack | Visa val nära köpknappen. Visa endast axlar som faktiskt varierar. | Definiera smak och pack som separata variantaxlar. Skapa endast kombinationer som säljs. |
| Flaska och refill | Visa förpackningstyp och volym som separata val när båda varierar. | Flask- och refillkombinationer som säljs får egna SKU:n, GTIN, pris och saldo. En kompatibel refill som ligger i en annan produktfamilj länkas med en relation. |
| Otillgänglig kombination | Markera val som saknas eller är slutsålda och visa varför köp inte är möjligt. Vid val uppdateras bild, pris, jämförpris, lager och köpknapp för rätt SKU. | En kombination som saknas skiljs från en aktiv variant utan saldo. Variantens URL kan förvälja rätt kombination och den valda SKU:n följer med till varukorgen. |
| Liknande produkter | Visa alternativa produkter längre ner. Länken går till respektive produktsida. | Separat relation mellan produkter. Redaktören väljer produkter och ordning. |
| Passar ihop med | Visa kompletterande produkter i en egen sektion när det finns sådana. | Separat relation för tillbehör eller kompatibla produkter. Dölj tomma sektioner. |

## Produktmodell och ägarskap

| Objekt | Attribut och regler |
|---|---|
| Produktfamilj | Stabilt ID, namn, slug, varumärke, produkttyp, kategorier, kort och lång beskrivning, media med alternativtext, publiceringsstatus och SEO-fält. En familj kan ha flera säljbara varianter. |
| Säljvariant | Stabilt variant-ID, unik intern SKU, GTIN som text, smak eller färg, packstorlek eller klädstorlek, bild, nettomängd, enhet, bruttovikt, längd, bredd, höjd, status, antal pantbelagda förpackningar och pantklass om tillämpligt. Externa artikelreferenser sparas per lagerplats i en separat tabell. Priset kopplas till varianten. |
| Pris | Belopp i öre, valuta, momsklass, eventuell giltighetstid och prishistorik. Lägsta pris senaste 30 dagarna beräknas från prishistoriken. Jämförpris beräknas från pris och relevant mängd. Orderraden sparar pris, rabatt, pant och moms vid köp. Inköpskostnad är intern. |
| Momsklass | Momssatser ligger i en admin-styrd tabell med giltighetsdatum och hårdkodas inte. Varje variant pekar på en momsklass. |
| Lager | Lagersaldo per variant och lagerplats, reserverat antal, senast uppdaterat, samt spärrat eller otillgängligt saldo där tillgängligt. Varje lagerplats är källa för sitt eget rapporterade saldo. För 3PL sker det via API och för eget lager via admin. |
| Parti och leverans | Variant, batch, bäst före, antal, status (säljbar, kortdaterad, spärrad, kasserad) och lagerreferens per parti. Leveransrader kopplas till orderrader och plockade batcher när lagret rapporterar uppgifterna. |
| Kategori och fältdefinition | Hierarki, slug, mall och valbara filter. Varje fält har typ, enhet, tillåtna värden och regler för om det krävs vid publicering. Undvik fritext för filtervärden. |
| Order och betalning | SELFIT-order-ID, kontakt och leverans, oföränderliga orderrader, totalsummor, separat betal- och leveransstatus, Kustom-ID, levererande lagerplats och lagrets orderreferens, återbetalningar och händelsehistorik. |
| Rabatt | Typ (rabattkod, automatisk kampanj eller mängdrabatt), procent eller fast belopp, giltighetstid, minsta ordervärde, max antal användningar, vilka produkter eller kategorier den gäller och om den kan kombineras med andra rabatter. |
| Retur | Retur-ID, order och orderrader, orsak, typ (ånger, reklamation), status, lagerplats och lagrets returreferens, kontrollresultat (åter i lager, kassera), återbetalat belopp och händelsehistorik. |
| Frakt | Fraktmetod, transportör, pris eller prisregel (fast, viktbaserad), gräns för fri frakt, leveransland och beräknad leveranstid. |
| Kund | Stabilt kund-ID, e-post som nyckel även vid gästköp, namn, telefon, adresser, samtycke till nyhetsbrev med tidpunkt, interna anteckningar, taggar och GDPR-status. Gästorder med samma e-post kopplas till samma kund. Förberedd för kundkonto i prioritet 2. |
| Kundärende | Ärende-ID, kund, kopplad order och retur, kanal (mejl, telefon, formulär), kategori, status (öppen, väntar, löst), meddelanden och interna anteckningar. Prioritet 2. |
| Manuell order | Order skapad av personal med orsak (ersättning, reklamation, kompensation, telefonorder), kopplad ursprungsorder, betalning valfri (0 kr för ersättning) och samma flöde till lager som vanliga order. |
| Inköpsorder | Leverantör, varianter, antal, inköpspris, förväntat leveransdatum, mottagande lager, status och koppling till inleveransavisering och mottagningsrapport. |
| Övergiven kassa | Kontaktuppgift som angetts i kassan, varukorgens innehåll, tidpunkt, samtycke och status för påminnelsemejl. |

| Produkttyp | Egna fält att stödja |
|---|---|
| Dryck och livsmedel | Ingredienser, allergener, näringsvärden och referensmängd, nettovolym/vikt, koffein när relevant, förvaring, användning, pant om tillämpligt och uppgifter från verifierad etikett. |
| Kosttillskott | Ingredienser, mängd per rekommenderad dos, daglig dos, användning, varningar och förvaring. Håll detta skilt från dryckens fält när klassificeringen skiljer sig. |
| Kroppsvård | INCI, mängd, användning, varningar och eventuell refillkompatibilitet. |
| Träningskläder | Material, färg, storlek, måttabell, passform och skötsel. |
| Redskap och tillbehör | Material, mått, vikt, användning, kompatibilitet och skötsel. |

Fältlistorna är produktkrav. Verifiera vilka uppgifter och texter som ska publiceras för varje faktisk produkt innan lansering. För PWO+ hanteras varje säljbar kombination av smak och 6-, 12- eller 24-pack som en separat SKU. Ett sålt pack motsvarar antal 1 på orderraden.

## Lager och logistik

SELFIT äger produktdata, priser, order och kundkontakt. Lagret, oavsett om det är en 3PL-partner eller SELFITs eget, sköter lagring, plock, pack, utleverans och returer.

### Princip: inget lager hårdkodas

| Krav | Beskrivning |
|---|---|
| Lagerplats som objekt | Varje lager är en post i databasen med ID, namn, typ (3PL via API eller eget lager), adress, status och inställningar. Butikens kod refererar till lagerplats-ID, aldrig till ett leverantörsnamn. |
| Gemensamt gränssnitt | Butikens kärna pratar med lager via ett gemensamt gränssnitt med samma funktioner för alla: skicka artikel, avisera inleverans, hämta saldo, skapa order, avboka order, ta emot leveransstatus och ta emot returrapport. |
| Adapter per leverantör | Varje 3PL får en egen adapter som översätter gränssnittet till leverantörens API. DSV är den första adaptern. En ny leverantör kräver en ny adapter men ingen ändring i order, varukorg, kassa eller admin. |
| Eget lager | Typen "eget lager" använder samma gränssnitt men utförs manuellt i admin: plocklista, packsedel, markera som skickad, ange transportör och spårningsnummer, registrera inleverans, batch och bäst före, samt ta emot och kontrollera returer. |
| Flera lager samtidigt | Saldo lagras per variant och lagerplats. Admin bestämmer vilket lager som levererar en order (en standardregel, med möjlighet till regler per produkt senare). Datamodellen stödjer att en order delas mellan lager, även om det inte används i första versionen. |
| Externa referenser | Artikel-, order- och returreferenser sparas per lagerplats i egna fält, till exempel extern artikelreferens för en variant hos ett visst lager. Inga leverantörsspecifika fält läggs direkt på produkt eller order. |
| Byte av lager | Ett lager kan pausas och ett annat aktiveras utan att pågående order tappas. Order som redan skickats till ett lager följer det lagret tills de är klara. |
| Hemligheter per lager | API-nycklar och inställningar sparas per lagerplats i miljövariabler eller krypterad konfiguration, aldrig i koden. |

### Flöden (gäller alla lager)

| Flöde | Riktning | Krav |
|---|---|---|
| Artikeldata | SELFIT → lager | SKU, GTIN, benämning, mått, vikt, förpackningsenhet och om batch och bäst före ska spåras. Skickas när en variant aktiveras eller ändras. |
| Inleverans | SELFIT → lager | Inleveransavisering med SKU, antal och förväntat datum när leverantören skickar varor. Lagret återrapporterar mottaget antal, batch, bäst före och avvikelser. |
| Lagersaldo | Lager → SELFIT | Regelbunden synk av tillgängligt och spärrat saldo per SKU och lagerplats. Butiken visar saldo minus reserverat. Gamla saldon flaggas i admin. |
| Order | SELFIT → lager | Skickas först när Kustom bekräftat betalningen. Innehåller SELFIT-order-ID, SKU, antal, leveransadress och fraktmetod. Samma order får aldrig skapas två gånger hos lagret. |
| Avbokning och ändring | SELFIT → lager | Försök avboka eller ändra en order som ännu inte plockats. Svaret från lagret styr om återbetalning kan göras direkt. |
| Leveransstatus | Lager → SELFIT | Plockad, packad, skickad, transportör, spårningsnummer, plockade batcher och eventuella delleveranser. Utlöser kundmejl. |
| Returer | Lager → SELFIT | Lagret tar emot returen, kontrollerar den och rapporterar per rad om varan läggs tillbaka i lager eller kasseras. SELFIT godkänner återbetalning i Kustom utifrån rapporten. |
| Bäst före | Lager | Plock enligt först-utgående-först (FEFO). Avtala minsta återstående hållbarhet vid utleverans. |

### Lagerhantering i admin

| Funktion | Krav |
|---|---|
| Lagerjustering | Saldo ändras aldrig direkt i ett fält. Varje ändring görs som en justering per variant och lagerplats med antal (plus eller minus), orsak (trasig, stöld eller svinn, ominventering, egen användning, utgånget, annat) och valfri kommentar. För 3PL-lager kommer justeringar normalt från lagrets rapporter. |
| Lagerhistorik | Logg per variant och lagerplats över varje saldoförändring: försäljning, reservation, inleverans, retur, justering, flytt och inventering, med datum, antal, saldo efteråt, orsak, referens (order, inköpsorder, retur) och vem eller vilket system som gjorde den. |
| Inventering | Starta en inventering för ett lager (helt eller urval), mata in räknat antal per variant och batch, se differens mot systemet och godkänn. Godkännandet skapar justeringar med orsak ominventering. |
| Flytt mellan lager | Flytta saldo mellan lagerplatser med status utkast, skickad (på väg), delvis mottagen och mottagen. Saldo på väg räknas inte som säljbart. För 3PL skapas en inleveransavisering hos mottagande lager. |
| Inköpspris och marginal | Inköpspris per variant (med historik) är internt och syns bara för behörig roll. Rapporterna visar bruttomarginal per produkt och variant. |
| Beställningspunkt och inköpsförslag | Beställningspunkt och önskat beställningsantal per variant och lager. När saldot inklusive inkommande går under beställningspunkten visas varianten i en lista med förslag som kan bli en inköpsorder med ett klick. |
| Bäst före-larm | Inställbart antal dagar före bäst före när ett parti markeras. Larm visas i Dagens läge och i partiöversikten. |
| Spärr för utgångna partier | Partier som passerat bäst före, eller som har mindre kvar än avtalad minsta hållbarhet, spärras automatiskt och räknas inte som säljbart saldo. Spärrade partier kan bara kasseras, returneras till leverantör eller manuellt frisläppas med orsak. |
| Rea på kortdaterat | Från partiöversikten kan ett kortdaterat parti säljas ut till rabatterat pris. Det skapar en kampanj i Rabatter kopplad till partiet, som avslutas automatiskt när partiet är slut eller spärras. Kunden ser tydligt bäst före-datum på reavaran. Lägsta pris senaste 30 dagarna gäller även här. |

### Orderhantering före leverans

| Funktion | Krav |
|---|---|
| Pausa order | En order kan pausas med orsak (misstänkt bedrägeri, kundens begäran, adressfel) så att den inte skickas till lager. Är den redan skickad till lagret görs ett försök att stoppa den där. Pausade order syns tydligt i orderlistan och Dagens läge. |
| Ändra order före plock | Byta variant, ändra antal eller adress innan ordern plockats. Prisskillnad leder till delåterbetalning eller betallänk. Ändringen loggas och lagret uppdateras. |
| Byte | I returflödet kan kunden eller personalen välja byte i stället för återbetalning. Ny vara skickas som kopplad order när returen registrerats eller tagits emot (inställbart), och prisskillnad hanteras automatiskt. |

### Första leverantör: DSV

DSV kopplas via DSVs API som första adapter. Öppna frågor till DSV: API-typ och testmiljö, synkfrekvens för lager, om frakt bokas via DSV, prismodell per order, rad, pall och retur, cut-off-tid för samma-dagsleverans och hur avvikelser rapporteras.

## Lag- och regelkrav

| Krav | Vad som ska byggas |
|---|---|
| Pant (om tillämpligt) | Pant visas och debiteras separat per pantbelagd förpackning. Ett pack med 24 burkar ger 24 × pant. Pant visas på produktsida, i varukorg, på kvitto och i orderbekräftelse och räknas inte som rabattgrundande belopp. |
| Prisinformation | Totalpris inklusive moms. Jämförpris (kr/l, kr/kg) för livsmedel och kosttillskott. Vid prissänkning visas lägsta pris de senaste 30 dagarna. |
| Ångerrätt | 14 dagars ångerrätt med information före köp, ångerblankett och bekräftelse på varaktigt medium (mejl). Undantag, till exempel brutna förseglingar på hygien- eller livsmedelsvaror, beskrivs i köpvillkoren. |
| Livsmedelsinformation | Obligatorisk information om livsmedel (ingredienser, allergener, näringsvärde med mera) visas före köp. Allergener framhävs i ingredienslistan. Verksamheten registreras hos kommunens livsmedelskontroll. |
| Hälso- och näringspåståenden | Endast godkända påståenden får användas i texter och bilder. Admin har ett fält för påståenden och en påminnelse om att granska dem före publicering. |
| GDPR | Integritetspolicy, personuppgiftsbiträdesavtal med Kustom, DSV, mejltjänst, hosting och analysverktyg. Gallringsregler för kunddata. Kunden kan begära ut och radera sina uppgifter. |
| Cookies och spårning | Ingen analys- eller marknadsföringsspårning innan kunden har samtyckt. Samtycket ska kunna ändras i efterhand. |
| Marknadsföring | Nyhetsbrev skickas endast med aktivt samtycke och varje utskick har avregistreringslänk. |
| Bokföring | Kvitto med momsspecifikation. Order, kvitton och återbetalningar sparas i 7 år. Export till bokföringsprogram (till exempel Fortnox) i prioritet 2. |
| Tillgänglighet | Målet är WCAG 2.1 nivå AA: kontraster, alternativtexter, tangentbordsnavigering och formulär som fungerar med skärmläsare. Bekräfta om tillgänglighetslagen för e-handel gäller SELFIT utifrån företagets storlek. |

## Kundkommunikation

| Händelse | Mejl till kund |
|---|---|
| Order lagd och betald | Orderbekräftelse med orderrader, pant, frakt, moms, köpvillkor och ångerinformation. |
| Order skickad | Transportör och spårningslänk. Vid delleverans anges vad som skickats. |
| Order levererad | Bekräftelse (prioritet 2: be om omdöme). |
| Retur mottagen och återbetalning | Status och återbetalt belopp. |
| Avbokad order | Bekräftelse och återbetalning. |

Mejlen skickas via en transaktionell mejltjänst med egen avsändardomän. Mallarna följer SELFITs design och är redigerbara i admin.

## Kunder och kundtjänst

Kundtjänst utgår oftast från en person. Admin ska därför samla allt om en kund på ett ställe, så att personalen inte behöver hoppa mellan admin, Kustom och lagrets portal.

| Yta | Krav |
|---|---|
| Kundlista | Sök på namn, e-post, telefon eller ordernummer. Visa antal order, totalt köpbelopp och senaste order. Filter på taggar och nyhetsbrevssamtycke. |
| Kundkort | Kontaktuppgifter och adresser, samtliga order, totalt köpbelopp och snittorder, returer och reklamationer, använda rabattkoder, samtycken, skickade mejl, interna anteckningar och taggar. Knappar för att skapa manuell order, exportera kundens uppgifter (GDPR) och radera eller anonymisera kunden med hänsyn till bokföringskrav. |
| Ordervy, utökad | Länk till kundkortet. Betalning: betalsätt (kort, Swish, Klarna), belopp, tidpunkt för auktorisering och debitering samt Kustom-referens. Uppdelning: varor, rabatt med kod och belopp, pant, frakt och moms. Återbetalningar med belopp, tidpunkt, orsak och vem som godkände. Logg över skickade mejl, lagerhändelser och interna anteckningar. |
| Manuell order och ersättning | Skapa ersättningsorder från en befintlig order (till exempel vid trasig vara) utan ny betalning, eller en telefonorder med betallänk. Orsak krävs och loggas. |
| Kundärenden | Prioritet 2. Samlar kundens frågor från mejl och formulär, kopplar dem till order och kund och visar status. I första versionen räcker interna anteckningar på kundkortet och ordern. |

## Rapporter

| Prioritet | Rapport |
|---:|---|
| 1 | Försäljning per dag, vecka och månad med antal order, omsättning exklusive moms, moms, pant, frakt, rabatter och återbetalningar. Export till CSV för bokföring. |
| 1 | Försäljning per produkt och variant samt bästsäljare. |
| 1 | Lagervärde och varianter med lågt saldo per lager. |
| 2 | Konvertering (besök till köp), övergivna kassor, återkommande kunder och rabattkodernas effekt. |

## Admin som går snabbt att använda

### Struktur och användbarhet

Admin ska vara lätt att hitta i. Varje funktion har en självklar plats, och samma sak nås inte från flera menyval med olika beteende.

| Menygrupp | Menyval och vad som finns där |
|---|---|
| Översikt | Dagens läge: order att hantera, pausade order, synkfel, lågt saldo, inköpsförslag och bäst före-larm. |
| Försäljning | Ordrar (inklusive "Ny manuell order", pausa, ändra), Returer och byten, Kunder, Rabatter (inklusive rea på kortdaterat). |
| Katalog | Produkter (varianter, inköpspris för behörig roll, relationer), Kategorier, Produkttyper och fält, Mediebibliotek. |
| Lager | Saldo (översikt per variant och lager, justering, historik, beställningspunkt), Inköp och inleveranser (inköpsorder, inköpsförslag, inleveranser), Partier och bäst före (larm, spärr, kassering, rea), Flyttar, Inventering, Plock och pack (eget lager), Lagerplatser och synk. |
| Rapporter | Försäljning, produkter och marginal, lager. |
| Inställningar | Frakt, moms och pant, mejlmallar, omdirigeringar, roller och behörigheter, ändringslogg. |

Gemensamma regler: hela raden i listor är klickbar, detaljvyer har tillbakaknapp och brödsmulor och en egen URL, sök och filter behålls vid tillbakagång, inga döda knappar, och varje vy har en tydlig huvudåtgärd.

| Prioritet | Arbetsyta | Klart när |
|---|---|---|
| 1 | Produkter och varianter | En redaktör kan skapa en produktfamilj, generera smak × pack, fylla i gemensamma uppgifter en gång och redigera varje SKU i en tabell. Dubbletter av SKU och GTIN flaggas. |
| 1 | Utkast och publicering | Förhandsvisning på mobil och dator, saknade fält visas där de ska fyllas i, publicera och arkivera. Ändring av URL skapar eller föreslår omdirigering. |
| 1 | Media, kategorier och sidor | Byt produktbilder, redigera alternativtext, ordna kategorier och ändra supportsidor utan kodändring. I produktens Media-flik kan bilder laddas upp direkt (dra och släpp eller välj fil, flera åt gången) och sparas då automatiskt i mediebiblioteket. Befintliga bilder kan väljas från biblioteket i samma dialog. Alternativtext anges vid uppladdningen och bilderna kan ordnas och markeras som huvudbild. Samma direktuppladdning gäller överallt där bilder används (kategorier, startsida, sidor). |
| 1 | Order och lager | Sök på ordernummer, e-post, SKU eller spårningsnummer. Se betalning, lagersvar, avvikelse, del-/hel återbetalning och orderhistorik på en vy. |
| 1 | Returer | Se inkomna returer, lagrets kontrollresultat och godkänn återbetalning. |
| 1 | Kunder | Kundlista och kundkort enligt avsnittet Kunder och kundtjänst. |
| 1 | Manuella order | Skapa ersättnings-, kompensations- och telefonorder med orsak. |
| 1 | Inköpsorder | Skapa inköpsorder till leverantör, följ status och koppla till inleverans i valt lager. |
| 1 | Rapporter | Rapporter enligt avsnittet Rapporter. |
| 2 | Övergivna kassor | Lista och automatiskt påminnelsemejl till kunder som angett kontaktuppgift och samtyckt, med möjlighet att stänga av. |
| 1 | Lager och leverantörer | Lägg till, pausa och aktivera lagerplatser, välj typ (3PL eller eget lager), ange standardlager och se synkstatus per lager. |
| 1 | Eget lager | Plocklista, packsedel, markera order som skickad med transportör och spårningsnummer, registrera inleverans med batch och bäst före samt hantera returer. |
| 1 | Rabatter och frakt | Skapa och avsluta rabattkoder och kampanjer. Ändra fraktpriser och gräns för fri frakt. |
| 1 | Moms och pant | Ändra momssatser och pantbelopp med giltighetsdatum. |
| 1 | Roller och logg | Begränsa behörigheter för katalog, kundservice och ekonomi. Logga vem som ändrade pris, publicerade produkt eller godkände återbetalning. Skydda åtkomst till kunddata och admin. |
| 1 | Integrationsfel | Visa senaste lyckade synk, misslyckade order och nästa försök. Operatören kan försöka igen utan dubbel leverans. |
| 2 | Massredigering och import | Importera och exportera CSV med förhandsgranskning, fel per rad och entydig matchning mot SKU. Lägg till tidstyrd publicering och kampanjer när behovet uppstår. |

## SEO och prestanda

- Serverrendera produkt- och kategorisidor med länkar som kan följas från menyn och via brödsmulor. Länka till alla indexerbara produkter utan att kunden behöver använda sök.
- Ge varje indexerbar sida unik titel, beskrivning, H1 och stabil URL. Låt admin ändra dem. Ha XML-sitemap för publicerade sidor och permanenta omdirigeringar vid URL-byte.
- Använd variantlänkar som förväljer rätt smak och pack. På en gemensam produktsida används en kanonisk URL för produktfamiljen. Publicera ProductGroup, Product och Offer med uppgifter som stämmer med sidan, samt BreadcrumbList där det passar.
- Bestäm uttryckligen vilka filtrerade URL:er som ska kunna indexeras. Intern sök, varukorg, kassa, orderspårning och admin hör inte hemma i sitemap. Skydda privata sidor med behörighetskontroll.
- Optimera bilder och mät laddning och interaktivitet på mobil. Testa länkar, indexering och strukturerad data före lansering. Lägg till Search Console och Merchant Center-flöde när publicerade produktdata är på plats.
- Besöksstatistik (till exempel GA4 eller Plausible) och konverteringsmätning startar först efter cookie-samtycke.

## Drift, säkerhet och skalbarhet

| Område | Krav |
|---|---|
| Databas | SQLite endast för lokal utveckling. Produktion körs på Postgres eller motsvarande. |
| Miljöer | Separata miljöer för utveckling, test och produktion. Test kopplas mot Kustoms och DSVs testmiljöer. |
| Hosting | Välj värd med svensk eller EU-baserad datalagring. Automatisk driftsättning från GitHub. |
| Säkerhetskopior | Daglig säkerhetskopia av databasen och test av återställning. |
| Hemligheter | API-nycklar ligger i miljövariabler och aldrig i koden eller i GitHub. |
| Admin-säkerhet | Tvåstegsinloggning för alla adminkonton och spärr efter upprepade felaktiga inloggningar. |
| Integrationssäkerhet | Inkommande meddelanden från Kustom och DSV verifieras (signatur eller nyckel) innan de behandlas. |
| Skydd | Begränsning av antal anrop mot sök, kassa och formulär. Skydd mot spam i kontakt- och returformulär. |
| Övervakning | Felövervakning med larm (till exempel Sentry) och drifttidsövervakning. Larm när en order fastnar eller lagersynken slutar fungera. |
| Bilder | Lagring i objektlagring och leverans via CDN med automatisk storleksanpassning. |

## Integrationer och acceptanstest

Kustom och varje lager får separata kopplingar till SELFITs ordermodell. Lager kopplas via det gemensamma lagergränssnittet. Kontrollera betalstatus hos Kustom innan ordern frigörs till lager. Stäm av tidpunkten för debitering med Kustom och hur DSV hanterar avbokning, delleverans, spårning och batch. Spara referenser i båda systemen och gör omförsök säkra vid upprepade meddelanden. Stäm av lagersaldon och fel så att gamla saldon eller fastnade ordrar syns i admin.

1. Skapa PWO+ i admin, lägg upp en smak och tre packstorlekar. Publicera och hitta 6-packet med sök, filter och en direkt variantlänk.
2. Lägg ett 6-pack i varukorgen. Kontrollera pris, pant om tillämpligt och lager på servern och genomför köpet i testkassan.
3. Skicka samma kassameddelande två gånger. Det ska finnas exakt en SELFIT-order och högst en lagerorder.
4. DSV får rätt SKU med antal 1. Simulera lagerfel och omförsök, och verifiera sedan leveransstatus, spårning och plockad batch när underlaget finns.
5. Prova väntande betalning, slutsåld variant, avbokning och återbetalning. Ingen order får frigöras för plock på basis av enbart kassans tack-sida.
6. Verifiera att en redaktör utan utvecklarhjälp kan uppdatera en produktsida, förhandsvisa och publicera den.
7. Publicera en produkt med en variant och verifiera att köp går direkt. Lägg sedan till flask- och refillvarianter med olika volymer. Kontrollera variantlänk, uppdaterade uppgifter, otillgängliga kombinationer och att rätt SKU hamnar i korgen.
8. Koppla en liknande produkt och en kompletterande produkt i admin. Kontrollera att länkarna går till rätt produktsidor och att tomma sektioner döljs.
9. Anmäl en retur för ett levererat 6-pack. Simulera DSVs returrapport och verifiera att återbetalningen görs i Kustom och att saldot uppdateras.
10. Sänk priset på en variant och kontrollera att lägsta pris senaste 30 dagarna visas korrekt.
11. Använd en rabattkod och kontrollera att rabatten inte påverkar pant och att moms beräknas rätt.
12. Kontrollera att orderbekräftelse och skickat-mejl skickas med rätt innehåll och spårningslänk.
13. Skapa en lagerplats av typen eget lager, gör den till standardlager och genomför ett köp. Plocka, markera som skickad i admin och verifiera att kunden får skickat-mejl. Byt tillbaka till DSV och verifiera att pågående order ligger kvar hos rätt lager.
14. Sök i koden efter leverantörsnamn. DSV får bara förekomma i DSV-adaptern och dess konfiguration.
15. Lägg två gästorder med samma e-post. Båda ska synas på samma kundkort med rätt totalbelopp, rabatter och returer.
16. Skapa en ersättningsorder från en levererad order. Den ska få 0 kr att betala, gå till lager som en vanlig order och synas på både ursprungsordern och kundkortet.
17. Exportera och anonymisera en kund. Kunddata ska tas bort eller anonymiseras medan order och kvitton som krävs för bokföringen finns kvar.
18. Kontrollera att försäljningsrapporten för en period stämmer med summan av ordrarnas varor, moms, pant, frakt, rabatter och återbetalningar.
19. Justera saldot för en variant med orsaken trasig. Justeringen ska synas i lagerhistoriken med vem, när och saldo efteråt.
20. Genomför en inventering med en differens och godkänn den. Saldot ska uppdateras och differensen loggas som ominventering.
21. Flytta saldo från eget lager till DSV. Under transporten ska saldot inte vara säljbart hos något av lagren.
22. Låt ett parti passera bäst före. Det ska spärras automatiskt och det säljbara saldot minska, och det ska inte gå att köpa mer än det säljbara saldot.
23. Skapa rea på ett kortdaterat parti. Kampanjen ska avslutas automatiskt när partiet är slut.
24. Låt saldot gå under beställningspunkten. Varianten ska dyka upp som inköpsförslag och kunna bli en inköpsorder.
25. Pausa en betald order. Den ska inte skickas till lager förrän den släpps.
26. Byt smak på en order före plock och genomför ett byte via returflödet. Prisskillnader och lagersaldon ska bli rätt.

## Utvecklingsstatus

Ingen användbar kod finns ännu. Den tidigare prototypen kasseras. Nästa steg:

1. Ta fram designunderlag (logga, typsnitt, bildstil).
2. Skapa layouten i Replit, endast design och sidmallar med exempeldata. Inga Replit-specifika tjänster för databas, inloggning eller lagring används.
3. Koppla Replit-projektet till SELFITs privata GitHub-repo.
4. Fortsätt utvecklingen lokalt: datamodell, admin, lagergränssnitt med eget lager som första enkla implementation, och därefter Kustom och DSV-adaptern i testmiljö.

Första integrationstestet är köp av ett 6-pack, verifierad betalning och exakt en lagerorder hos DSV med korrekt SKU och antal 1.

## Källor

- [Apotea: Elvital Hyaluron Plump Shampoo](https://www.apotea.se/loreal-paris-elvital-hyaluron-plump-shampoo-250-ml)
- [Apotea: Naturdiet Shake Chocolate](https://www.apotea.se/naturdiet-shake-chocolate-330-ml)
- [Apotea: Kosttillskott](https://www.apotea.se/Kosttillskott)
- [Apotea: L’AURA](https://www.apotea.se/laura)
- [Apotea: Kreatin Monohydrat](https://www.apotea.se/optimal-nordic-nutrition-kreatin-monohydrat)
- [Apotea: Prenumerationer](https://www.apotea.se/prenumerationer)
- [Apotea: Betalning](https://www.apotea.se/betalning)
- [Apotea: Vanliga frågor](https://www.apotea.se/vanliga-fragor)
- [Google Search Central: E-handels-SEO](https://developers.google.com/search/docs/specialty/ecommerce)
- [Google Search Central: Produktvarianter](https://developers.google.com/search/docs/appearance/structured-data/product-variants)
- [Kustom: Order Management](https://docs.kustom.co/order-management/)
- [DSV: Contract Logistics API](https://developer.dsv.com/guide-contract-logistics)
