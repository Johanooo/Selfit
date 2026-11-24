# Arbetsregler för SELFIT

- Kravspecen i `docs/kravspecifikation-v3.md` är styrande. Hänvisa till dess avsnitt vid beslut.
- All text som kunden eller admin ser skrivs på svenska.
- Belopp i öre som heltal. Momssats i baspunkter (12 % = 1200). Inga momssatser eller pantbelopp i koden.
- Leverantörsnamn (t.ex. DSV) får bara förekomma i respektive lageradapter och dess konfiguration (acceptanstest 14).
- Lagersaldo ändras aldrig direkt, alltid via en rad i `stock_ledger`.
- Färger, typsnitt, avstånd och radier ligger som CSS-variabler i `apps/web/src/index.css`.
- Admin: varje funktion har en plats i menyn och varje vy har en tydlig huvudåtgärd.
- Ändring i `apps/api/src/db/schema.ts` → kör `db:generate` och committa migreringen.
