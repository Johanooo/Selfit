/**
 * Frakt: fraktsätt, priser och gränsen för fri frakt.
 * Värdena ändras i Admin → Inställningar → Frakt och sparas i databasen.
 * Servern bäddar in dem i sidan (#shipping-data), och butiken, kassan och texterna läser härifrån,
 * så att samma pris står överallt.
 */

export const SHIPPING_METHOD_IDS = ['ombud', 'hem'] as const;
export type ShippingMethodId = (typeof SHIPPING_METHOD_IDS)[number];

export interface ShippingMethod {
  /** T.ex. "Hämta hos ombud". */
  name: string;
  /** Kort text i kassan. Kan använda fält som {leveranstid}. */
  text: string;
  /** Pris i kronor under gränsen för fri frakt. */
  price: number;
  /** Pris i kronor när ordern når gränsen (0 = fri frakt). */
  priceOverFree: number;
  active: boolean;
}

export interface ShippingSettings {
  /** Gränsen för fri frakt i kronor. Räknas på varorna efter rabatt, utan pant. */
  freeFrom: number;
  methods: Record<ShippingMethodId, ShippingMethod>;
}

export const defaultShipping: ShippingSettings = {
  freeFrom: 499,
  methods: {
    ombud: {
      name: 'Hämta hos ombud',
      text: 'PostNord, {leveranstid}. Närmaste ombud väljs utifrån postnummer.',
      price: 49,
      priceOverFree: 0,
      active: true,
    },
    hem: {
      name: 'Hemleverans',
      text: 'Kvällsleverans 17–22, {leveranstid}. Du aviseras via sms.',
      price: 79,
      priceOverFree: 39,
      active: true,
    },
  },
};

/** Gäller just nu. Byts ut med replaceShipping när värdena från Admin har kommit. */
export const shipping: ShippingSettings = {
  freeFrom: defaultShipping.freeFrom,
  methods: { ombud: { ...defaultShipping.methods.ombud }, hem: { ...defaultShipping.methods.hem } },
};

export function normalizeShipping(raw: unknown): ShippingSettings {
  const d = (raw ?? {}) as Partial<ShippingSettings>;
  const methods = {} as Record<ShippingMethodId, ShippingMethod>;
  for (const id of SHIPPING_METHOD_IDS) methods[id] = { ...defaultShipping.methods[id], ...(d.methods?.[id] ?? {}) };
  return { freeFrom: typeof d.freeFrom === 'number' ? d.freeFrom : defaultShipping.freeFrom, methods };
}

export function replaceShipping(raw: unknown) {
  const next = normalizeShipping(raw);
  shipping.freeFrom = next.freeFrom;
  shipping.methods = next.methods;
}

/** Fraktsätten som är på, i ordning. */
export const activeShippingMethods = (s: ShippingSettings = shipping) => SHIPPING_METHOD_IDS.filter((id) => s.methods[id].active);

/** Fraktpriset för ett fraktsätt, givet varornas värde efter rabatt. */
export function shippingPrice(id: ShippingMethodId, goodsAfterDiscount: number, s: ShippingSettings = shipping) {
  const m = s.methods[id];
  return goodsAfterDiscount >= s.freeFrom ? m.priceOverFree : m.price;
}

/** Det billigaste fraktsättet när ordern når gränsen, t.ex. för texten "fri frakt till ombud". */
export function freeShippingMethod(s: ShippingSettings = shipping): ShippingMethodId | null {
  return activeShippingMethods(s).find((id) => s.methods[id].priceOverFree === 0) ?? null;
}

/** "fri frakt" om alla fraktsätt blir gratis, annars t.ex. "fri frakt (Hämta hos ombud)". Null om inget blir gratis. */
export function freeShippingPhrase(s: ShippingSettings = shipping): string | null {
  const active = activeShippingMethods(s);
  const free = active.filter((id) => s.methods[id].priceOverFree === 0);
  if (!free.length) return null;
  if (free.length === active.length) return 'fri frakt';
  return `fri frakt (${free.map((id) => s.methods[id].name).join(', ')})`;
}

/** Första bokstaven stor, t.ex. till början av en mening. */
export const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
