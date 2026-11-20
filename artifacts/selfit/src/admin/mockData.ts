export type ProductRow = { slug: string; name: string; brand: string; category: string; status: string; variants: number; stock: number; price: number };
export type OrderRow = { id: string; email: string; date: string; amount: number; status: string; payment: string; sku: string; tracking: string };

export const productRows: ProductRow[] = [
  { slug: 'pwo-plus', name: 'PWO+ Pre-workout', brand: 'SELFIT', category: 'Träning', status: 'Publicerad', variants: 18, stock: 326, price: 149 },
  { slug: 'protein-pannkakor', name: 'Protein pannkakor', brand: 'SELFIT', category: 'Träning', status: 'Utkast', variants: 2, stock: 52, price: 129 },
  { slug: 'kreatin-monohydrat', name: 'Kreatin Monohydrat', brand: 'Kraftverk', category: 'Träning', status: 'Publicerad', variants: 1, stock: 64, price: 249 },
  { slug: 'd-vitamin-50', name: 'D-vitamin 50 µg', brand: 'Nordvital', category: 'Hälsa', status: 'Publicerad', variants: 1, stock: 41, price: 89 },
  { slug: 'omega-3', name: 'Omega-3 Fiskolja', brand: 'Nordvital', category: 'Hälsa', status: 'Publicerad', variants: 2, stock: 27, price: 189 },
  { slug: 'fuktkram-ansikte', name: 'Fuktkräm Ansikte', brand: 'Hudro', category: 'Skönhet', status: 'Arkiverad', variants: 1, stock: 18, price: 229 },
];

export const orderRows: OrderRow[] = [
  { id: 'SF-261120-0842', email: 'elin.andersson@example.se', date: '20 november, 10:42', amount: 578, status: 'Att plocka', payment: 'Betald', sku: 'PWO-BL-12', tracking: '—' },
  { id: 'SF-261120-0839', email: 'mikael.berg@example.se', date: '20 november, 10:18', amount: 428, status: 'Packas', payment: 'Betald', sku: 'KRE-300', tracking: '—' },
  { id: 'SF-261120-0834', email: 'sara.lind@example.se', date: '20 november, 09:56', amount: 827, status: 'Skickad', payment: 'Betald', sku: 'PWO-MA-24', tracking: '003707812345' },
  { id: 'SF-261120-0828', email: 'noah.nilsson@example.se', date: '20 november, 09:21', amount: 198, status: 'Levererad', payment: 'Betald', sku: 'SHA-600', tracking: '003707812119' },
  { id: 'SF-261120-0817', email: 'ida.ek@example.se', date: '20 november, 08:44', amount: 319, status: 'Att plocka', payment: 'Väntar', sku: 'DVT-050', tracking: '—' },
  { id: 'SF-261119-0794', email: 'oliver.sund@example.se', date: '19 november, 22:13', amount: 657, status: 'Levererad', payment: 'Betald', sku: 'PWO-ST-12', tracking: '003707811984' },
];

export const navGroups = [
  { label: 'Överblick', links: [{ path: '/admin', label: 'Dagens läge', icon: '◫' }] },
  { label: 'Butik', links: [{ path: '/admin/produkter', label: 'Produkter', icon: '▤' }, { path: '/admin/kategorier', label: 'Kategorier', icon: '⌘' }, { path: '/admin/produkttyper', label: 'Produkttyper & fält', icon: '≡' }, { path: '/admin/media', label: 'Mediebibliotek', icon: '▧' }, { path: '/admin/rabatter', label: 'Rabatter', icon: '%' }] },
  { label: 'Order & lager', links: [{ path: '/admin/order', label: 'Ordrar', icon: '▣' }, { path: '/admin/lager', label: 'Lager & synk', icon: '⇄' }, { path: '/admin/inleveranser', label: 'Inleveranser & partier', icon: '⇧' }, { path: '/admin/eget-lager', label: 'Eget lager', icon: '▦' }, { path: '/admin/returer', label: 'Returer', icon: '↶' }] },
  { label: 'Administration', links: [{ path: '/admin/mejlmallar', label: 'Mejlmallar', icon: '✉' }, { path: '/admin/omdirigeringar', label: 'Omdirigeringar', icon: '↗' }, { path: '/admin/installningar', label: 'Inställningar', icon: '⚙' }] },
];
