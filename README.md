# SELFIT

Egenutvecklad webbutik för träning, hälsa och kroppsvård. Kraven finns i [docs/kravspecifikation-v3.md](docs/kravspecifikation-v3.md).

## Struktur

| Mapp | Vad det är |
|---|---|
| `apps/web` | Butiken och admin (React + Vite). Använder fortfarande lokal exempeldata i `src/data`. |
| `apps/api` | Servern (Hono) och databasen (Drizzle). SQLite lokalt, Postgres i produktion. |
| `docs` | Kravspecifikation och övrig dokumentation. |

## Kom igång

Kräver Node 22 eller senare och pnpm (`corepack enable` aktiverar pnpm).

```sh
pnpm install      # installera paket
pnpm db:reset     # skapa lokal databas och fyll den med exempeldata
pnpm dev          # starta server (port 3001) och butik (port 5173)
```

Öppna http://localhost:5173 för butiken, http://localhost:5173/admin för admin och http://localhost:3001/api/health för servern.

## Övriga kommandon

```sh
pnpm test         # kör tester
pnpm start        # kör den byggda versionen (efter pnpm build)
pnpm typecheck    # typkontroll
pnpm build        # bygg allt

pnpm --filter @selfit/api run db:generate   # ny migrering efter ändring i src/db/schema.ts
pnpm --filter @selfit/api run db:migrate    # kör migreringar
pnpm --filter @selfit/api run db:reset      # töm och fyll databasen igen
```

## Testversion hos Hostinger

I produktion kör allt som en app: servern visar både API:t och butikens sidor.

Inställningar i Hostinger (Webbplatser → Skapa webbplats → Web App → Importera Git-repo):

| Inställning | Värde |
|---|---|
| Framework preset | Other |
| Root directory | `/` (repots rot) |
| Branch | `main` |
| Node version | 22.x |
| Package manager | pnpm |
| Build command | `pnpm build` |
| Output directory | (tomt) |
| Entry file | `apps/api/dist/server.mjs` |

Miljövariabler:

| Namn | Värde |
|---|---|
| `SITE_PASSWORD` | ett lösenord, så att testversionen inte är öppen för alla (användarnamn: `selfit`) |
| `SEED_IF_EMPTY` | `true` |
| `NODE_ENV` | `production` |

Hostinger skriver över filerna vid varje uppdatering, så testdatabasen nollställs och fylls med exempeldata igen. En riktig databas (MySQL hos Hostinger eller Postgres hos annan leverantör) behövs innan butiken tar emot riktiga order.

## API (hittills)

| Anrop | Beskrivning |
|---|---|
| `GET /api/health` | Kontroll att servern lever |
| `GET /api/categories`, `/api/brands`, `/api/collections` | Katalogstruktur |
| `GET /api/products?category=&brand=&collection=&q=` | Produktlista med från-pris och lagerstatus |
| `GET /api/products/:slug` | Produkt med varianter, pris, jämförpris, lägsta 30-dagarspris, moms och saldo |
| `GET /api/shipping-methods` | Fraktsätt |
| `POST /api/cart/quote` | Räknar om varukorgen på servern (pris, pant, frakt, moms, saldo) |

Alla belopp är i öre (`14900` = 149 kr).

## Principer

- Belopp lagras i öre som heltal.
- Momssatser och pant ligger i databasen med giltighetsdatum, inte i koden.
- Inget lager hårdkodas: saldo lagras per variant och lagerplats, och varje ändring loggas i lagerhistoriken.
- Hemligheter (API-nycklar) ligger i `.env`, aldrig i koden. Se `apps/api/.env.example`.
