import { pool } from "@/lib/db";
import { fmtDate, money, nf } from "@/lib/format";
import { requirePermission } from "@/lib/guard";

export default async function RegistrosPage() {
  const session = await requirePermission("records.view");

  const [ws, total, rows] = await Promise.all([
    pool.query("SELECT currency FROM workspaces WHERE id = $1", [session.workspaceId]),
    pool.query("SELECT COUNT(*)::int AS n FROM records WHERE workspace_id = $1", [session.workspaceId]),
    pool.query(
      `SELECT id, to_char(occurred_on, 'YYYY-MM-DD') AS date, amount, category, region, order_ref
         FROM records WHERE workspace_id = $1
        ORDER BY occurred_on DESC, id DESC LIMIT 100`,
      [session.workspaceId],
    ),
  ]);
  const currency: string = ws.rows[0]?.currency ?? "USD";
  const n: number = total.rows[0].n;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Datos</p>
          <h1>Registros</h1>
          <p className="page-sub">
            {n === 0
              ? "Todavía no hay registros en este espacio."
              : `Mostrando los ${nf.format(rows.rowCount ?? 0)} más recientes de ${nf.format(n)}.`}
          </p>
        </div>
      </div>

      <section className="card">
        {rows.rows.length === 0 ? (
          <p className="muted">Cuando importes datos, aparecerán aquí.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Referencia</th>
                  <th>Categoría</th>
                  <th>Región</th>
                  <th className="num">Monto</th>
                </tr>
              </thead>
              <tbody>
                {rows.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.date)}</td>
                    <td>{r.order_ref ?? "—"}</td>
                    <td>{r.category ?? "—"}</td>
                    <td>{r.region ?? "—"}</td>
                    <td className="num">{money(currency, Number(r.amount))}</td>
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
