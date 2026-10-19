import { nf, nf1 } from "@/lib/format";

export interface TrendPoint {
  month: string; // "2026-03"
  revenue: number;
  orders: number;
}

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function monthLabel(month: string, i: number) {
  const [y, m] = month.split("-");
  const name = MONTHS[Number(m) - 1] ?? m;
  return i === 0 || m === "01" ? `${name} ${y.slice(2)}` : name;
}

// Límite superior "redondo" para el eje: 1, 2, 4, 8 o 10 × potencia de 10.
function niceMax(max: number) {
  if (max <= 0) return 4;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / exp;
  const m = f <= 1 ? 1 : f <= 2 ? 2 : f <= 4 ? 4 : f <= 8 ? 8 : 10;
  return m * exp;
}

const axisLabel = (v: number) => (v >= 1000 ? `${nf1.format(v / 1000)} mil` : nf1.format(v));

type Pt = [number, number];
function smoothPath(pts: Pt[]) {
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

export default function TrendChart({
  points,
  currency,
}: {
  points: TrendPoint[];
  currency: string;
}) {
  const W = 760;
  const H = 300;
  const PAD = { l: 58, r: 14, t: 34, b: 34 };
  const plotH = H - PAD.t - PAD.b;
  const n = points.length;
  const slot = (W - PAD.l - PAD.r) / n;
  const barW = Math.min(slot * 0.6, 44);

  const maxRev = Math.max(...points.map((p) => p.revenue));
  const top = niceMax(maxRev);
  const by = (v: number) => PAD.t + (1 - v / top) * plotH;
  const cx = (i: number) => PAD.l + slot * i + slot / 2;

  const orders = points.map((p) => p.orders);
  const minO = Math.min(...orders);
  const span = Math.max(...orders) - minO || 1;
  const cy = (o: number) => PAD.t + 22 + (1 - (o - minO) / span) * plotH * 0.4;

  const linePath = n > 1 ? smoothPath(points.map((p, i) => [cx(i), cy(p.orders)] as Pt)) : "";
  const bestIdx = points.findIndex((p) => p.revenue === maxRev);
  const labelStep = Math.ceil(n / 12);
  const ticks = [0, 1, 2, 3, 4].map((k) => (top / 4) * k);

  const chipText = `${currency} ${nf.format(Math.round(maxRev))}`;
  const chipW = chipText.length * 6.6 + 18;
  const chipX = Math.min(Math.max(cx(bestIdx) - chipW / 2, PAD.l), W - chipW - 4);
  const chipY = Math.max(by(maxRev) - 30, 2);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="trend-chart"
        role="img"
        aria-label={`Ingresos por mes en barras y órdenes en línea. El mejor mes es ${monthLabel(points[bestIdx].month, bestIdx)} con ${chipText}.`}
      >
        <defs>
          <linearGradient id="trendBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fe9cf" />
            <stop offset="100%" stopColor="#22a595" />
          </linearGradient>
          <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5b7fd6" />
            <stop offset="100%" stopColor="#e3a93f" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={by(t)} y2={by(t)} stroke={t === 0 ? "rgba(16,40,58,0.2)" : "rgba(16,40,58,0.08)"} strokeDasharray={t === 0 ? undefined : "3 5"} />
            <text x={PAD.l - 8} y={by(t) + 4} textAnchor="end" className="axis">
              {axisLabel(t)}
            </text>
          </g>
        ))}

        {points.map((p, i) => {
          const h = by(0) - by(p.revenue);
          return (
            <g key={p.month} className="bar-rise" style={{ ["--i" as string]: Math.min(i, 20) }} opacity={i === bestIdx ? 1 : 0.7}>
              <title>{`${monthLabel(p.month, i)}: ${currency} ${nf.format(Math.round(p.revenue))} · ${nf.format(p.orders)} órdenes`}</title>
              <rect x={cx(i) - barW / 2} y={by(p.revenue)} width={barW} height={Math.max(h, 1)} rx={Math.min(10, barW / 2)} fill="url(#trendBar)" />
              {h > 16 && (
                <rect x={cx(i) - barW / 2 + 5} y={by(p.revenue) + 5} width={barW * 0.22} height={h - 12} rx={4} fill="#fff" opacity={0.3} />
              )}
            </g>
          );
        })}

        {linePath && (
          <path d={linePath} fill="none" stroke="url(#trendLine)" strokeWidth="2.6" strokeLinecap="round" pathLength={1} className="line-draw" />
        )}
        <circle cx={cx(n - 1)} cy={cy(points[n - 1].orders)} r="5" fill="#fff" stroke="#e3a93f" strokeWidth="2.5" />

        {points.map((p, i) =>
          i % labelStep === 0 ? (
            <text key={p.month} x={cx(i)} y={H - 10} textAnchor="middle" className="axis">
              {monthLabel(p.month, i)}
            </text>
          ) : null,
        )}

        <g>
          <rect x={chipX} y={chipY} width={chipW} height={22} rx={11} fill="rgba(255,255,255,0.92)" stroke="#fff" />
          <text x={chipX + chipW / 2} y={chipY + 15} textAnchor="middle" className="chip-text">
            {chipText}
          </text>
        </g>
      </svg>

      <div className="legend">
        <span><i className="dot dot-bar" /> Ingresos (barras)</span>
        <span><i className="dot dot-line" /> Órdenes (línea)</span>
      </div>
    </div>
  );
}
