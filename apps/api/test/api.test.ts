import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { createDb, type Db } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrate.ts';
import { seed } from '../src/db/seed.ts';
import * as s from '../src/db/schema.ts';
import { lowestPrice30Days } from '../src/lib/pricing.ts';
import { quoteCart } from '../src/routes/cart.ts';

let db: Db;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'selfit-'));
  db = createDb(`file:${join(dir, 'test.db')}`);
  await runMigrations(db);
  await seed(db);
  app = createApp(db);
});

const get = async (path: string) => {
  const res = await app.request(`/api${path}`);
  return { status: res.status, body: (await res.json()) as any };
};

describe('katalog', () => {
  it('hittar PWO+ via sök på smak och via kategori', async () => {
    const bySearch = await get(`/products?q=${encodeURIComponent('Blåbär')}`);
    expect(bySearch.body.map((p: any) => p.slug)).toContain('pwo-plus');
    const byCategory = await get('/products?category=drycker');
    expect(byCategory.body.map((p: any) => p.slug)).toContain('pwo-plus');
    expect(byCategory.body.every((p: any) => p.slug !== 'handkram')).toBe(true);
  });

  it('visar varianter med pris i öre, jämförpris och saldo', async () => {
    const { status, body } = await get('/products/pwo-plus');
    expect(status).toBe(200);
    expect(body.variants).toHaveLength(18);
    const six = body.variants.find((v: any) => v.id === 'pwo-plus-blueberry-6');
    expect(six.priceOre).toBe(14900);
    expect(six.netAmount).toBeCloseTo(1.98);
    expect(six.comparePriceOre).toBe(7525); // 149 kr / 1,98 l ≈ 75,25 kr/l
    expect(six.available).toBeGreaterThan(0);
    const missing = body.variants.find((v: any) => v.id === 'pwo-plus-black-edition-24');
    expect(missing.status).toBe('not_offered');
    expect(missing.available).toBe(0);
  });

  it('svarar 404 för okänd produkt', async () => {
    expect((await get('/products/finns-inte')).status).toBe(404);
  });
});

describe('varukorg räknas om på servern', () => {
  it('ett 6-pack: pris, pant, frakt och moms', async () => {
    const q = await quoteCart(db, { lines: [{ variantId: 'pwo-plus-blueberry-6', quantity: 1 }], shippingMethodId: 'ship_ombud' }, '2026-11-24');
    expect(q.ok).toBe(true);
    expect(q.goodsOre).toBe(14900);
    expect(q.depositOre).toBe(600); // 6 burkar × 1 kr
    expect(q.shippingOre).toBe(4900);
    expect(q.totalOre).toBe(20400);
    // 6 % på varan, 25 % på pant och frakt (pant och frakt: öppen fråga till revisor)
    expect(q.vatOre).toBe(843 + 120 + 980);
    expect(q.remainingForFreeOre).toBe(49900 - 14900);
  });

  it('fri frakt över gränsen och 12 % matmoms från 2028', async () => {
    const q = await quoteCart(db, { lines: [{ variantId: 'pwo-plus-blueberry-24', quantity: 1 }], shippingMethodId: 'ship_ombud' }, '2028-01-02');
    expect(q.shippingOre).toBe(0);
    expect(q.lines[0]).toMatchObject({ vatRateBp: 1200 });
  });

  it('stoppar slutsåld och icke-säljbar variant', async () => {
    const q = await quoteCart(db, {
      lines: [
        { variantId: 'pwo-plus-green-apple-6', quantity: 1 },
        { variantId: 'pwo-plus-black-edition-24', quantity: 1 },
        { variantId: 'finns-inte', quantity: 1 },
      ],
    });
    expect(q.ok).toBe(false);
    expect(q.lines.map((l) => l.problem)).toEqual(['insufficient_stock', 'not_offered', 'not_found']);
  });

  it('avvisar ogiltig indata via API:t', async () => {
    const res = await app.request('/api/cart/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lines: [{ variantId: 'x', quantity: 0 }] }),
    });
    expect(res.status).toBe(400);
  });
});

describe('prishistorik', () => {
  it('returnerar ett års prisändringar för en variant', async () => {
    const { status, body } = await get('/variants/pwo-plus-blueberry-12/price-history');
    expect(status).toBe(200);
    expect(body.length).toBeGreaterThan(1);
    expect(body.at(-1).priceOre).toBe(24900); // pågående rea i exempeldatan
  });
});

describe('lägsta pris senaste 30 dagarna', () => {
  it('visas efter en prissänkning och försvinner efter 30 dagar', async () => {
    const id = 'test-variant';
    await db.insert(s.variants).values({ id, familyId: 'pf_pwo-plus', sku: 'TEST-1', vatClassId: 'vat-food' });
    await db.insert(s.prices).values([
      { id: 'pr_t1', variantId: id, amountOre: 27900, validFrom: '2026-01-01' },
      { id: 'pr_t2', variantId: id, amountOre: 24900, validFrom: '2026-11-20' },
    ]);
    expect(await lowestPrice30Days(db, id, '2026-11-24')).toBe(27900);
    expect(await lowestPrice30Days(db, id, '2027-01-15')).toBeNull();
    expect(await lowestPrice30Days(db, id, '2026-11-10')).toBeNull();
  });
});
