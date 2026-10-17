// Vista previa del dashboard con datos de ejemplo (solo para la página de inicio).
// Todas las cifras salen de los mismos datos, así que siempre cuadran entre sí.

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep"];
const REVENUE = [12.4, 14.1, 15.0, 13.2, 14.6, 13.8, 14.2, 12.9, 17.6]; // miles de USD
const ORDERS = [18, 21, 24, 19, 22, 20, 23, 18, 26];

const nf = new Intl.NumberFormat("es-ES");
const usd = (n: number) => `USD ${nf.format(Math.round(n))}`;
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const totalRevenue = sum(REVENUE) * 1000;
const totalOrders = sum(ORDERS);
const avgOrder = totalRevenue / totalOrders;
const growth =
  ((sum(REVENUE.slice(-3)) - sum(REVENUE.slice(-6, -3))) / sum(REVENUE.slice(-6, -3))) * 100;

// Las categorías suman exactamente el total de ingresos.
const round100 = (n: number) => Math.round(n / 100) * 100;
const svc = round100(totalRevenue * 0.38);
const hw = round100(totalRevenue * 0.29);
const sw = round100(totalRevenue * 0.19);
const CATEGORIES = [
  { name: "Servicios", value: svc },
  { name: "Hardware", value: hw },
  { name: "Software", value: sw },
  { name: "Suscripciones", value: totalRevenue - svc - hw - sw },
];
const maxCategory = Math.max(...CATEGORIES.map((c) => c.value));

// ---------- Gráfico combinado: barras (ingresos) + línea (órdenes) ----------
const W = 560;
const H = 250;
const PAD = { l: 12, r: 12, t: 34, b: 30 };
const MAX_Y = 20;
const plotH = H - PAD.t - PAD.b;
const slot = (W - PAD.l - PAD.r) / REVENUE.length;
const barW = slot * 0.58;

const bx = (i: number) => PAD.l + slot * i + (slot - barW) / 2;
const by = (v: number) => PAD.t + (1 - v / MAX_Y) * plotH;
const cx = (i: number) => PAD.l + slot * i + slot / 2;

const minO = Math.min(...ORDERS);
const maxO = Math.max(...ORDERS);
const cy = (o: number) =>
  PAD.t + 24 + (1 - (o - minO) / (maxO - minO)) * plotH * 0.45;

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

const linePath = smoothPath(ORDERS.map((o, i) => [cx(i), cy(o)] as Pt));
const lastIdx = REVENUE.length - 1;
const bestIdx = REVENUE.indexOf(Math.max(...REVENUE));
const secondIdx = REVENUE.indexOf(Math.max(...REVENUE.filter((_, i) => i !== bestIdx)));
const HIGHLIGHT = new Set([bestIdx, secondIdx]);
const gridLines = [0, 5, 10, 15];

function Chip({ i }: { i: number }) {
  const text = usd(REVENUE[i] * 1000);
  const w = text.length * 6.6 + 18;
  const x = Math.min(Math.max(cx(i) - w / 2, 4), W - w - 4);
  const y = by(REVENUE[i]) - 32;
  return (
    <g>
      <rect x={x} y={y} width={w} height={22} rx={11} fill="rgba(255,255,255,0.9)" stroke="#fff" />
      <text x={x + w / 2} y={y + 15} textAnchor="middle" className="chip-text">
        {text}
      </text>
    </g>
  );
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export default function PreviewDashboard() {
  return (
    <section className="preview" aria-label="Vista previa del dashboard con datos de ejemplo">
      <header className="preview-head">
        <div>
          <p className="preview-kicker">Tu espacio de trabajo</p>
          <h2>Resumen de enero a septiembre</h2>
        </div>
        <span className="badge">Datos de ejemplo</span>
      </header>

      <div className="kpis">
        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Ingresos totales</span>
            <svg className="kpi-icon" {...iconProps}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v10M14.8 9.4c0-1.2-1.2-1.9-2.8-1.9s-2.8.7-2.8 1.9 1.2 1.7 2.8 2.1 2.8.9 2.8 2.1-1.2 1.9-2.8 1.9-2.8-.7-2.8-1.9" />
            </svg>
          </div>
          <strong className="kpi-value">{usd(totalRevenue)}</strong>
          <span className="kpi-hint">Enero a septiembre</span>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Órdenes</span>
            <svg className="kpi-icon" {...iconProps}>
              <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
              <path d="M3 8l9 5 9-5M12 13v8" />
            </svg>
          </div>
          <strong className="kpi-value">{nf.format(totalOrders)}</strong>
          <span className="kpi-hint">Promedio {usd(avgOrder)}</span>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Crecimiento</span>
            <svg className="kpi-icon" {...iconProps}>
              <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
            </svg>
          </div>
          <strong className="kpi-value kpi-up">
            {growth >= 0 ? "+" : ""}
            {growth.toFixed(1).replace(".", ",")}%
          </strong>
          <span className="kpi-hint">Últimos 3 meses vs. 3 anteriores</span>
        </div>
      </div>

      <div className="chart-block glass-inset">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="combo-chart"
          role="img"
          aria-label={`Ingresos mensuales en barras y órdenes en línea, de enero a septiembre. Septiembre es el mejor mes con ${usd(REVENUE[lastIdx] * 1000)} y ${ORDERS[lastIdx]} órdenes.`}
        >
          <defs>
            <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8fe9cf" />
              <stop offset="100%" stopColor="#22a595" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5b7fd6" />
              <stop offset="100%" stopColor="#e3a93f" />
            </linearGradient>
          </defs>

          {gridLines.map((t) => (
            <line key={t} x1={PAD.l} x2={W - PAD.r} y1={by(t)} y2={by(t)} stroke="rgba(16,40,58,0.08)" strokeDasharray="3 5" />
          ))}
          <line x1={PAD.l} x2={W - PAD.r} y1={by(0)} y2={by(0)} stroke="rgba(16,40,58,0.18)" />

          {REVENUE.map((v, i) => {
            const h = by(0) - by(v);
            return (
              <g key={MONTHS[i]} className="bar-rise" style={{ ["--i" as string]: i }} opacity={HIGHLIGHT.has(i) ? 1 : 0.62}>
                <rect x={bx(i)} y={by(v)} width={barW} height={h} rx={10} fill="url(#barFill)" />
                <rect x={bx(i) + 5} y={by(v) + 5} width={barW * 0.24} height={Math.max(h - 12, 4)} rx={5} fill="#fff" opacity={0.3} />
              </g>
            );
          })}

          <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.6" strokeLinecap="round" pathLength={1} className="line-draw" />
          <circle cx={cx(lastIdx)} cy={cy(ORDERS[lastIdx])} r="5" fill="#fff" stroke="#e3a93f" strokeWidth="2.5" />

          {MONTHS.map((m, i) => (
            <text key={m} x={cx(i)} y={H - 8} textAnchor="middle" className="axis">
              {m}
            </text>
          ))}

          <Chip i={secondIdx} />
          <Chip i={bestIdx} />
        </svg>

        <div className="legend">
          <span><i className="dot dot-bar" /> Ingresos (barras)</span>
          <span><i className="dot dot-line" /> Órdenes (línea)</span>
        </div>
      </div>

      <div className="chart-block">
        <h3>Ingresos por categoría <span className="unit">USD</span></h3>
        <ul className="bars">
          {CATEGORIES.map((c, i) => (
            <li key={c.name} className="bar-row" style={{ ["--i" as string]: i }}>
              <span className="bar-name">{c.name}</span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${(c.value / maxCategory) * 100}%` }} />
              </span>
              <span className="bar-value">{nf.format(c.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
