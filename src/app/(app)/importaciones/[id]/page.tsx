import "../import.css";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { fmtDate, nf } from "@/lib/format";
import { requirePermission } from "@/lib/guard";
import { MAPPING_FIELDS, toIndex, type Mapping, type ParsedFile, type RowError } from "@/lib/import-parse";
import { validateWithDb } from "@/lib/import-validate";
import { can } from "@/lib/permissions";
import { cancelImport, confirmImport, revertImport } from "../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nf2 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ImportacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("imports.view");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const sp = await searchParams;
  const canCreate = can(session.role, "imports.create");

  const { rows } = await pool.query(
    `SELECT id, filename, status, total_rows, valid_rows, error_rows,
            column_mapping, error_report, raw,
            to_char(created_at, 'DD/MM/YYYY') AS created
       FROM imports WHERE id = $1 AND workspace_id = $2`,
    [id, session.workspaceId],
  );
  const imp = rows[0];
  if (!imp) notFound();

  // ---------- Importación ya procesada ----------
  if (imp.status !== "pending") {
    const errors = (imp.error_report ?? []) as RowError[];
    return (
      <>
        <div className="page-head">
          <div>
            <p className="eyebrow">Importación</p>
            <h1>{imp.filename}</h1>
            <p className="page-sub">
              {imp.status === "completed" && `Importada el ${imp.created}.`}
              {imp.status === "reverted" && "Esta importación fue revertida: sus registros se eliminaron."}
              {imp.status === "failed" && "Esta importación falló."}
            </p>
          </div>
          <Link href="/importaciones" className="btn btn-light btn-sm">Volver</Link>
        </div>

        <section className="card">
          <div className="stats">
            <div className="stat"><span>Filas del archivo</span><strong>{nf.format(imp.total_rows)}</strong></div>
            <div className="stat stat-ok"><span>Importadas</span><strong>{nf.format(imp.valid_rows)}</strong></div>
            <div className="stat stat-bad"><span>Con error</span><strong>{nf.format(imp.error_rows)}</strong></div>
          </div>

          {errors.length > 0 && (
            <>
              <h3 className="sub-h">Filas que no se importaron</h3>
              <ul className="err-list">
                {errors.slice(0, 20).map((e, i) => (
                  <li key={i}>Fila {e.sheetRow}: {e.reason}</li>
                ))}
              </ul>
              {imp.error_rows > 20 && (
                <p className="card-foot">Mostrando 20 de {nf.format(imp.error_rows)} filas con error.</p>
              )}
            </>
          )}

          <div className="actions-row" style={{ marginTop: 20 }}>
            {imp.status === "completed" && (
              <>
                <Link href="/resumen" className="btn btn-dark">Ver el resumen</Link>
                <Link href="/registros" className="btn btn-light">Ver registros</Link>
                {canCreate && (
                  <form action={revertImport}>
                    <input type="hidden" name="id" value={imp.id} />
                    <button type="submit" className="btn btn-light">Revertir esta importación</button>
                  </form>
                )}
              </>
            )}
          </div>
        </section>
      </>
    );
  }

  // ---------- Importación pendiente: revisar y confirmar ----------
  if (!canCreate || !imp.raw) redirect("/importaciones");
  const raw = imp.raw as ParsedFile;
  const len = raw.headers.length;
  const saved = (imp.column_mapping ?? {}) as Mapping;

  const mapping = {} as Mapping;
  for (const f of MAPPING_FIELDS) {
    const q = one(sp[f.key]);
    mapping[f.key] = q !== undefined ? toIndex(q, len) : (saved[f.key] ?? null);
  }

  const result = await validateWithDb(session.workspaceId, raw, mapping);
  const ready = mapping.fecha !== null && mapping.monto !== null && result.valid.length > 0;
  const mappedLabel = (col: number) => MAPPING_FIELDS.find((f) => mapping[f.key] === col)?.label;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Paso 2 de 2</p>
          <h1>Revisa tu importación</h1>
          <p className="page-sub">
            {imp.filename} · {nf.format(raw.rows.length)} filas. Todavía no se ha guardado nada.
          </p>
        </div>
        <Link href="/importaciones" className="btn btn-light btn-sm">Volver</Link>
      </div>

      <section className="card">
        <p className="card-kicker">Columnas</p>
        <h2>¿Qué significa cada columna?</h2>
        <form method="get" className="map-form">
          {MAPPING_FIELDS.map((f) => (
            <label key={f.key}>
              <span>{f.label}{f.required && <span className="req"> *</span>}</span>
              <select name={f.key} defaultValue={mapping[f.key] === null ? "" : String(mapping[f.key])}>
                <option value="">{f.required ? "Elige una columna" : "No usar"}</option>
                {raw.headers.map((h, i) => (
                  <option key={i} value={i}>{h}</option>
                ))}
              </select>
            </label>
          ))}
          <button type="submit" className="btn btn-light btn-sm">Actualizar vista previa</button>
        </form>
      </section>

      <section className="card">
        <p className="card-kicker">Resultado de la revisión</p>
        <h2>Así quedarían tus datos</h2>
        <div className="stats">
          <div className="stat"><span>Filas con datos</span><strong>{nf.format(result.total)}</strong></div>
          <div className="stat stat-ok"><span>Listas para importar</span><strong>{nf.format(result.valid.length)}</strong></div>
          <div className="stat stat-bad"><span>Con error</span><strong>{nf.format(result.errors.length)}</strong></div>
        </div>

        {result.valid.length > 0 && (
          <>
            <h3 className="sub-h">Primeras filas interpretadas</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="num">Monto</th>
                    <th>Categoría</th>
                    <th>Región</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {result.valid.slice(0, 5).map((r) => (
                    <tr key={r.sheetRow}>
                      <td>{fmtDate(r.date)}</td>
                      <td className="num">{nf2.format(r.amount)}</td>
                      <td>{r.category ?? "—"}</td>
                      <td>{r.region ?? "—"}</td>
                      <td>{r.ref ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {result.errors.length > 0 && (
          <>
            <h3 className="sub-h">Filas que se omitirán</h3>
            <ul className="err-list">
              {result.errors.slice(0, 10).map((e, i) => (
                <li key={i}>{e.sheetRow > 0 ? `Fila ${e.sheetRow}: ` : ""}{e.reason}</li>
              ))}
            </ul>
            {result.errors.length > 10 && (
              <p className="card-foot">Mostrando 10 de {nf.format(result.errors.length)} filas con error.</p>
            )}
          </>
        )}

        <h3 className="sub-h">Tu archivo (primeras filas)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {raw.headers.map((h, i) => (
                  <th key={i}>
                    {h}
                    {mappedLabel(i) && <span className="tag">{mappedLabel(i)}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {raw.rows.slice(0, 6).map((row, r) => (
                <tr key={r}>
                  {row.map((c, i) => (
                    <td key={i}>{c === null ? "—" : String(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="actions-row">
        <form action={confirmImport}>
          <input type="hidden" name="id" value={imp.id} />
          {MAPPING_FIELDS.map((f) => (
            <input key={f.key} type="hidden" name={f.key} value={mapping[f.key] === null ? "" : String(mapping[f.key])} />
          ))}
          <button type="submit" className="btn btn-dark" disabled={!ready}>
            Confirmar e importar {ready ? `${nf.format(result.valid.length)} filas` : ""}
          </button>
        </form>
        <form action={cancelImport}>
          <input type="hidden" name="id" value={imp.id} />
          <button type="submit" className="btn btn-light">Descartar</button>
        </form>
      </div>
    </>
  );
}
