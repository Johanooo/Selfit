import { eq } from 'drizzle-orm';
import { mkdtempSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { createDb, type Db } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrate.ts';
import { seed } from '../src/db/seed.ts';
import { markDatabaseCreated } from '../src/db/meta.ts';
import { syncReferenceData, syncVatClasses } from '../src/routes/adminProducts.ts';
import { syncTaxonomy } from '../src/routes/taxonomy.ts';
import * as s from '../src/db/schema.ts';
import { depositRatesOn, lowest30, lowestPrice30Days, today } from '../src/lib/pricing.ts';
import { campaignPrice, lineFor, withCampaigns } from '../../web/src/data/campaigns.ts';
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
  await syncTaxonomy(db);
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

describe('produkttyper och kategorier', () => {
  const send = (method: string, path: string, body?: unknown) =>
    app.request(`/api${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const fields = { usage: 'usage', contents: 'ingredients', allergens: false, nutrition: false, warnings: true, sizeGuide: false, deposit: false, supplementWarning: false };

  it('har standardtyperna och underkategorierna i databasen', async () => {
    const t = (await get('/admin/taxonomy')).body;
    expect(t.productTypes.map((x: any) => x.id)).toEqual(expect.arrayContaining(['kosttillskott', 'klader', 'redskap']));
    expect(t.categories.find((c: any) => c.slug === 'traningsklader').productType).toBe('klader');
    expect(t.subcategories.some((sc: any) => sc.slug === 'kreatin' && sc.parent === 'kosttillskott')).toBe(true);
  });

  it('skapar en ny produkttyp med normalmoms och en kategori som använder den', async () => {
    const res = await send('POST', '/admin/product-types', { name: 'Receptfria läkemedel', vat: 'vat-standard', fields });
    expect(res.status).toBe(200);
    const { id } = (await res.json()) as any;
    expect(id).toBe('receptfria-lakemedel');
    const cat = await send('POST', '/admin/categories', { name: 'Apotek', productType: id });
    expect(cat.status).toBe(200);
    const sub = await send('POST', '/admin/categories', { name: 'Värk och feber', parent: 'apotek' });
    expect(sub.status).toBe(200);
    const prod = await send('POST', '/admin/products', { name: 'Testtablett', brandId: 'br_selfit', productType: id, subcategory: 'vark-och-feber', variants: [{ price: 49, stock: 5 }] });
    expect(prod.status).toBe(200);
    const pid = ((await prod.json()) as any).id;
    const [v] = await db.select().from(s.variants).where(eq(s.variants.familyId, pid));
    expect(v.vatClassId).toBe('vat-standard');
    // Används typen går den inte att ta bort.
    expect((await send('DELETE', `/admin/product-types/${id}`)).status).toBe(409);
    // Kategorin med produkter går inte att ta bort.
    expect((await send('DELETE', '/admin/categories/vark-och-feber')).status).toBe(409);
  });

  it('nekar att ta bort en standardtyp och kräver typ på huvudkategorier', async () => {
    expect((await send('DELETE', '/admin/product-types/klader')).status).toBe(409);
    expect((await send('POST', '/admin/categories', { name: 'Utan typ' })).status).toBe(400);
  });

  it('kan dölja en kategori', async () => {
    const t = (await get('/admin/taxonomy')).body;
    const cat = t.categories.find((c: any) => c.slug === 'halsokost');
    expect((await send('PUT', '/admin/categories/halsokost', { ...cat, parent: null, hidden: true })).status).toBe(200);
    expect((await get('/taxonomy')).body.categories.find((c: any) => c.slug === 'halsokost').hidden).toBe(true);
    await send('PUT', '/admin/categories/halsokost', { ...cat, parent: null, hidden: false });
  });
});

describe('moms och pant i admin', () => {
  const send = (method: string, path: string, body?: unknown) =>
    app.request(`/api${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

  it('visar momssatser med datum och 6 % på livsmedel idag', async () => {
    const tax = (await get('/admin/tax')).body;
    const food = tax.vat.find((v: any) => v.id === 'vat-food');
    const now = food.rates.find((r: any) => r.validFrom <= tax.today && (!r.validTo || r.validTo >= tax.today));
    expect(now.rateBp).toBe(600);
  });

  it('ändrar pant från ett framtida datum och behåller dagens belopp till dess', async () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 10);
    const from = d.toISOString().slice(0, 10);
    expect((await send('POST', '/admin/deposits/pant-burk/rates', { amount: 2, validFrom: from })).status).toBe(200);
    expect((await depositRatesOn(db, today())).get('pant-burk')).toBe(100);
    expect((await depositRatesOn(db, from)).get('pant-burk')).toBe(200);
  });

  it('nekar ett datum bakåt i tiden', async () => {
    expect((await send('POST', '/admin/deposits/pant-burk/rates', { amount: 3, validFrom: '2020-01-01' })).status).toBe(400);
  });
});

describe('startsida och topprad', () => {
  const send = (method: string, path: string, body?: unknown) =>
    app.request(`/api${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

  it('ger standardinnehåll när inget är sparat', async () => {
    const s0 = (await get('/settings')).body;
    expect(s0.home.hero.title).toBeTruthy();
    expect(s0.navigation.topbar.length).toBeGreaterThan(0);
  });

  it('sparar startsidan och nekar en produktrad utan källa', async () => {
    const current = (await get('/settings')).body.home;
    const next = { ...current, hero: { ...current.hero, title: 'Ny rubrik' }, rows: [...current.rows, { id: 'row-x', title: 'Drycker', source: 'category:drycker', limit: 8, moreLabel: 'Se alla', moreHref: '/kategori/drycker', visible: true }], sections: [...current.sections, { kind: 'row', id: 'row-x' }] };
    const ok = await send('PUT', '/admin/settings/home', next);
    expect(ok.status).toBe(200);
    const saved = (await get('/settings')).body.home;
    expect(saved.hero.title).toBe('Ny rubrik');
    expect(saved.rows.find((r: any) => r.id === 'row-x').source).toBe('category:drycker');
    const bad = await send('PUT', '/admin/settings/home', { ...next, rows: [{ ...next.rows[0], source: 'hackat' }] });
    expect(bad.status).toBe(400);
  });

  it('sparar topprad och menylänkar', async () => {
    const nav = { topbar: [{ label: 'Fri frakt', href: '' }], menuLinks: [{ label: 'Rea', href: '/kollektion/kampanjer', position: 'before', highlight: true }] };
    expect((await send('PUT', '/admin/settings/navigation', nav)).status).toBe(200);
    expect((await get('/settings')).body.navigation).toEqual(nav);
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

describe('Admin: pant', () => {
  const send = (method: string, path: string, body?: unknown) =>
    app.request(`/api${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

  it('skapar en pant, väljer den på en produkt och räknar pant per burk i flak', async () => {
    const created = await send('POST', '/admin/deposits', { name: 'Burk 2 kr', amount: 2 });
    expect(created.status).toBe(200);
    const { id: classId } = (await created.json()) as any;
    expect((await send('POST', '/admin/deposits', { name: 'burk 2 kr', amount: 2 })).status).toBe(409);

    const res = await send('POST', '/admin/products', {
      name: 'Testdryck',
      brandId: 'br_selfit',
      productType: 'dryck',
      subcategory: 'sportdryck',
      depositClass: classId,
      variants: [{ pack: 6, price: 120, stock: 10 }],
    });
    expect(res.status).toBe(200);
    const p = (await res.json()) as any;
    expect(p.depositClass).toBe(classId);
    await send('POST', `/admin/products/${p.id}/status`, { status: 'published' });
    const shop = (await get('/storefront/products')).body.find((x: any) => x.slug === 'testdryck');
    expect(shop.variants[0].depositPerUnit).toBe(2);

    const tax = (await get('/admin/tax')).body;
    expect(tax.deposits.find((d: any) => d.id === classId).products).toBe(1);
    expect((await send('DELETE', `/admin/deposits/${classId}`)).status).toBe(409);

    const bad = await send('PUT', `/admin/products/${p.id}`, { ...p, depositClass: 'finns-inte' });
    expect(bad.status).toBe(400);
    const none = await send('PUT', `/admin/products/${p.id}`, { ...p, depositClass: '' });
    expect(((await none.json()) as any).depositClass).toBe('');
    expect((await send('DELETE', `/admin/deposits/${classId}`)).status).toBe(200);
  });
});

describe('Admin: frakt', () => {
  const put = (body: unknown) =>
    app.request('/api/admin/settings/shipping', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  it('sparar priser och gräns, och kassan på servern räknar med dem', async () => {
    const before = (await get('/settings')).body.shipping;
    expect(before.freeFrom).toBe(499);
    const next = { ...before, freeFrom: 599, methods: { ...before.methods, ombud: { ...before.methods.ombud, price: 59 } } };
    expect((await put(next)).status).toBe(200);
    expect((await get('/settings')).body.shipping.freeFrom).toBe(599);
    const q = await quoteCart(db, { lines: [{ variantId: 'pwo-plus-blueberry-6', quantity: 1 }], shippingMethodId: 'ship_ombud' }, '2026-11-24');
    expect(q.shippingOre).toBe(5900);
    expect(q.remainingForFreeOre).toBe(59900 - 14900);

    // Inget fraktsätt på, eller dyrare frakt över gränsen, sparas inte.
    const off = { ...next, methods: { ombud: { ...next.methods.ombud, active: false }, hem: { ...next.methods.hem, active: false } } };
    expect((await put(off)).status).toBe(400);
    const odd = { ...next, methods: { ...next.methods, hem: { ...next.methods.hem, priceOverFree: 999 } } };
    expect((await put(odd)).status).toBe(400);

    expect((await put(before)).status).toBe(200);
  });
});

describe('kampanjer', () => {
  const send = (method: string, path: string, body?: unknown) =>
    app.request(`/api${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = async (res: Response) => (await res.json()) as any;
  const day = (offset: number) => {
    const d = new Date(`${today()}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const pwo20 = { valueType: 'percent', value: 20, appliesTo: { type: 'products', products: ['pwo-plus'] } };
  const base = {
    title: 'Black Week',
    slug: 'black-week',
    intro: 'Veckans bästa priser.',
    lines: [pwo20],
    startsOn: day(0),
    endsOn: day(7),
    banner: { text: 'Black Week – 20 % på PWO+', placement: 'both' },
  };
  const variant = async (id: string) => (await get('/products/pwo-plus')).body.variants.find((v: any) => v.id === id);
  let id = '';

  it('räknar kampanjpris och lägger det i prishistoriken', () => {
    expect(campaignPrice({ valueType: 'percent', value: 20 }, 34900)).toBe(27900); // 279,20 kr avrundas till 279 kr
    expect(campaignPrice({ valueType: 'amount', value: 5000 }, 34900)).toBe(29900);
    expect(campaignPrice({ valueType: 'price', value: 40000 }, 34900)).toBeNull(); // högre än ordinarie: ingen kampanj
    const rule = {
      id: 'x', slug: 'x', title: 'X', startsOn: '2026-11-20', endsOn: '2026-11-26', enabled: true,
      lines: [{ id: 'a', valueType: 'percent' as const, value: 20, appliesTo: { type: 'all' as const, categories: [], brands: [], products: [] } }],
    };
    const t = { slug: 'p', brand: 'b', categories: [] };
    const h = withCampaigns([{ from: '2026-01-01', ore: 34900 }], [rule], t, '2026-11-30');
    expect(h).toEqual([
      { from: '2026-01-01', ore: 34900 },
      { from: '2026-11-20', ore: 27900 },
      { from: '2026-11-27', ore: 34900 },
    ]);
    expect(lowest30(h, '2026-11-22')).toBe(34900); // under kampanjen
    expect(lowest30(h, '2026-11-30')).toBeNull(); // efter kampanjen är det ingen sänkning
  });

  it('den mest specifika raden gäller: produkt före varumärke före kategori, aldrig dubbel rabatt', () => {
    const line = (id: string, value: number, appliesTo: any) => ({ id, valueType: 'percent' as const, value, appliesTo: { categories: [], brands: [], products: [], ...appliesTo } });
    const lines = [line('kat', 30, { type: 'categories', categories: ['drycker'] }), line('mark', 25, { type: 'brands', brands: ['selfit'] }), line('prod', 10, { type: 'products', products: ['pwo-plus'] })];
    const pwo = { slug: 'pwo-plus', brand: 'selfit', categories: ['drycker'] };
    expect(lineFor(lines, pwo, 10000)).toMatchObject({ line: { id: 'prod' }, ore: 9000 }); // 10 %, inte 30 %
    expect(lineFor(lines, { slug: 'annan', brand: 'selfit', categories: ['drycker'] }, 10000)).toMatchObject({ line: { id: 'mark' }, ore: 7500 });
    expect(lineFor(lines, { slug: 'annan', brand: 'annat', categories: ['drycker'] }, 10000)).toMatchObject({ line: { id: 'kat' }, ore: 7000 });
    expect(lineFor(lines, { slug: 'annan', brand: 'annat', categories: ['klader'] }, 10000)).toBeNull();
  });

  it('skapar en kampanj som syns i butik, produkt-API och varukorg', async () => {
    const res = await send('POST', '/admin/campaigns', base);
    expect(res.status).toBe(200);
    const c = await json(res);
    id = c.id;
    expect(c.state).toBe('active');
    expect(c.label).toBe('20 % på utvalda produkter');
    expect(c.lines[0].id).toBeTruthy();

    const six = await variant('pwo-plus-blueberry-6');
    expect(six.ordinaryPriceOre).toBe(14900);
    expect(six.priceOre).toBe(11900); // 149 kr − 20 % = 119,20 → 119 kr
    expect(six.campaign).toBe('black-week');
    expect(six.lowestPrice30DaysOre).not.toBeNull();

    const quote = await quoteCart(db, { lines: [{ variantId: 'pwo-plus-blueberry-6', quantity: 2 }] });
    expect(quote.lines[0]).toMatchObject({ unitPriceOre: 11900, lineTotalOre: 23800, campaign: 'black-week' });

    const list = (await get('/storefront/products')).body;
    const sv = list.find((p: any) => p.slug === 'pwo-plus').variants.find((v: any) => v.id === 'pwo-plus-blueberry-6');
    expect(sv).toMatchObject({ price: 119, campaign: 'black-week' });
    expect(sv.priceHistory.at(-1)).toEqual({ from: today(), price: 119 });

    const pub = (await get('/campaigns')).body;
    expect(pub).toEqual([{ slug: 'black-week', title: 'Black Week', intro: 'Veckans bästa priser.', endsOn: day(7), banner: base.banner }]);
  });

  it('flera rader i samma kampanj: produktraden vinner över kategoriraden', async () => {
    const lines = [pwo20, { valueType: 'percent', value: 30, appliesTo: { type: 'categories', categories: ['drycker'] } }];
    const res = await send('PUT', `/admin/campaigns/${id}`, { ...base, lines });
    expect(res.status).toBe(200);
    expect((await json(res)).label).toBe('2 rader med olika rabatt');
    expect((await variant('pwo-plus-blueberry-6')).priceOre).toBe(11900); // fortfarande 20 %, inte 30 % och inte 20 + 30
    const preview = await json(await send('POST', '/admin/campaigns/preview', { id, lines, startsOn: day(0), endsOn: day(7) }));
    expect(preview.products.find((p: any) => p.slug === 'pwo-plus')).toMatchObject({ line: 1, matchingLines: 2, campaignFrom: 119 });
    expect(preview.overlaps).toEqual([]);
  });

  it('två kampanjer samtidigt: lägsta priset gäller och Admin varnar', async () => {
    const other = await json(await send('POST', '/admin/campaigns', { ...base, slug: 'helg', title: 'Helgrea', lines: [{ valueType: 'percent', value: 40, appliesTo: { type: 'products', products: ['pwo-plus'] } }], banner: { text: '', placement: 'none' } }));
    expect(other.overlaps).toMatchObject([{ id, title: 'Black Week', products: ['PWO+ Pre-workout'] }]);
    const six = await variant('pwo-plus-blueberry-6');
    expect(six).toMatchObject({ priceOre: 8900, campaign: 'helg' }); // 149 − 40 % = 89,40 → 89 kr
    const list = await json(await send('GET', '/admin/campaigns'));
    expect(list.find((c: any) => c.id === id).overlaps[0].title).toBe('Helgrea');
    expect((await send('DELETE', `/admin/campaigns/${other.id}`)).status).toBe(200);
    expect((await variant('pwo-plus-blueberry-6')).priceOre).toBe(11900);
  });

  it('validerar fälten', async () => {
    const bad = async (body: unknown) => (await json(await send('POST', '/admin/campaigns', body))).error;
    expect(await bad({ ...base, slug: 'Black Week' })).toMatch(/a–z/);
    expect(await bad({ ...base, slug: 'ny', lines: [] })).toMatch(/minst en rad/);
    expect(await bad({ ...base, slug: 'ny', lines: [{ ...pwo20, value: 100 }] })).toMatch(/mindre än 100/);
    expect(await bad({ ...base, slug: 'ny', lines: [pwo20, { valueType: 'price', value: 49, appliesTo: { type: 'all' } }] })).toMatch(/Rad 2: Fast kampanjpris/);
    expect(await bad({ ...base, slug: 'ny', endsOn: day(-1) })).toMatch(/före startdatum/);
    expect(await bad({ ...base, slug: 'ny', banner: { text: '', placement: 'home' } })).toMatch(/text till bannern/);
    expect((await send('POST', '/admin/campaigns', base)).status).toBe(409); // adressen finns redan
  });

  it('låser raderna när kampanjen har börjat, och kan avslutas', async () => {
    const host = { ...base, slug: 'host', title: 'Höst', lines: [{ ...pwo20, value: 10 }], startsOn: day(-3), banner: { text: '', placement: 'none' } };
    const started = await json(await send('POST', '/admin/campaigns', host));
    expect(started.locked).toBe(true);
    expect((await send('PUT', `/admin/campaigns/${started.id}`, { ...host, lines: [{ ...pwo20, value: 15 }] })).status).toBe(409);
    expect((await send('PUT', `/admin/campaigns/${started.id}`, { ...host, lines: [...host.lines, pwo20] })).status).toBe(409);
    expect((await send('DELETE', `/admin/campaigns/${started.id}`)).status).toBe(409);
    const renamed = await send('PUT', `/admin/campaigns/${started.id}`, { ...host, title: 'Höstrea', lines: started.lines });
    expect(renamed.status).toBe(200); // namn och text går att ändra
    const ended = await json(await send('POST', `/admin/campaigns/${started.id}/end`));
    expect(ended.endsOn).toBe(day(-1));
    expect(ended.state).toBe('expired');
  });

  it('rabatter får ett val för kampanjvaror', async () => {
    const res = await send('POST', '/admin/discounts', { method: 'code', code: 'KAMPANJOK', kind: 'order', valueType: 'percent', value: 10, startsAt: '2026-01-01T00:00:00.000Z', combineWithCampaigns: true });
    expect((await json(res)).combineWithCampaigns).toBe(true);
    expect((await json(await send('POST', '/discounts/check', { code: 'KAMPANJOK' }))).discount.combineWithCampaigns).toBe(true);
  });

  it('en kampanj som började i dag kan tas bort, och priset blir ordinarie igen', async () => {
    expect((await send('DELETE', `/admin/campaigns/${id}`)).status).toBe(200);
    expect(await variant('pwo-plus-blueberry-6')).toMatchObject({ priceOre: 14900, campaign: null });
    expect((await get('/campaigns')).body).toEqual([]);
  });
});

describe('papperskorg', () => {
  const send = (method: string, path: string, body?: unknown) =>
    app.request(`/api${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = async (res: Response) => (await res.json()) as any;
  const entry = async (label: string) => ((await get('/admin/trash')).body as any[]).find((e) => e.label === label);
  const product = { name: 'Papperströja', brandId: 'br_papper', productType: 'klader', subcategory: 't-shirts-och-linnen', vat: 'vat-standard', variants: [{ options: {}, price: 199, stock: 4 }] };
  let pid = '';

  it('en borttagen produkt hamnar i papperskorgen och kan läggas tillbaka med pris och saldo', async () => {
    expect((await send('POST', '/admin/brands', { name: 'Papper' })).status).toBe(200);
    pid = (await json(await send('POST', '/admin/products', product))).id;
    expect((await send('DELETE', `/admin/products/${pid}`)).status).toBe(200);
    expect((await send('GET', `/admin/products/${pid}`)).status).toBe(404);

    const e = await entry('Papperströja');
    expect(e).toMatchObject({ kind: 'product', kindName: 'Produkt', detail: '1 variant' });
    expect(e.payload).toBeUndefined(); // kopian skickas inte till Admin-listan
    expect(new Date(e.expiresAt).getTime() - new Date(e.deletedAt).getTime()).toBe(30 * 864e5);

    const res = await send('POST', `/admin/trash/${e.id}/restore`);
    expect(res.status).toBe(200);
    const back = await json(await send('GET', `/admin/products/${pid}`));
    expect(back.name).toBe('Papperströja');
    expect(back.variants[0]).toMatchObject({ price: 199, stock: 4 });
    expect(await entry('Papperströja')).toBeUndefined();
  });

  it('säger till när varumärket saknas, och när adressen redan används', async () => {
    expect((await send('DELETE', `/admin/products/${pid}`)).status).toBe(200);
    expect((await send('DELETE', '/admin/brands/br_papper')).status).toBe(200);
    const p = await entry('Papperströja');
    const missing = await send('POST', `/admin/trash/${p.id}/restore`);
    expect(missing.status).toBe(409);
    expect((await json(missing)).error).toMatch(/varumärke/);

    expect((await send('POST', `/admin/trash/${(await entry('Papper')).id}/restore`)).status).toBe(200);
    const twin = await json(await send('POST', '/admin/products', product)); // ny produkt med samma namn och adress
    const taken = await send('POST', `/admin/trash/${p.id}/restore`);
    expect(taken.status).toBe(409);
    expect((await json(taken)).error).toMatch(/samma adress/);
    expect((await send('DELETE', `/admin/products/${twin.id}`)).status).toBe(200);
  });

  it('kategorier, rabatter och kampanjer går också att lägga tillbaka', async () => {
    expect((await send('POST', '/admin/categories', { name: 'Papperskategori', productType: 'redskap' })).status).toBe(200);
    expect((await send('DELETE', '/admin/categories/papperskategori')).status).toBe(200);
    expect((await get('/admin/taxonomy')).body.categories.some((c: any) => c.slug === 'papperskategori')).toBe(false);
    expect((await send('POST', `/admin/trash/${(await entry('Papperskategori')).id}/restore`)).status).toBe(200);
    expect((await get('/admin/taxonomy')).body.categories.some((c: any) => c.slug === 'papperskategori')).toBe(true);

    const d = await json(await send('POST', '/admin/discounts', { method: 'code', code: 'PAPPER', kind: 'order', valueType: 'percent', value: 5, startsAt: '2026-01-01T00:00:00.000Z' }));
    expect((await send('DELETE', `/admin/discounts/${d.id}`)).status).toBe(200);
    expect((await send('POST', `/admin/trash/${(await entry('PAPPER')).id}/restore`)).status).toBe(200);
    expect((await json(await send('POST', '/discounts/check', { code: 'PAPPER' }))).ok).toBe(true);
  });

  it('raderar för gott, tömmer och rensar bort det som är äldre än 30 dagar', async () => {
    const twins = ((await get('/admin/trash')).body as any[]).filter((e) => e.label === 'Papperströja');
    expect(twins).toHaveLength(2); // originalet och tvillingen från förra testet
    for (const t of twins) expect((await send('DELETE', `/admin/trash/${t.id}`)).status).toBe(200);
    expect(await entry('Papperströja')).toBeUndefined();

    await db.insert(s.trash).values({ id: 'tr_old', kind: 'brand', objectId: 'br_gammal', label: 'Gammalt', payload: [], deletedAt: new Date(Date.now() - 31 * 864e5).toISOString() });
    expect(await entry('Gammalt')).toBeUndefined(); // listan rensar bort det automatiskt
    expect(await db.select().from(s.trash).where(eq(s.trash.id, 'tr_old'))).toEqual([]);

    const res = await json(await send('DELETE', '/admin/trash'));
    expect(res.deleted).toBeGreaterThan(0);
    expect((await get('/admin/trash')).body).toEqual([]);
  });
});

describe('backup', () => {
  it('laddar ner databas och bilder som en .tar.gz och visar senaste backup', async () => {
    const before = (await get('/admin/backup/info')).body;
    expect(before.lastBackup).toBeNull();
    expect(before.databaseBytes).toBeGreaterThan(0);

    const res = await app.request('/api/admin/backup');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toMatch(/attachment; filename="selfit-backup-\d{4}-\d{2}-\d{2}-\d{4}\.tar\.gz"/);
    const tar = gunzipSync(Buffer.from(await res.arrayBuffer()));
    // Första filen i arkivet är LASMIG.txt, sedan databasen.
    expect(tar.subarray(0, 10).toString()).toBe('LASMIG.txt');
    expect(tar.includes(Buffer.from('ustar'))).toBe(true);
    const dbStart = tar.indexOf(Buffer.from('selfit.db\0'));
    expect(dbStart).toBeGreaterThan(0);
    expect(tar.subarray(dbStart + 512, dbStart + 512 + 15).toString()).toBe('SQLite format 3');

    const small = await app.request('/api/admin/backup?bilder=0');
    expect(small.headers.get('content-disposition')).toMatch(/-databas\.tar\.gz"/);
    const after = (await get('/admin/backup/info')).body;
    expect(after.lastBackup).not.toBeNull();
  });
});
