import type { SizeGuideKind } from './types';

export interface SizeGuide {
  title: string;
  intro: string;
  headers: string[];
  rows: string[][];
  howTo: { label: string; text: string }[];
}

/**
 * Allmänna storlekstabeller. Varumärken kan skilja sig något,
 * därför står det alltid att kunden kan kontakta kundtjänst.
 */
export const sizeGuides: Record<SizeGuideKind, SizeGuide> = {
  klader: {
    title: 'Storleksguide kläder',
    intro: 'Mät kroppen, inte plagget. Hamnar du mellan två storlekar: välj den större för lösare passform och den mindre för tajtare.',
    headers: ['Storlek', 'Bröst (cm)', 'Midja (cm)', 'Höft (cm)'],
    rows: [
      ['XS', '80–86', '64–70', '84–90'],
      ['S', '86–92', '70–76', '90–96'],
      ['M', '92–100', '76–84', '96–104'],
      ['L', '100–108', '84–92', '104–112'],
      ['XL', '108–116', '92–100', '112–120'],
      ['XXL', '116–124', '100–110', '120–128'],
    ],
    howTo: [
      { label: 'Bröst', text: 'Mät runt den bredaste delen av bröstet, under armarna.' },
      { label: 'Midja', text: 'Mät runt den smalaste delen av midjan, strax ovanför naveln.' },
      { label: 'Höft', text: 'Mät runt den bredaste delen av höften och stjärten, med fötterna ihop.' },
    ],
  },
  skor: {
    title: 'Storleksguide skor',
    intro: 'Mät foten på kvällen, då är den som störst. Lägg gärna till ungefär en halv centimeter för träningsskor.',
    headers: ['EU', 'UK', 'US dam', 'US herr', 'Fotlängd (cm)'],
    rows: [
      ['36', '3,5', '5,5', '4,5', '22,5'],
      ['37', '4', '6,5', '5', '23,0'],
      ['38', '5', '7,5', '6', '24,0'],
      ['39', '6', '8', '7', '24,5'],
      ['40', '6,5', '8,5', '7,5', '25,0'],
      ['41', '7,5', '9,5', '8,5', '26,0'],
      ['42', '8', '10', '9', '26,5'],
      ['43', '9', '11', '10', '27,5'],
      ['44', '9,5', '11,5', '10,5', '28,0'],
      ['45', '10,5', '12,5', '11,5', '29,0'],
      ['46', '11', '13', '12', '29,5'],
    ],
    howTo: [
      { label: 'Fotlängd', text: 'Ställ dig på ett papper med hälen mot en vägg. Markera längsta tån och mät från väggen till märket.' },
      { label: 'Båda fötterna', text: 'Mät båda fötterna och utgå från den längsta.' },
    ],
  },
};
