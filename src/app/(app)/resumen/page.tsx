import "../reportes/reportes.css";
import Link from "next/link";
import AutoRefresh from "@/components/AutoRefresh";
import DashboardCharts from "@/components/DashboardCharts";
import PrintButton from "@/components/PrintButton";
import { pool } from "@/lib/db";
import {
  cleanDate,
  cleanText,
  daysAgo,
  exportQuery,
  iso,
  type ResolvedFilters,
} from "@/lib/filters";
import { fmtDate } from "@/lib/format";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { SAMPLE_IMPORT_NAME } from "@/lib/sample";
import { saveReport } from "../reportes/actions";
import { loadSampleData, removeSampleData } from "./actions";

type Query = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ResumenPage({ searchParams }: { searchParams: Promise<Query> }) {
  const session = await requirePermission("dashboard.view");
  const sp = await searchParams;

  // Configuración del espacio: moneda, rango inicial y actualización automática
  const wsRes = await pool.query(
    "SELECT currency, default_range_days, auto_refresh_minutes FROM workspaces WHERE id = $1",
    [session.workspaceId],
  );
  const wsRow = wsRes.rows[0];
  const currency: string = wsRow?.currency ?? "USD";
  const refreshMinutes: number = wsRow?.auto_refresh_minutes ?? 0;
  const defaultDays: number = wsRow?.default_range_days ?? 90;

  const today = new Date();

  // Sin fechas en la dirección se usa el rango predeterminado; "?todo=1" muestra todo el historial.
  const dateParamsGiven = sp.desde !== undefined || sp.hasta !== undefined || sp.todo !== undefined;
  const desde = dateParamsGiven ? cleanDate(one(sp.desde)) : daysAgo(defaultDays);
  const hasta = cleanDate(one(sp.hasta));
  const categoria = cleanText(one(sp.categoria));
  const region = cleanText(one(sp.region));
  const filters: ResolvedFilters = { desde, hasta, categoria, region };

  // ¿El rango equivale a "últimos N días"? Así el reporte guardado se mantiene al día.
  let activeDays: number | null = null;
  if (desde) {
    if (!hasta && desde === daysAgo(defaultDays)) activeDays = defaultDays;
    else if (hasta === iso(today)) activeDays = [30, 90, 365].find((n) => desde === daysAgo(n)) ?? null;
  }

  const canImport = can(session.role, "imports.create");
  const canSave = can(session.role, "reports.manage");
  const canExport = can(session.role, "data.export");

  const [options, sample, count] = await Promise.all([
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
    pool.query("SELECT COUNT(*)::int AS n FROM records WHERE workspace_id = $1", [session.workspaceId]),
  ]);

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

  const eq = exportQuery(filters);

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
          <form action={removeSampleData} className="no-print">
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
                Importa tu archivo de Excel o CSV, o carga datos de ejemplo para ver cómo se ve el resumen.
              </p>
              <div className="report-actions">
                <Link href="/importaciones/nueva" className="btn btn-dark">Importar un archivo</Link>
                <form action={loadSampleData}>
                  <button type="submit" className="btn btn-light">Cargar datos de ejemplo</button>
                </form>
              </div>
            </>
          ) : (
            <p className="muted">Pide a un administrador que cargue los datos del espacio.</p>
          )}
        </section>
      ) : (
        <>
          <form className="card filters no-print" method="get">
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

          <div className="presets no-print" aria-label="Rangos rápidos">
            <span className="presets-label">{rangeLabel}</span>
            {presets.map((p) => (
              <Link key={p.label} href={p.to} className="preset">{p.label}</Link>
            ))}
          </div>

          <div className="toolbar no-print">
            {canExport && (
              <>
                <a className="btn btn-light btn-sm" href={`/exportar?${eq}${eq ? "&" : ""}formato=xlsx`}>Exportar Excel</a>
                <a className="btn btn-light btn-sm" href={`/exportar?${eq}${eq ? "&" : ""}formato=csv`}>Exportar CSV</a>
              </>
            )}
            <PrintButton />
            {canSave && (
              <details className="save-report">
                <summary className="btn btn-dark btn-sm">Guardar reporte</summary>
                <form action={saveReport} className="save-panel">
                  <label>
                    Nombre del reporte
                    <input type="text" name="name" required minLength={2} maxLength={80} placeholder="Ej. Ventas del trimestre" />
                  </label>
                  <label className="check">
                    <input type="checkbox" name="share" /> Compartir con el equipo
                  </label>
                  <input type="hidden" name="dias" value={activeDays ?? ""} />
                  <input type="hidden" name="desde" value={desde ?? ""} />
                  <input type="hidden" name="hasta" value={hasta ?? ""} />
                  <input type="hidden" name="categoria" value={categoria ?? ""} />
                  <input type="hidden" name="region" value={region ?? ""} />
                  <button type="submit" className="btn btn-dark btn-sm">Guardar</button>
                </form>
              </details>
            )}
          </div>

          <DashboardCharts
            workspaceId={session.workspaceId}
            currency={currency}
            filters={filters}
            emptyHint={<Link href="/resumen" className="btn btn-light">Limpiar filtros</Link>}
          />
        </>
      )}
    </>
  );
}
