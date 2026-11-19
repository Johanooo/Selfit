# SELFIT

Svensk butiksprototyp för träning, hälsa och skönhet/kroppsvård, med PWO+ som första produkt.

## Avgränsning

SELFIT är en flyttbar designprototyp med lokal exempeldata. Projektet saknar backend; varukorg, kassa och orderstatus är endast demonstrationer. Inga riktiga köp, betalningar eller lagerkopplingar genomförs.

Mockup-sandboxen är en separat designförhandsvisning och inte en del av SELFIT-butiken.

## Källfiler

- Tema och CSS-variabler: `artifacts/selfit/src/index.css`
- Lokal produkt- och variantdata: `artifacts/selfit/src/data/products.ts`
- Kategoridata: `artifacts/selfit/src/data/categories.ts`
- Butikens sidor och komponenter: `artifacts/selfit/src/`

## Köra och kontrollera butiken

- `pnpm --filter @workspace/selfit run dev` — starta SELFIT-förhandsvisningen
- `pnpm --filter @workspace/selfit run typecheck` — typkontrollera butiken
- `pnpm --filter @workspace/selfit run build` — bygg butikens statiska frontend
- `pnpm run typecheck` — typkontrollera kvarvarande workspace-paket

## Teknik

pnpm-workspace, Node.js 24, TypeScript, React och Vite. Butiken läser exempeldata från vanliga lokala TypeScript-filer och behöver ingen tjänst eller databas.
