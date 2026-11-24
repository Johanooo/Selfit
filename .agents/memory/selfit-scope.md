---
name: SELFITs projektavgränsning
description: Användarens stående avgränsning för butiksprototypen och framtida flytt.
---

SELFIT är en svensk butik för träning, hälsa och skönhet/kroppsvård. Första produkten är PWO+, en pre-workout-dryck i flera smaker och 6-, 12- och 24-pack.

Projektet är enbart layout och design med realistisk exempeldata i lokala JSON/TS-filer. Ingen riktig backend, betalning eller lagerintegration. Använd inte Replit DB, Replit Auth eller Replit object storage.

**Why:** Användaren vill senare flytta projektet till en lokal kodbas och kräver att det förblir flyttbart.

**How to apply:** Håll framtida ändringar inom frontendprototypens omfattning om användaren inte uttryckligen ändrar avgränsningen. All kundtext ska vara svenska, priser SEK med jämförpris per liter, och färger, typsnitt, avstånd och radier ska ha centrala CSS-variabler.

Adminen är också endast layout och design med lokal exempeldata. Ändringar i adminen får inte ändra butikens befintliga sidor eller dess produktdata.

**Why:** Användaren har upprepat att adminen är en separat designprototyp och att den riktiga logiken byggs senare i en annan kodbas.

**How to apply:** Simulera adminåtgärder lokalt och håll dem åtskilda från butiken. Föreslå inga extra tekniska förbättringar eller sidouppgifter utöver uppdraget.

Adminens användarvänlighet är huvudkravet: varje funktion ska finnas på ett ställe, med en tydlig huvudåtgärd per vy.

**Why:** Användaren har uttryckligen krävt en självklar menystruktur utan dubbletter och att arbetsytan inte blir rörig.

**How to apply:** Flytta befintliga funktioner till rätt sammanhang i stället för att lägga till parallella menyval eller dubbla arbetsflöden.
