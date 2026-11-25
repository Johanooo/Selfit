import { getFlavour } from '@/data/products';

const canImages: Record<string, string> = {
  'berry-fusion': 'berry-fusion.webp',
  'black-edition': 'black-edition.webp',
  blueberry: 'blueberry.webp',
  'green-apple': 'green-apple.webp',
  'mango-passion': 'mango-passion.webp',
  strawberry: 'strawberry.webp',
};

function canImage(flavour: string) {
  const image = canImages[flavour];
  if (!image) throw new Error(`Missing PWO+ can image for flavour "${flavour}"`);
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/images/pwo-plus/${image}`;
}

export function PwoCan({ flavour, label, className }: { flavour: string; label?: string; className?: string }) {
  const f = getFlavour(flavour);
  return (
    <img
      src={canImage(flavour)}
      className={`can-art pwo-real-can ${className ?? ''}`}
      width={720}
      height={720}
      alt={label === '' ? '' : (label ?? `Burk PWO+ ${f?.name ?? ''}, 330 ml`)}
      loading="lazy"
      decoding="async"
    />
  );
}

type CanSpot = { x: number; y: number; h: number; row: number };

/**
 * Placerar burkarna som ett flak sett snett framifrån: bakre rader högre upp och lite mindre.
 * Antalet synliga burkar ökar med förpackningens storlek, så 6-, 12- och 24-pack går att skilja åt.
 */
function packLayout(pack: number): CanSpot[] {
  const [rows, cols, h, step, y0, dy] =
    pack <= 6 ? [2, 3, 64, 20, 4, 28] : pack <= 12 ? [2, 4, 60, 18, 6, 28] : [3, 4, 52, 16, 4, 20];
  const spots: CanSpot[] = [];
  for (let row = 0; row < rows; row++) {
    const scale = 0.86 + 0.14 * (row / (rows - 1));
    const hh = h * scale;
    const ss = step * scale;
    const offset = (rows - 1 - row) % 2 ? ss / 4 : 0;
    const start = 50 - ((cols - 1) * ss) / 2 + offset;
    for (let c = 0; c < cols; c++) spots.push({ x: start + c * ss, y: y0 + row * dy, h: hh, row });
  }
  return spots;
}

export function PwoPack({ flavour, pack, className }: { flavour: string; pack: number; className?: string }) {
  const f = getFlavour(flavour);
  const src = canImage(flavour);
  return (
    <div
      className={`can-art pwo-pack-art ${className ?? ''}`}
      role="img"
      aria-label={`${pack}-pack PWO+ ${f?.name ?? ''}, ${pack} burkar à 330 ml`}
    >
      {packLayout(pack).map((s, i) => (
        <img
          key={i}
          src={src}
          alt=""
          width={720}
          height={720}
          loading="lazy"
          decoding="async"
          data-row={s.row}
          style={{ left: `${s.x}%`, top: `${s.y}%`, height: `${s.h}%` }}
        />
      ))}
    </div>
  );
}
