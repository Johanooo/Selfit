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
      alt={label === '' ? '' : (label ?? `Burk PWO+ ${f?.name ?? ''}, 330 ml`)}
      loading="lazy"
      decoding="async"
    />
  );
}

export function PwoPack({ flavour, pack, className }: { flavour: string; pack: number; className?: string }) {
  const f = getFlavour(flavour);
  return (
    <div
      className={`can-art pwo-pack-art ${className ?? ''}`}
      role="img"
      aria-label={`${pack}-pack PWO+ ${f?.name ?? ''}, ${pack} burkar à 330 ml`}
    >
      {[0, 1, 2].map((can) => (
        <img
          key={can}
          src={canImage(flavour)}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ))}
      <span className="pwo-pack-count" aria-hidden="true">{pack}</span>
    </div>
  );
}
