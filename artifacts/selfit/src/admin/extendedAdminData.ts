export type ProductFieldType = 'text' | 'number' | 'select' | 'multiselect' | 'boolean';

export type ProductTypeField = {
  id: string;
  name: string;
  type: ProductFieldType;
  unit: string;
  allowedValues: string[];
  requiredAtPublish: boolean;
};

export type ProductTypeDefinition = {
  id: string;
  name: string;
  fields: ProductTypeField[];
};

export type CategoryFilterDefinition = {
  category: string;
  fieldIds: string[];
};

const baseFields = (prefix: string): ProductTypeField[] => [
  { id: `${prefix}-brand`, name: 'Varumärke', type: 'text', unit: '', allowedValues: [], requiredAtPublish: true },
  { id: `${prefix}-size`, name: 'Förpackningsstorlek', type: 'number', unit: 'g', allowedValues: [], requiredAtPublish: true },
  { id: `${prefix}-origin`, name: 'Tillverkningsland', type: 'select', unit: '', allowedValues: ['Sverige', 'Norge', 'Danmark', 'Tyskland'], requiredAtPublish: false },
];

export const defaultProductTypes: ProductTypeDefinition[] = [
  { id: 'dryck-livsmedel', name: 'Dryck och livsmedel', fields: [...baseFields('food'), { id: 'food-allergens', name: 'Allergener', type: 'multiselect', unit: '', allowedValues: ['Mjölk', 'Soja', 'Nötter', 'Gluten'], requiredAtPublish: true }, { id: 'food-vegan', name: 'Vegansk', type: 'boolean', unit: '', allowedValues: [], requiredAtPublish: false }] },
  { id: 'kosttillskott', name: 'Kosttillskott', fields: [...baseFields('supplement'), { id: 'supplement-dose', name: 'Rekommenderad dos', type: 'text', unit: 'per dag', allowedValues: [], requiredAtPublish: true }, { id: 'supplement-warning', name: 'Varningstext', type: 'text', unit: '', allowedValues: [], requiredAtPublish: true }] },
  { id: 'kroppsvard', name: 'Kroppsvård', fields: [...baseFields('care'), { id: 'care-skin', name: 'Hudtyp', type: 'multiselect', unit: '', allowedValues: ['Torr', 'Normal', 'Känslig', 'Fet'], requiredAtPublish: false }, { id: 'care-fragrance', name: 'Parfymfri', type: 'boolean', unit: '', allowedValues: [], requiredAtPublish: false }] },
  { id: 'traningsklader', name: 'Träningskläder', fields: [{ id: 'wear-brand', name: 'Varumärke', type: 'text', unit: '', allowedValues: [], requiredAtPublish: true }, { id: 'wear-size', name: 'Storlek', type: 'multiselect', unit: '', allowedValues: ['XS', 'S', 'M', 'L', 'XL'], requiredAtPublish: true }, { id: 'wear-material', name: 'Material', type: 'text', unit: '', allowedValues: [], requiredAtPublish: false }, { id: 'wear-gender', name: 'Passform', type: 'select', unit: '', allowedValues: ['Unisex', 'Dam', 'Herr'], requiredAtPublish: false }] },
  { id: 'redskap-tillbehor', name: 'Redskap och tillbehör', fields: [{ id: 'gear-brand', name: 'Varumärke', type: 'text', unit: '', allowedValues: [], requiredAtPublish: true }, { id: 'gear-material', name: 'Material', type: 'text', unit: '', allowedValues: [], requiredAtPublish: false }, { id: 'gear-resistance', name: 'Motståndsnivå', type: 'select', unit: '', allowedValues: ['Lätt', 'Medel', 'Tung'], requiredAtPublish: false }] },
];

export const defaultCategoryFilters: CategoryFilterDefinition[] = [
  { category: 'Träning', fieldIds: ['food-brand', 'wear-size', 'gear-resistance'] },
  { category: 'Hälsa', fieldIds: ['supplement-brand', 'supplement-dose'] },
  { category: 'Skönhet', fieldIds: ['care-brand', 'care-skin', 'care-fragrance'] },
];

export type LocalMediaItem = {
  id: string;
  name: string;
  src: string;
  alt: string;
  kind: 'Produktbild' | 'Livsstilsbild' | 'Förpackning';
  usedBy: string[];
};

export const defaultMediaItems: LocalMediaItem[] = [
  { id: 'media-pwo-blueberry', name: 'PWO+ blåbär, framsida', src: '/images/pwo-plus/blueberry.webp', alt: 'PWO+ blåbär, burk framifrån', kind: 'Produktbild', usedBy: ['PWO+ Pre-workout'] },
  { id: 'media-pancakes', name: 'Protein pannkakor', src: '/images/protein-pannkakor/blueberry.webp', alt: 'Förpackning med proteinpannkakor i blåbärssmak', kind: 'Förpackning', usedBy: ['Protein pannkakor'] },
  { id: 'media-training', name: 'Träning i studio', src: '/images/hero.jpg', alt: 'Träningsmiljö med redskap', kind: 'Livsstilsbild', usedBy: ['Träningsband, set om 3'] },
];

export type RedirectRow = {
  id: string;
  oldUrl: string;
  newUrl: string;
  type: 'Permanent (301)';
  createdAt: string;
};

export const defaultRedirectRows: RedirectRow[] = [
  { id: 'redirect-pwo-old', oldUrl: '/produkt/pwo-original', newUrl: '/produkt/pwo-plus', type: 'Permanent (301)', createdAt: '2026-11-20' },
];
