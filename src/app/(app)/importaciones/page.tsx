import Link from "next/link";
import { pool } from "@/lib/db";
import { nf } from "@/lib/format";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Por confirmar", tone: "chip-warn" },
  processing: { label: "Procesando", tone: "chip-warn" },
  completed: { label: "Completada", tone: "chip-ok" },
  failed: { label: "Fallida", tone: "chip-bad" },
  reverted: { label: "Revertida", tone: "chip-warn" },
};

export default async function ImportacionesPage() {
  const session = await requirePermission("imports.view");
  const canCreate = can(session.role, "imports.create");

  const { rows } = await pool.query(
    `SELECT i.id, i.filename, i.status, i.total_rows, i.valid_rows, i.error_rows,
            to_char(i.created_at, 'DD/MM/YYYY') AS created, u.name AS uploader
       FROM imports i LEFT JOIN users u ON u.id = i.uploaded_by
      WHERE i.workspace_id = $1
      ORDER BY i.created_at DESC LIMIT 50`,
    [session.workspaceId],
  );

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Datos</p>
          <h1>Importaciones</h1>
          <p className="page-sub">Sube archivos de Excel o CSV y revisa el historial de cargas de tu espacio.</p>
        </div>
        {canCreate && (
          <Link href="/importaciones/nueva" className="btn btn-dark">Nueva importación</Link>
        )}
      </div>

      <section className="card">
        <p className="card-kicker">Historial</p>
        <h2>Cargas anteriores</h2>
        {rows.length === 0 ? (
          <p className="muted">
            Aún no hay importaciones.
            {canCreate && " Sube tu primer archivo con el botón «Nueva importación»."}
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Fecha</th>
                  <th>Cargado por</th>
                  <th className="num">Filas válidas</th>
                  <th className="num">Con error</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = STATUS[r.status] ?? { label: r.status, tone: "chip-warn" };
                  return (
                    <tr key={r.id}>
                      <td><Link href={`/importaciones/${r.id}`}><strong>{r.filename}</strong></Link></td>
                      <td>{r.created}</td>
                      <td>{r.uploader ?? "—"}</td>
                      <td className="num">{nf.format(r.valid_rows)} / {nf.format(r.total_rows)}</td>
                      <td className="num">{nf.format(r.error_rows)}</td>
                      <td><span className={`chip ${st.tone}`}>{st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
