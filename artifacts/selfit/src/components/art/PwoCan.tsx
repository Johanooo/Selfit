import { getFlavour } from '@/data/products';

export function PwoCan({ flavour, label, className }: { flavour: string; label?: string; className?: string }) {
  const f = getFlavour(flavour);
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return (
    <img
      src={`${base}/images/pwo-plus/${flavour}.jpg`}
      className={`can-art pwo-real-can ${className ?? ''}`}
      alt={label === '' ? '' : (label ?? `Burk PWO+ ${f?.name ?? ''}, 330 ml`)}
      loading="lazy"
      decoding="async"
    />
  );
}

export function PwoPack({ flavour, pack, className }: { flavour: string; pack: number; className?: string }) {
  const f = getFlavour(flavour);
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return (
    <div
      className={`can-art pwo-pack-art ${className ?? ''}`}
      role="img"
      aria-label={`${pack}-pack PWO+ ${f?.name ?? ''}, ${pack} burkar à 330 ml`}
    >
      {[0, 1, 2].map((can) => (
        <img
          key={can}
          src={`${base}/images/pwo-plus/${flavour}.jpg`}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ))}
      <span className="pwo-pack-count" aria-hidden="true">{pack}</span>
    </div>
  );
}
