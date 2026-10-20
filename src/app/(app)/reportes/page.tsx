import "./reportes.css";
import Link from "next/link";
import { pool } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";

export default async function ReportesPage() {
  const session = await requirePermission("reports.view");
  const seesAll = session.role === "owner" || session.role === "admin";

  const { rows } = await pool.query(
    `SELECT r.id, r.name, r.is_shared, r.created_by, u.name AS author,
            to_char(r.created_at, 'DD/MM/YYYY') AS created
       FROM saved_reports r LEFT JOIN users u ON u.id = r.created_by
      WHERE r.workspace_id = $1 AND ($2::boolean OR r.is_shared OR r.created_by = $3)
      ORDER BY r.created_at DESC LIMIT 200`,
    [session.workspaceId, seesAll, session.userId],
  );

  const canSave = can(session.role, "reports.manage") && can(session.role, "dashboard.view");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Analítica</p>
          <h1>Reportes guardados</h1>
          <p className="page-sub">
            Vistas del resumen con sus filtros, listas para abrir con un clic, compartir y exportar.
          </p>
        </div>
        {canSave && <Link href="/resumen" className="btn btn-dark">Crear desde el resumen</Link>}
      </div>

      <section className="card">
        {rows.length === 0 ? (
          <p className="muted">
            {canSave
              ? "Aún no hay reportes. Ajusta los filtros en el Resumen y pulsa «Guardar reporte»."
              : "Todavía no hay reportes disponibles para ti."}
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reporte</th>
                  <th>Creado por</th>
                  <th>Fecha</th>
                  <th>Visibilidad</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/reportes/${r.id}`}><strong>{r.name}</strong></Link></td>
                    <td>{r.author ?? "—"}</td>
                    <td>{r.created}</td>
                    <td>
                      <span className={`share-badge ${r.is_shared ? "share-on" : "share-off"}`}>
                        {r.is_shared ? "Compartido" : "Privado"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
