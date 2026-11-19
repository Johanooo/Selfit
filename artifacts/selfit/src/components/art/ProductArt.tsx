import type { Product } from '@/data/types';

const tone = (t: string) => ({ fill: `var(--art-${t})` });
const white = { fill: 'var(--c-white)' };
const ink = { fill: 'var(--art-ink)' };

function Label({ product, y, w = 100, x = 30 }: { product: Product; y: number; w?: number; x?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="58" rx="4" style={white} opacity="0.95" />
      <text
        x={x + w / 2}
        y={y + 22}
        textAnchor="middle"
        style={{ ...ink, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, letterSpacing: '0.14em' }}
      >
        {product.brand.toUpperCase()}
      </text>
      <rect x={x + w / 2 - 14} y={y + 30} width="28" height="2" style={tone(product.artTone)} />
      <text
        x={x + w / 2}
        y={y + 47}
        textAnchor="middle"
        style={{ ...ink, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 9 }}
      >
        {product.sizeLabel.toUpperCase()}
      </text>
    </g>
  );
}

function Shape({ product }: { product: Product }) {
  const t = product.artTone;
  switch (product.art) {
    case 'jar':
      return (
        <g>
          <rect x="42" y="34" width="76" height="28" rx="6" style={ink} />
          <rect x="30" y="58" width="100" height="148" rx="20" style={tone(t)} />
          <Label product={product} y={104} />
          <rect x="40" y="66" width="8" height="130" rx="4" style={white} opacity="0.25" />
        </g>
      );
    case 'tube':
      return (
        <g>
          <rect x="46" y="18" width="68" height="10" rx="2" style={tone(t)} opacity="0.7" />
          <path d="M46 26 H114 L124 172 H36 Z" style={tone(t)} />
          <rect x="54" y="170" width="52" height="36" rx="6" style={ink} />
          <Label product={product} y={86} w={76} x={42} />
        </g>
      );
    case 'bottle':
      return (
        <g>
          <rect x="68" y="14" width="24" height="18" rx="3" style={ink} />
          <rect x="62" y="30" width="36" height="22" rx="4" style={ink} />
          <rect x="34" y="50" width="92" height="158" rx="24" style={tone(t)} />
          <Label product={product} y={104} w={92} x={34} />
          <rect x="44" y="62" width="8" height="132" rx="4" style={white} opacity="0.25" />
        </g>
      );
    case 'box':
      return (
        <g>
          <path d="M28 54 L46 40 H140 L122 54 Z" style={tone(t)} opacity="0.7" />
          <path d="M122 54 L140 40 V192 L122 206 Z" style={tone(t)} opacity="0.55" />
          <rect x="28" y="54" width="94" height="152" rx="4" style={tone(t)} />
          <Label product={product} y={106} w={94} x={28} />
        </g>
      );
    case 'shaker':
      return (
        <g>
          <rect x="54" y="16" width="52" height="16" rx="5" style={ink} />
          <rect x="40" y="30" width="80" height="26" rx="6" style={ink} />
          <path d="M42 56 H118 L110 206 H50 Z" style={tone(t)} opacity="0.85" />
          {[90, 120, 150, 180].map((y) => (
            <rect key={y} x="96" y={y} width="12" height="2" style={white} />
          ))}
          <text
            x="76"
            y="130"
            textAnchor="middle"
            style={{ ...white, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, letterSpacing: '0.2em' }}
          >
            SELFIT
          </text>
        </g>
      );
    case 'band':
    default:
      return (
        <g style={{ fill: 'none' }}>
          <ellipse cx="80" cy="80" rx="52" ry="26" style={{ stroke: `var(--art-${t})`, strokeWidth: 14 }} />
          <ellipse cx="80" cy="128" rx="52" ry="26" style={{ stroke: 'var(--art-plum)', strokeWidth: 14 }} />
          <ellipse cx="80" cy="176" rx="52" ry="26" style={{ stroke: 'var(--art-ink)', strokeWidth: 14 }} />
        </g>
      );
  }
}

export function ProductArt({ product, className }: { product: Product; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 222"
      className={`prod-art ${className ?? ''}`}
      role="img"
      aria-label={`${product.name}, ${product.brand}, ${product.sizeLabel}`}
    >
      <ellipse cx="80" cy="212" rx="54" ry="5" style={{ fill: 'var(--c-text)', opacity: 0.1 }} />
      <Shape product={product} />
    </svg>
  );
}
