import "./print.css";
import { pool } from "@/lib/db";
import { filterParams, RECORDS_WHERE, type ResolvedFilters } from "@/lib/filters";
import { money, nf } from "@/lib/format";
import BarList from "./BarList";
import TrendChart, { type TrendPoint } from "./TrendChart";

// Indicadores y gráficas para unos filtros dados. Lo usan el Resumen y los reportes guardados.
export default async function DashboardCharts({
  workspaceId,
  currency,
  filters,
  emptyHint,
}: {
  workspaceId: string;
  currency: string;
  filters: ResolvedFilters;
  emptyHint?: React.ReactNode;
}) {
  const params = filterParams(workspaceId, filters);

  const [totals, monthlyRes, byCat, byRegion] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS revenue, COUNT(*)::int AS orders
         FROM records WHERE ${RECORDS_WHERE}`,
      params,
    ),
    pool.query(
      `SELECT to_char(date_trunc('month', occurred_on), 'YYYY-MM') AS month,
              SUM(amount) AS revenue, COUNT(*)::int AS orders
         FROM records WHERE ${RECORDS_WHERE} GROUP BY 1 ORDER BY 1`,
      params,
    ),
    pool.query(
      `SELECT COALESCE(category, 'Sin categoría') AS name, SUM(amount) AS value
         FROM records WHERE ${RECORDS_WHERE} GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
      params,
    ),
    pool.query(
      `SELECT COALESCE(region, 'Sin región') AS name, SUM(amount) AS value
         FROM records WHERE ${RECORDS_WHERE} GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
      params,
    ),
  ]);

  const revenue = Number(totals.rows[0].revenue);
  const orders: number = totals.rows[0].orders;
  const avg = orders ? revenue / orders : 0;

  if (orders === 0) {
    return (
      <section className="card empty">
        <h2>Sin resultados con estos filtros</h2>
        <p className="muted">No hay registros para este rango, categoría o región.</p>
        {emptyHint}
      </section>
    );
  }

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
  const growthText =
    growth === null ? "—" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1).replace(".", ",")}%`;

  return (
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
  );
}
