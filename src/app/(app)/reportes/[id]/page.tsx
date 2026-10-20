import "../reportes.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import DashboardCharts from "@/components/DashboardCharts";
import PrintButton from "@/components/PrintButton";
import { pool } from "@/lib/db";
import { describeRange, exportQuery, resolveFilters, type ReportFilters } from "@/lib/filters";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { deleteReport, toggleShare } from "../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReportePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("reports.view");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const seesAll = session.role === "owner" || session.role === "admin";
  const { rows } = await pool.query(
    `SELECT r.id, r.name, r.filters, r.is_shared, r.created_by, u.name AS author,
            to_char(r.created_at, 'DD/MM/YYYY') AS created
       FROM saved_reports r LEFT JOIN users u ON u.id = r.created_by
      WHERE r.id = $1 AND r.workspace_id = $2
        AND ($3::boolean OR r.is_shared OR r.created_by = $4)`,
    [id, session.workspaceId, seesAll, session.userId],
  );
  const report = rows[0];
  if (!report) notFound();

  const ws = await pool.query("SELECT currency FROM workspaces WHERE id = $1", [session.workspaceId]);
  const currency: string = ws.rows[0]?.currency ?? "USD";

  const stored = (report.filters ?? {}) as ReportFilters;
  const resolved = resolveFilters(stored);
  const canManage =
    can(session.role, "reports.manage") && (seesAll || report.created_by === session.userId);
  const canExport = can(session.role, "data.export");
  const q = exportQuery(resolved);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Reporte</p>
          <h1>{report.name}</h1>
          <p className="page-sub">
            Creado por {report.author ?? "—"} el {report.created} ·{" "}
            <span className={`share-badge ${report.is_shared ? "share-on" : "share-off"}`}>
              {report.is_shared ? "Compartido con el equipo" : "Privado"}
            </span>
          </p>
          <div className="filter-chips">
            <span className="filter-chip">{describeRange(stored)}</span>
            {resolved.categoria && <span className="filter-chip">Categoría: {resolved.categoria}</span>}
            {resolved.region && <span className="filter-chip">Región: {resolved.region}</span>}
          </div>
        </div>
        <Link href="/reportes" className="btn btn-light btn-sm no-print">Volver</Link>
      </div>

      <div className="report-actions no-print">
        {canExport && (
          <>
            <a className="btn btn-light btn-sm" href={`/exportar?${q}${q ? "&" : ""}formato=xlsx`}>Exportar Excel</a>
            <a className="btn btn-light btn-sm" href={`/exportar?${q}${q ? "&" : ""}formato=csv`}>Exportar CSV</a>
          </>
        )}
        <PrintButton />
        {canManage && (
          <>
            <form action={toggleShare}>
              <input type="hidden" name="id" value={report.id} />
              <button type="submit" className="btn btn-light btn-sm">
                {report.is_shared ? "Dejar de compartir" : "Compartir con el equipo"}
              </button>
            </form>
            <details className="confirm">
              <summary>Eliminar</summary>
              <div className="confirm-panel">
                <p>Se eliminará el reporte <strong>{report.name}</strong>. Los datos no se borran.</p>
                <form action={deleteReport}>
                  <input type="hidden" name="id" value={report.id} />
                  <button type="submit" className="btn btn-danger btn-xs">Sí, eliminar</button>
                </form>
              </div>
            </details>
          </>
        )}
      </div>

      <DashboardCharts
        workspaceId={session.workspaceId}
        currency={currency}
        filters={resolved}
        emptyHint={<p className="muted">Prueba a editar este reporte desde el Resumen.</p>}
      />
    </>
  );
}
