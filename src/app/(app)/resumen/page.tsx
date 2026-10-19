import Link from "next/link";
import BarList from "@/components/BarList";
import AutoRefresh from "@/components/AutoRefresh";
import TrendChart, { type TrendPoint } from "@/components/TrendChart";
import { pool } from "@/lib/db";
import { fmtDate, money, nf } from "@/lib/format";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { SAMPLE_IMPORT_NAME } from "@/lib/sample";
import { loadSampleData, removeSampleData } from "./actions";

type Query = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function cleanDate(v: string | undefined) {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : null;
}
const cleanText = (v: string | undefined) => {
  const t = v?.trim().slice(0, 80);
  return t ? t : null;
};
const iso = (d: Date) => d.toISOString().slice(0, 10);

const WHERE = `workspace_id = $1
  AND ($2::date IS NULL OR occurred_on >= $2::date)
  AND ($3::date IS NULL OR occurred_on <= $3::date)
  AND ($4::text IS NULL OR category = $4::text)
  AND ($5::text IS NULL OR region = $5::text)`;

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const session = await requirePermission("dashboard.view");
  const sp = await searchParams;

  // Configuración del espacio: moneda, rango inicial y actualización automática
  const wsRes = await pool.query(
    "SELECT currency, default_range_days, auto_refresh_minutes FROM workspaces WHERE id = $1",
    [session.workspaceId],
  );
  const wsRow = wsRes.rows[0];

  const today = new Date();
  const daysAgo = (d: number) => iso(new Date(today.getTime() - d * 86400000));

  // Sin fechas en la dirección se usa el rango predeterminado; "?todo=1" muestra todo el historial.
  const dateParamsGiven =
    sp.desde !== undefined || sp.hasta !== undefined || sp.todo !== undefined;
  const desde = dateParamsGiven
    ? cleanDate(one(sp.desde))
    : daysAgo(wsRow?.default_range_days ?? 90);
  const hasta = cleanDate(one(sp.hasta));
  const categoria = cleanText(one(sp.categoria));
  const region = cleanText(one(sp.region));
  const params = [session.workspaceId, desde, hasta, categoria, region];
  const canImport = can(session.role, "imports.create");

  const [totals, monthlyRes, byCat, byRegion, options, sample, count] =
    await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS revenue, COUNT(*)::int AS orders
           FROM records WHERE ${WHERE}`,
        params,
      ),
      pool.query(
        `SELECT to_char(date_trunc('month', occurred_on), 'YYYY-MM') AS month,
                SUM(amount) AS revenue, COUNT(*)::int AS orders
           FROM records WHERE ${WHERE} GROUP BY 1 ORDER BY 1`,
        params,
      ),
      pool.query(
        `SELECT COALESCE(category, 'Sin categoría') AS name, SUM(amount) AS value
           FROM records WHERE ${WHERE} GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
        params,
      ),
      pool.query(
        `SELECT COALESCE(region, 'Sin región') AS name, SUM(amount) AS value
           FROM records WHERE ${WHERE} GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
        params,
      ),
      pool.query(
        `SELECT 'categoria' AS kind, category AS value FROM records
          WHERE workspace_id = $1 AND category IS NOT NULL GROUP BY category
         UNION ALL
         SELECT 'region', region FROM records
          WHERE workspace_id = $1 AND region IS NOT NULL GROUP BY region
         ORDER BY 1, 2`,
        [session.workspaceId],
      ),
      pool.query(
        "SELECT EXISTS (SELECT 1 FROM imports WHERE workspace_id = $1 AND filename = $2) AS e",
        [session.workspaceId, SAMPLE_IMPORT_NAME],
      ),
      pool.query("SELECT COUNT(*)::int AS n FROM records WHERE workspace_id = $1", [
        session.workspaceId,
      ]),
    ]);

  const currency: string = wsRow?.currency ?? "USD";
  const refreshMinutes: number = wsRow?.auto_refresh_minutes ?? 0;
  const revenue = Number(totals.rows[0].revenue);
  const orders: number = totals.rows[0].orders;
  const avg = orders ? revenue / orders : 0;

  const monthly: TrendPoint[] = monthlyRes.rows.map((r) => ({
    month: r.month,
    revenue: Number(r.revenue),
    orders: r.orders,
  }));
  const sumRev = (arr: TrendPoint[]) => arr.reduce((a, p) => a + p.revenue, 0);
  let growth: number | null = null;
  if (monthly.length >= 6) {
    const last = sumRev(monthly.slice(-3));
    const prev = sumRev(monthly.slice(-6, -3));
    growth = prev > 0 ? ((last - prev) / prev) * 100 : null;
  }

  const cats = options.rows.filter((r) => r.kind === "categoria").map((r) => r.value as string);
  const regs = options.rows.filter((r) => r.kind === "region").map((r) => r.value as string);
  const totalRecords: number = count.rows[0].n;
  const hasSample: boolean = sample.rows[0].e;

  const href = (o: { desde?: string | null; hasta?: string | null; todo?: boolean }) => {
    const q = new URLSearchParams();
    if (o.todo) q.set("todo", "1");
    if (o.desde) q.set("desde", o.desde);
    if (o.hasta) q.set("hasta", o.hasta);
    if (categoria) q.set("categoria", categoria);
    if (region) q.set("region", region);
    const s = q.toString();
    return s ? `/resumen?${s}` : "/resumen";
  };
  const presets = [
    { label: "30 días", to: href({ desde: daysAgo(30), hasta: iso(today) }) },
    { label: "90 días", to: href({ desde: daysAgo(90), hasta: iso(today) }) },
    { label: "12 meses", to: href({ desde: daysAgo(365), hasta: iso(today) }) },
    { label: "Todo", to: href({ todo: true }) },
  ];

  const rangeLabel =
    desde && hasta
      ? `Del ${fmtDate(desde)} al ${fmtDate(hasta)}`
      : desde
        ? `Desde el ${fmtDate(desde)}`
        : hasta
          ? `Hasta el ${fmtDate(hasta)}`
          : "Todo el historial";

  const growthText =
    growth === null ? "—" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1).replace(".", ",")}%`;

  return (
    <>
      {refreshMinutes > 0 && <AutoRefresh minutes={refreshMinutes} />}
      <div className="page-head">
        <div>
          <p className="eyebrow">Resumen de rendimiento</p>
          <h1>Mira el estado de tu negocio.</h1>
          <p className="page-sub">
            Una lectura clara de tus ingresos, el ritmo de órdenes y los registros que los sustentan.
          </p>
        </div>
        {canImport && hasSample && (
          <form action={removeSampleData}>
            <button type="submit" className="btn btn-light btn-sm">Quitar datos de ejemplo</button>
          </form>
        )}
      </div>

      {totalRecords === 0 ? (
        <section className="card empty">
          <h2>Aún no hay datos en tu espacio</h2>
          {canImport ? (
            <>
              <p className="muted">
                Carga datos de ejemplo para ver cómo se ve el resumen. Después los
                reemplazarás con tus archivos de Excel.
              </p>
              <form action={loadSampleData}>
                <button type="submit" className="btn btn-dark">Cargar datos de ejemplo</button>
              </form>
            </>
          ) : (
            <p className="muted">Pide a un administrador que cargue los datos del espacio.</p>
          )}
        </section>
      ) : (
        <>
          <form className="card filters" method="get">
            <label>
              Desde
              <input type="date" name="desde" defaultValue={desde ?? ""} />
            </label>
            <label>
              Hasta
              <input type="date" name="hasta" defaultValue={hasta ?? ""} />
            </label>
            <label>
              Categoría
              <select name="categoria" defaultValue={categoria ?? ""}>
                <option value="">Todas las categorías</option>
                {cats.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Región
              <select name="region" defaultValue={region ?? ""}>
                <option value="">Todas las regiones</option>
                {regs.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <div className="filters-actions">
              <button type="submit" className="btn btn-dark btn-sm">Aplicar</button>
              <Link href="/resumen" className="link-quiet">Limpiar</Link>
            </div>
          </form>

          <div className="presets" aria-label="Rangos rápidos">
            <span className="presets-label">{rangeLabel}</span>
            {presets.map((p) => (
              <Link key={p.label} href={p.to} className="preset">{p.label}</Link>
            ))}
          </div>

          {orders === 0 ? (
            <section className="card empty">
              <h2>Sin resultados con estos filtros</h2>
              <p className="muted">Prueba con otro rango de fechas, categoría o región.</p>
              <Link href="/resumen" className="btn btn-light">Limpiar filtros</Link>
            </section>
          ) : (
            <>
              <div className="metrics">
                <div className="metric">
                  <span className="metric-icon tone-mint" aria-hidden="true">$</span>
                  <span className="metric-label">Ingresos totales</span>
                  <strong className="metric-value">{money(currency, revenue)}</strong>
                  <span className="metric-hint">En el período seleccionado</span>
                </div>
                <div className="metric">
                  <span className="metric-icon tone-indigo" aria-hidden="true">#</span>
                  <span className="metric-label">Órdenes totales</span>
                  <strong className="metric-value">{nf.format(orders)}</strong>
                  <span className="metric-hint">Cada registro es una orden</span>
                </div>
                <div className="metric">
                  <span className="metric-icon tone-amber" aria-hidden="true">Ø</span>
                  <span className="metric-label">Valor promedio</span>
                  <strong className="metric-value">{money(currency, avg)}</strong>
                  <span className="metric-hint">Por orden</span>
                </div>
                <div className="metric">
                  <span className="metric-icon tone-rose" aria-hidden="true">%</span>
                  <span className="metric-label">Tasa de crecimiento</span>
                  <strong className={`metric-value${growth !== null && growth >= 0 ? " metric-up" : ""}`}>
                    {growthText}
                  </strong>
                  <span className="metric-hint">
                    {growth === null
                      ? "Se necesitan al menos 6 meses de datos"
                      : "Últimos 3 meses vs. los 3 anteriores"}
                  </span>
                </div>
              </div>

              <section className="card">
                <p className="card-kicker">Tendencia temporal</p>
                <h2>Ingresos y ritmo de órdenes</h2>
                <TrendChart points={monthly} currency={currency} />
              </section>

              <div className="dash-two">
                <section className="card">
                  <p className="card-kicker">Desglose</p>
                  <h2>Distribución por categoría</h2>
                  <BarList items={byCat.rows.map((r) => ({ name: r.name, value: Number(r.value) }))} total={revenue} />
                  <p className="card-foot">{nf.format(orders)} órdenes en la distribución</p>
                </section>
                <section className="card">
                  <p className="card-kicker">Desglose</p>
                  <h2>Distribución por región</h2>
                  <BarList items={byRegion.rows.map((r) => ({ name: r.name, value: Number(r.value) }))} total={revenue} />
                  <p className="card-foot">Importes en {currency}</p>
                </section>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
