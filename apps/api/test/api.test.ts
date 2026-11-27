import { eq } from 'drizzle-orm';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { createDb, type Db } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrate.ts';
import { seed } from '../src/db/seed.ts';
import { markDatabaseCreated } from '../src/db/meta.ts';
import { syncReferenceData, syncVatClasses } from '../src/routes/adminProducts.ts';
import * as s from '../src/db/schema.ts';
import { lowestPrice30Days } from '../src/lib/pricing.ts';
import { quoteCart } from '../src/routes/cart.ts';

let db: Db;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'selfit-'));
  db = createDb(`file:${join(dir, 'test.db')}`);
  await runMigrations(db);
  await markDatabaseCreated(db);
  await seed(db);
  await syncReferenceData(db);
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

describe('inställningar', () => {
  it('ger standardvärden och sparar ändringar från Admin', async () => {
    const before = await get('/settings');
    expect(before.body.policies.openPurchaseDays).toBe(30);
    const company = { ...before.body.company, legalName: 'SELFIT AB', email: 'hej@selfit.se' };
    const res = await app.request('/api/admin/settings/company', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(company),
    });
    expect(res.status).toBe(200);
    const after = await get('/settings');
    expect(after.body.company.legalName).toBe('SELFIT AB');
    expect(after.body.company.email).toBe('hej@selfit.se');
  });

  it('nekar öppet köp kortare än 14 dagar', async () => {
    const { body } = await get('/settings');
    const res = await app.request('/api/admin/settings/policies', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body.policies, openPurchaseDays: 7 }),
    });
    expect(res.status).toBe(400);
    const err = (await res.json()) as any;
    expect(err.fields.openPurchaseDays).toMatch(/14 dagar/);
  });
});

describe('sidor', () => {
  it('sparar en omskriven sida och kan återställa den', async () => {
    expect((await get('/pages')).body).toEqual([]);
    const page = { title: 'Om oss', summary: 'Kort', sections: [{ heading: 'Hej', body: 'Text med {e-post}.' }] };
    const put = await app.request('/api/admin/pages/om-selfit', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(page) });
    expect(put.status).toBe(200);
    const list = (await get('/pages')).body;
    expect(list[0].slug).toBe('om-selfit');
    expect(list[0].sections[0].body).toBe('Text med {e-post}.');
    await app.request('/api/admin/pages/om-selfit', { method: 'DELETE' });
    expect((await get('/pages')).body).toEqual([]);
  });

  it('nekar okända sidor', async () => {
    const res = await app.request('/api/admin/pages/finns-inte', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'x', summary: '', sections: [] }) });
    expect(res.status).toBe(404);
  });
});

describe('ändringslogg', () => {
  it('loggar ändringar automatiskt och går inte att ändra eller radera', async () => {
    const log = (await get('/admin/audit')).body;
    expect(log.length).toBeGreaterThan(0);
    const company = log.find((r: any) => r.object === 'Företagsuppgifter');
    expect(company.details.some((d: any) => d.field === 'legalName' && d.to === 'SELFIT AB')).toBe(true);
    expect(log.some((r: any) => r.action === 'Sida ändrad')).toBe(true);
    for (const method of ['PUT', 'DELETE', 'POST']) {
      const res = await app.request('/api/admin/audit', { method });
      expect(res.status).toBe(404);
    }
    // Även direkt i databasen stoppas ändringar och radering.
    await expect(db.update(s.auditLog).set({ actor: 'Någon annan' })).rejects.toThrow();
    await expect(db.delete(s.auditLog)).rejects.toThrow();
    expect((await get('/admin/audit')).body.length).toBe(log.length);
  });
});

describe('hälsokontroll', () => {
  it('visar när databasen skapades', async () => {
    const { body } = await get('/health');
    expect(body.status).toBe('ok');
    expect(body.databaseCreated).toMatch(/^\d{4}-/);
  });
});

describe('butikens produktlista', () => {
  it('bygger produkter i butikens format från databasen', async () => {
    const { status, body } = await get('/storefront/products');
    expect(status).toBe(200);
    const pwo = body.find((p: any) => p.slug === 'pwo-plus');
    expect(pwo.subcategory).toBe('energidryck');
    expect(pwo.variants.length).toBeGreaterThanOrEqual(18);
    const v = pwo.variants.find((x: any) => x.id === 'pwo-plus-blueberry-12');
    expect(v.price).toBeGreaterThan(0);
    expect(v.depositPerUnit).toBe(1);
    expect(v.priceHistory.length).toBeGreaterThan(0);
  });

  it('visar inte arkiverade produkter', async () => {
    await db.update(s.productFamilies).set({ status: 'archived' }).where(eq(s.productFamilies.slug, 'handkram'));
    const { body } = await get('/storefront/products');
    expect(body.some((p: any) => p.slug === 'handkram')).toBe(false);
    await db.update(s.productFamilies).set({ status: 'published' }).where(eq(s.productFamilies.slug, 'handkram'));
  });
});

describe('Admin: produkter', () => {
  const send = (method: string, path: string, body?: unknown) =>
    app.request(`/api${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const tshirt = {
    name: 'Träningströja',
    brandId: 'br_selfit',
    productType: 'klader',
    subcategory: 't-shirts-och-linnen',
    tagline: 'Mjuk och sval',
    description: 'Första stycket.\n\nAndra stycket.',
    vat: 'vat-standard',
    images: [{ src: '/uploads/test.webp', alt: 'Svart tröja' }],
    optionNames: ['Storlek', 'Färg'],
    variants: [
      { options: { Storlek: 'M', Färg: 'Svart' }, price: 299, stock: 5 },
      { options: { Storlek: 'L', Färg: 'Svart' }, price: 299, stock: 0 },
    ],
  };
  let id = '';

  it('skapar ett utkast som inte syns i butiken', async () => {
    const res = await send('POST', '/admin/products', tshirt);
    expect(res.status).toBe(200);
    const p = (await res.json()) as any;
    id = p.id;
    expect(p.status).toBe('draft');
    expect(p.slug).toBe('traningstroja');
    expect(p.variants).toHaveLength(2);
    const shop = (await get('/storefront/products')).body;
    expect(shop.some((x: any) => x.slug === 'traningstroja')).toBe(false);
  });

  it('publicerar och visar produkten i butiken med alternativ och bild', async () => {
    const res = await send('POST', `/admin/products/${id}/status`, { status: 'published' });
    expect(res.status).toBe(200);
    const shop = (await get('/storefront/products')).body;
    const p = shop.find((x: any) => x.slug === 'traningstroja');
    expect(p.optionNames).toEqual(['Storlek', 'Färg']);
    expect(p.variants[0].options).toEqual({ Storlek: 'M', Färg: 'Svart' });
    expect(p.primaryImage).toBe('/uploads/test.webp');
    expect(p.description).toEqual(['Första stycket.', 'Andra stycket.']);
    expect(p.category).toBe('traningsklader');
  });

  it('sparar prisändring i prishistoriken och lagerändring i lagerhistoriken', async () => {
    const p = (await (await send('GET', `/admin/products/${id}`)).json()) as any;
    p.variants[0].price = 249;
    p.variants[0].stock = 8;
    const res = await send('PUT', `/admin/products/${id}`, p);
    expect(res.status).toBe(200);
    const after = (await res.json()) as any;
    expect(after.variants[0].price).toBe(249);
    expect(after.variants[0].stock).toBe(8);
    const ledger = await db.select().from(s.stockLedger).where(eq(s.stockLedger.variantId, after.variants[0].id));
    expect(ledger.map((l) => l.change)).toEqual([5, 3]);
  });

  it('nekar publicering när kategori saknas', async () => {
    const res = await send('POST', '/admin/products', { ...tshirt, name: 'Utan kategori', subcategory: '', status: 'published' });
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error).toMatch(/kategori/);
  });

  it('kopierar en produkt som utkast', async () => {
    const res = await send('POST', `/admin/products/${id}/duplicate`);
    const copy = (await res.json()) as any;
    expect(copy.name).toBe('Träningströja (kopia)');
    expect(copy.status).toBe('draft');
    expect(copy.slug).toBe('traningstroja-kopia');
    expect((await send('DELETE', `/admin/products/${copy.id}`)).status).toBe(200);
  });

  it('tar inte bort publicerade produkter, men arkiverade', async () => {
    expect((await send('DELETE', `/admin/products/${id}`)).status).toBe(409);
    await send('POST', `/admin/products/${id}/status`, { status: 'archived' });
    expect((await send('DELETE', `/admin/products/${id}`)).status).toBe(200);
    expect((await send('GET', `/admin/products/${id}`)).status).toBe(404);
    const log = (await get('/admin/audit')).body;
    expect(log.some((r: any) => r.action === 'Produkt borttagen')).toBe(true);
  });
});

describe('mediebibliotek', () => {
  it('laddar upp, listar, ändrar bildtext och tar bort bilder', async () => {
    const fd = new FormData();
    fd.append('file', new File([new Uint8Array([1, 2, 3])], 'burk.png', { type: 'image/png' }));
    const up = await app.request('/api/admin/media', { method: 'POST', body: fd });
    expect(up.status).toBe(200);
    const img = (await up.json()) as any;
    expect(img.src).toMatch(/^\/uploads\/.+\.png$/);
    const list = (await get('/admin/media')).body;
    expect(list.uploads.some((m: any) => m.id === img.id)).toBe(true);
    const put = await app.request(`/api/admin/media/${img.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ alt: 'Svart burk' }) });
    expect(((await put.json()) as any).alt).toBe('Svart burk');
    expect((await app.request(`/api/admin/media/${img.id}`, { method: 'DELETE' })).status).toBe(200);
  });

  it('tar inte bort bilder som används av en produkt', async () => {
    const fd = new FormData();
    fd.append('file', new File([new Uint8Array([1])], 'x.png', { type: 'image/png' }));
    const img = (await (await app.request('/api/admin/media', { method: 'POST', body: fd })).json()) as any;
    const res = await app.request('/api/admin/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Med bild', brandId: 'br_selfit', productType: 'redskap', subcategory: 'shakers-och-flaskor', vat: 'vat-standard', images: [{ src: img.src }], variants: [{ price: 99, stock: 1 }] }),
    });
    expect(res.status).toBe(200);
    const del = await app.request(`/api/admin/media/${img.id}`, { method: 'DELETE' });
    expect(del.status).toBe(409);
    expect(((await del.json()) as any).error).toMatch(/Med bild/);
  });
});

describe('Admin: varumärken', () => {
  const send = (method: string, path: string, body?: unknown) =>
    app.request(`/api${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

  it('kräver att varumärket finns innan det används på en produkt', async () => {
    const res = await send('POST', '/admin/products', { name: 'Skor', brandId: 'br_nike', productType: 'klader', subcategory: 'skor', vat: 'vat-standard', variants: [{ price: 999, stock: 1 }] });
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error).toMatch(/Varumärken/);
  });

  it('skapar, nekar dubbletter och tar bara bort oanvända varumärken', async () => {
    const created = await send('POST', '/admin/brands', { name: 'Nike', intro: 'Sportkläder' });
    expect(created.status).toBe(200);
    expect(((await created.json()) as any).id).toBe('br_nike');
    expect((await send('POST', '/admin/brands', { name: 'nike' })).status).toBe(409);
    const prod = await send('POST', '/admin/products', { name: 'Skor', brandId: 'br_nike', productType: 'klader', subcategory: 'skor', vat: 'vat-standard', variants: [{ price: 999, stock: 1 }] });
    expect(prod.status).toBe(200);
    expect((await send('DELETE', '/admin/brands/br_nike')).status).toBe(409);
    const list = (await get('/admin/brands')).body;
    expect(list.find((b: any) => b.id === 'br_nike').products).toBe(1);
  });
});

describe('vanliga frågor', () => {
  const send = (method: string, path: string, body?: unknown) =>
    app.request(`/api${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

  it('sparar frågor med rubrik och dold-markering, i ordning', async () => {
    const faq = [
      { q: 'Hur lång är leveranstiden?', a: 'Oftast 1–3 vardagar.', category: 'Frakt och leverans' },
      { q: 'Gammal fråga', a: 'Visas inte.', hidden: true },
    ];
    const res = await send('PUT', '/admin/pages/vanliga-fragor', { title: 'Vanliga frågor', summary: 'Snabba svar.', sections: [], faq });
    expect(res.status).toBe(200);
    const page = (await get('/pages')).body.find((p: any) => p.slug === 'vanliga-fragor');
    expect(page.faq).toEqual(faq);
  });

  it('nekar en fråga utan svar', async () => {
    const res = await send('PUT', '/admin/pages/vanliga-fragor', { title: 'Vanliga frågor', summary: '', sections: [], faq: [{ q: 'Fråga', a: '' }] });
    expect(res.status).toBe(400);
  });
});

describe('moms', () => {
  const send = (method: string, path: string, body?: unknown) =>
    app.request(`/api${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

  it('sätter momsen efter produkttyp, oavsett vad formuläret skickar', async () => {
    const shaker = await send('POST', '/admin/products', { name: 'Momstest shaker', brandId: 'br_selfit', productType: 'redskap', subcategory: 'shakers-och-flaskor', vat: 'vat-food', variants: [{ price: 99, stock: 1 }] });
    expect(shaker.status).toBe(200);
    const sid = ((await shaker.json()) as any).id;
    const [sv] = await db.select().from(s.variants).where(eq(s.variants.familyId, sid));
    expect(sv.vatClassId).toBe('vat-standard');

    const bar = await send('POST', '/admin/products', { name: 'Momstest bar', brandId: 'br_selfit', productType: 'livsmedel', subcategory: 'proteinbars', vat: 'vat-standard', variants: [{ price: 25, stock: 1 }] });
    expect(bar.status).toBe(200);
    const bid = ((await bar.json()) as any).id;
    const [bv] = await db.select().from(s.variants).where(eq(s.variants.familyId, bid));
    expect(bv.vatClassId).toBe('vat-food');
  });

  it('rättar fel moms på befintliga varianter vid start', async () => {
    const [v] = await db.select().from(s.variants).where(eq(s.variants.familyId, 'pf_pwo-plus'));
    await db.update(s.variants).set({ vatClassId: 'vat-standard' }).where(eq(s.variants.id, v.id));
    expect(await syncVatClasses(db)).toBeGreaterThanOrEqual(1);
    const [after] = await db.select().from(s.variants).where(eq(s.variants.id, v.id));
    expect(after.vatClassId).toBe('vat-food');
  });
});

describe('rabatter', () => {
  const send = (method: string, path: string, body?: unknown) =>
    app.request(`/api${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const past = '2026-01-01T00:00:00.000Z';
  const base = { method: 'code', kind: 'order', valueType: 'percent', value: 10, startsAt: past };
  const check = async (code: string, email?: string) => (await (await send('POST', '/discounts/check', { code, email })).json()) as any;

  it('skapar en kod och butiken godkänner den', async () => {
    const res = await send('POST', '/admin/discounts', { ...base, code: 'valkommen10' });
    expect(res.status).toBe(200);
    const d = (await res.json()) as any;
    expect(d.code).toBe('VALKOMMEN10');
    expect(d.label).toBe('10 % på hela ordern');
    expect(d.state).toBe('active');
    const ok = await check('Valkommen10');
    expect(ok.ok).toBe(true);
    expect(ok.discount.value).toBe(10);
    expect((await send('POST', '/admin/discounts', { ...base, code: 'VALKOMMEN10' })).status).toBe(409);
  });

  it('validerar fälten', async () => {
    const bad = async (body: unknown) => ((await (await send('POST', '/admin/discounts', body)).json()) as any).error;
    expect(await bad({ ...base, code: 'X' })).toMatch(/3–32/);
    expect(await bad({ ...base, code: 'PROC', value: 150 })).toMatch(/högst 100/);
    expect(await bad({ ...base, code: 'KAT', kind: 'products', appliesTo: { type: 'categories', categories: [] } })).toMatch(/kategori/);
    expect(await bad({ ...base, code: 'PERS', eligibility: { type: 'specific', customerIds: [] } })).toMatch(/kund/);
    expect(await bad({ ...base, method: 'automatic', title: 'Rea', eligibility: { type: 'new' } })).toMatch(/alla kunder/);
  });

  it('nekar utgångna och schemalagda koder och fast belopp sparas i kronor', async () => {
    await send('POST', '/admin/discounts', { ...base, code: 'GAMMAL', endsAt: '2026-02-01T00:00:00.000Z' });
    expect((await check('GAMMAL')).error).toMatch(/gått ut/);
    await send('POST', '/admin/discounts', { ...base, code: 'SNART', startsAt: '2099-01-01T00:00:00.000Z' });
    expect((await check('SNART')).error).toMatch(/gäller från/);
    expect((await check('FINNSINTE')).error).toMatch(/finns inte/);
    const fixed = (await (await send('POST', '/admin/discounts', { ...base, code: 'MINUS50', valueType: 'fixed', value: 50 })).json()) as any;
    expect(fixed.value).toBe(50);
    expect(fixed.label).toBe('50 kr på hela ordern');
  });

  it('nya kunder, personliga koder och en gång per kund', async () => {
    await db.insert(s.customers).values([
      { id: 'cu_anna', email: 'anna@example.se', name: 'Anna' },
      { id: 'cu_bo', email: 'bo@example.se', name: 'Bo' },
    ]);
    await db.insert(s.orders).values({ id: 'or_1', number: 'T-1', customerId: 'cu_anna', email: 'anna@example.se', subtotalOre: 10000, vatOre: 2000, totalOre: 10000, discountCode: 'ANNA20' });
    await send('POST', '/admin/discounts', { ...base, code: 'FORSTA', eligibility: { type: 'new' } });
    expect((await check('FORSTA')).discount.needsEmail).toBe(true);
    expect((await check('FORSTA', 'anna@example.se')).error).toMatch(/första gången/);
    expect((await check('FORSTA', 'ny@example.se')).ok).toBe(true);

    await send('POST', '/admin/discounts', { ...base, code: 'ANNA20', eligibility: { type: 'specific', customerIds: ['cu_anna'] }, oncePerCustomer: true });
    expect((await check('ANNA20', 'bo@example.se')).error).toMatch(/personlig/);
    expect((await check('ANNA20', 'anna@example.se')).error).toMatch(/redan använt/);

    const list = (await get('/admin/discounts')).body;
    const anna = list.find((d: any) => d.code === 'ANNA20');
    expect(anna.used).toBe(1);
    expect(anna.customers[0].email).toBe('anna@example.se');
    expect((await send('DELETE', `/admin/discounts/${anna.id}`)).status).toBe(409);
    const customers = (await get('/admin/discount-customers?q=ann')).body;
    expect(customers).toEqual([{ id: 'cu_anna', name: 'Anna', email: 'anna@example.se', orders: 1 }]);
  });

  it('automatiska rabatter syns i butiken och max antal användningar räknas', async () => {
    await send('POST', '/admin/discounts', { method: 'automatic', title: 'Fri frakt i november', kind: 'shipping', startsAt: past });
    const auto = (await get('/discounts/automatic')).body;
    expect(auto.map((a: any) => a.title)).toContain('Fri frakt i november');
    await send('POST', '/admin/discounts', { ...base, code: 'ENGANG', usageLimit: 1 });
    await db.insert(s.orders).values({ id: 'or_2', number: 'T-2', email: 'x@example.se', subtotalOre: 100, vatOre: 20, totalOre: 100, discountCode: 'engang' });
    expect((await check('ENGANG')).error).toMatch(/förbrukad/);
  });
});
