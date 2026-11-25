import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { PricePoint } from '@/data/types';
import { kr } from '@/lib/format';
import { changesInPeriod, dailyPrices, lowestPrice30Days, todayIso } from '@/lib/price-history';

const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };

const dateLong = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const monthShort = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];

/** Jämna steg på y-axeln (t.ex. 0, 50, 100 …). */
function niceTicks(min: number, max: number, count = 4) {
  const span = Math.max(max - min, 1);
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks };
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Prisgraf för en variant: ett år bakåt, med hovring och tabell. */
export function PriceHistory({ history }: { history: PricePoint[] }) {
  const today = todayIso();
  const days = useMemo(() => dailyPrices(history, today, 365), [history, today]);
  const changes = useMemo(() => changesInPeriod(history, today, 365), [history, today]);
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();

  if (days.length < 2) return <p className="muted">Prishistorik saknas för den här varianten.</p>;

  const prices = days.map((d) => d.price);
  const current = prices.at(-1)!;
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const low30 = lowestPrice30Days(history, today);

  const { lo, hi, ticks } = niceTicks(Math.max(0, low * 0.85), high * 1.05);
  const innerW = Math.max(width - PAD.left - PAD.right, 10);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (days.length - 1)) * innerW;
  const y = (price: number) => PAD.top + (1 - (price - lo) / (hi - lo || 1)) * innerH;

  // Trappsteg: priset ligger kvar tills det ändras.
  let line = `M${x(0)},${y(prices[0])}`;
  for (let i = 1; i < days.length; i++) {
    if (prices[i] !== prices[i - 1]) line += ` H${x(i)} V${y(prices[i])}`;
  }
  line += ` H${x(days.length - 1)}`;
  const area = `${line} V${y(lo)} H${x(0)} Z`;

  const months = days
    .map((d, i) => ({ d, i }))
    .filter(({ d }, k) => d.date.endsWith('-01') && k > 3 && k < days.length - 10);

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left - PAD.left) / innerW;
    setActive(Math.min(days.length - 1, Math.max(0, Math.round(rel * (days.length - 1)))));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = e.shiftKey ? 30 : 1;
    const cur = active ?? days.length - 1;
    const next = { ArrowLeft: cur - step, ArrowRight: cur + step, Home: 0, End: days.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(Math.min(days.length - 1, Math.max(0, next)));
  };

  const a = active !== null ? days[active] : null;
  const tipLeft = active !== null ? Math.min(Math.max(x(active), 70), width - 70) : 0;

  return (
    <div className="price-history">
      <dl className="price-history-stats">
        <div>
          <dt>Pris nu</dt>
          <dd>{kr(current)}</dd>
        </div>
        {low30 !== null && (
          <div>
            <dt>Lägsta pris 30 dagar före sänkningen</dt>
            <dd>{kr(low30)}</dd>
          </div>
        )}
        <div>
          <dt>Lägsta senaste året</dt>
          <dd>{kr(low)}</dd>
        </div>
        <div>
          <dt>Högsta senaste året</dt>
          <dd>{kr(high)}</dd>
        </div>
      </dl>

      <div ref={wrapRef} className="price-history-chart">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-labelledby={titleId}
            tabIndex={0}
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
            data-testid="chart-price-history"
          >
            <title id={titleId}>
              {`Prishistorik senaste året. Pris nu ${kr(current)}, lägsta ${kr(low)}, högsta ${kr(high)}. Använd vänster- och högerpil för att se priset en viss dag.`}
            </title>
            {ticks.map((t) => (
              <g key={t}>
                <line className="ph-grid" x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} />
                <text className="ph-axis" x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
                  {`${t} kr`}
                </text>
              </g>
            ))}
            {months.map(({ d, i }) => (
              <text key={d.date} className="ph-axis" x={x(i)} y={HEIGHT - 8} textAnchor="middle">
                {monthShort(d.date)}
              </text>
            ))}
            <path className="ph-area" d={area} />
            <path className="ph-line" d={line} />
            {a && active !== null && (
              <>
                <line className="ph-cross" x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} />
                <circle className="ph-dot" cx={x(active)} cy={y(a.price)} r={5} />
              </>
            )}
            {!a && <circle className="ph-dot" cx={x(days.length - 1)} cy={y(current)} r={5} />}
          </svg>
        )}
        {a && (
          <div className="ph-tip" style={{ left: tipLeft }} aria-live="polite">
            <strong>{kr(a.price)}</strong>
            <span>{dateLong(a.date)}</span>
          </div>
        )}
      </div>

      <details className="price-history-table">
        <summary>Visa prisändringar som tabell</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Från och med</th>
              <th scope="col">Pris</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c) => (
              <tr key={c.from}>
                <td>{dateLong(c.from)}</td>
                <td>{kr(c.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
