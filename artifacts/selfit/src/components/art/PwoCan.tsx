import { getFlavour } from '@/data/products';

const fill = (token: string) => ({ fill: `var(--${token})` });

function CanShape({ flavour, x = 0, y = 0, scale = 1 }: { flavour: string; x?: number; y?: number; scale?: number }) {
  const f = getFlavour(flavour);
  const main = `flavour-${flavour}`;
  const deep = `flavour-${flavour}-deep`;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="60" cy="214" rx="46" ry="5" style={{ fill: 'var(--c-text)', opacity: 0.12 }} />
      <rect x="14" y="6" width="92" height="18" rx="7" style={fill('can-metal')} />
      <rect x="10" y="18" width="100" height="186" rx="12" style={fill(main)} />
      <rect x="10" y="66" width="100" height="78" style={{ fill: 'var(--c-white)', opacity: 0.94 }} />
      <rect x="10" y="144" width="100" height="6" style={fill(deep)} opacity="0.85" />
      <text
        x="60"
        y="50"
        textAnchor="middle"
        style={{ ...fill('c-white'), fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, letterSpacing: '0.2em' }}
      >
        SELFIT
      </text>
      <text
        x="60"
        y="106"
        textAnchor="middle"
        style={{ ...fill(deep), fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, letterSpacing: '-0.02em' }}
      >
        PWO+
      </text>
      <text
        x="60"
        y="127"
        textAnchor="middle"
        style={{ ...fill('c-text'), fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 10.5, letterSpacing: '0.12em' }}
      >
        {(f?.name ?? '').toUpperCase()}
      </text>
      <text
        x="60"
        y="182"
        textAnchor="middle"
        style={{ ...fill('c-white'), fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 9 }}
      >
        330 ML · PRE-WORKOUT
      </text>
      <rect x="20" y="24" width="7" height="174" rx="3.5" style={{ fill: 'var(--c-white)', opacity: 0.28 }} />
      <rect x="12" y="198" width="96" height="14" rx="6" style={fill('can-metal-shade')} />
    </g>
  );
}

export function PwoCan({ flavour, label, className }: { flavour: string; label?: string; className?: string }) {
  const f = getFlavour(flavour);
  return (
    <svg
      viewBox="0 0 120 222"
      className={`can-art ${className ?? ''}`}
      role={label === '' ? undefined : 'img'}
      aria-hidden={label === '' ? true : undefined}
      aria-label={label === '' ? undefined : (label ?? `Burk PWO+ ${f?.name ?? ''}, 330 ml`)}
    >
      <CanShape flavour={flavour} />
    </svg>
  );
}

export function PwoPack({ flavour, pack, className }: { flavour: string; pack: number; className?: string }) {
  const f = getFlavour(flavour);
  return (
    <svg
      viewBox="0 0 280 240"
      className={`can-art ${className ?? ''}`}
      role="img"
      aria-label={`${pack}-pack PWO+ ${f?.name ?? ''}, ${pack} burkar à 330 ml`}
    >
      <CanShape flavour={flavour} x={8} y={18} scale={0.86} />
      <CanShape flavour={flavour} x={168} y={18} scale={0.86} />
      <CanShape flavour={flavour} x={78} y={6} scale={0.94} />
      <g transform="translate(196 6)">
        <circle cx="34" cy="34" r="32" style={{ fill: 'var(--c-primary)' }} />
        <text
          x="34"
          y="33"
          textAnchor="middle"
          style={{ fill: 'var(--c-on-primary)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}
        >
          {pack}
        </text>
        <text
          x="34"
          y="49"
          textAnchor="middle"
          style={{ fill: 'var(--c-on-primary)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 10 }}
        >
          BURKAR
        </text>
      </g>
    </svg>
  );
}
