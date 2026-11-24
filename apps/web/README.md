# SELFIT

Svensk, fristående butiksprototyp för träning, hälsa och kroppsvård.

## Avgränsning

Detta är en design- och layoutprototyp. Produkter, lager, leveranser och orderstatus är exempeldata. Kassa, rabattkod, returformulär och beställning är lokala demonstrationer. Ingen betalning genomförs, inga beställningar skickas och inga formulär skickas till en server.

Butiken använder ingen databas, autentisering, lagringstjänst eller betalningsintegration. Varukorgen kan sparas lokalt i webbläsaren. Ange inte riktiga personuppgifter när du provar formulären.

## Köra lokalt

Från projektets rot:

```sh
pnpm install
pnpm --filter @selfit/web run dev
```

Standardport är 5173. Miljövariablerna `PORT` och `BASE_PATH` är valfria och kan användas för annan port eller sökväg.

```sh
pnpm --filter @selfit/web run typecheck
pnpm --filter @selfit/web run build
pnpm --filter @selfit/web run serve
```

## Flytta till annan kodbas

Kopiera denna app och dess lokala tillgångar. Behåll appens vanliga npm-beroenden och importaliaset `@/` till `src/`. Centrala temavariabler och lokal produktdata kan flyttas med appen.

För statisk drift behöver webbservern skicka `index.html` för sidornas stabila adresser, exempelvis `/kategori/traning` och `/produkt/pwo-plus?smak=citrus&pack=6`.

Sidornas komponenter och rena data är separerade för en framtida flytt till ett serverrenderat ramverk. Den här prototypen använder klientrendering; den innehåller inte en SSR-server.

Produktbilder, näringsvärden, juridiska texter och leveransvillkor är exempel som måste ersättas och granskas före verklig försäljning.
