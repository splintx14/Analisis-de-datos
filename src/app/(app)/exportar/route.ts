import ExcelJS from "exceljs";
import { getSession } from "@/lib/auth";
import { csvText } from "@/lib/csv";
import { pool } from "@/lib/db";
import {
  cleanDate,
  cleanText,
  describeRange,
  filterParams,
  iso,
  RECORDS_WHERE,
} from "@/lib/filters";
import { can } from "@/lib/permissions";

const MAX_ROWS = 50000;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("No autorizado", { status: 401 });
  if (!can(session.role, "data.export")) {
    return new Response("No tienes permiso para exportar.", { status: 403 });
  }

  const q = new URL(req.url).searchParams;
  const desde = cleanDate(q.get("desde"));
  const hasta = cleanDate(q.get("hasta"));
  const categoria = cleanText(q.get("categoria"));
  const region = cleanText(q.get("region"));
  const format = q.get("formato") === "csv" ? "csv" : "xlsx";
  const params = filterParams(session.workspaceId, { desde, hasta, categoria, region });

  const [ws, res] = await Promise.all([
    pool.query("SELECT name, currency FROM workspaces WHERE id = $1", [session.workspaceId]),
    pool.query(
      `SELECT to_char(occurred_on, 'YYYY-MM-DD') AS date, order_ref, category, region, amount
         FROM records WHERE ${RECORDS_WHERE}
        ORDER BY occurred_on, id LIMIT ${MAX_ROWS + 1}`,
      params,
    ),
  ]);

  if (res.rows.length > MAX_ROWS) {
    return new Response(
      `Hay más de ${MAX_ROWS.toLocaleString("es-ES")} registros. Acota el rango o los filtros para exportar.`,
      { status: 413 },
    );
  }

  const currency: string = ws.rows[0]?.currency ?? "USD";
  const total = res.rows.reduce((a, r) => a + Number(r.amount), 0);
  const filename = `reporte-${iso(new Date())}.${format}`;

  await pool.query(
    `INSERT INTO audit_log (workspace_id, user_id, action, entity, metadata)
     VALUES ($1, $2, 'data.exported', 'export', $3::jsonb)`,
    [session.workspaceId, session.userId, JSON.stringify({ format, rows: res.rows.length })],
  );

  if (format === "csv") {
    const lines = ["fecha,referencia,categoria,region,monto"];
    for (const r of res.rows) {
      lines.push(
        [r.date, csvText(r.order_ref), csvText(r.category), csvText(r.region), Number(r.amount).toFixed(2)].join(","),
      );
    }
    return new Response("\uFEFF" + lines.join("\n") + "\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "data.insights";
  wb.created = new Date();

  const summary = wb.addWorksheet("Resumen");
  summary.columns = [{ width: 26 }, { width: 38 }];
  summary.addRow(["Espacio de trabajo", ws.rows[0]?.name ?? ""]);
  summary.addRow(["Rango", describeRange({ desde: desde ?? undefined, hasta: hasta ?? undefined })]);
  summary.addRow(["Categoría", categoria ?? "Todas"]);
  summary.addRow(["Región", region ?? "Todas"]);
  summary.addRow(["Órdenes", res.rows.length]);
  const totalRow = summary.addRow([`Ingresos totales (${currency})`, total]);
  const avgRow = summary.addRow([
    `Valor promedio (${currency})`,
    res.rows.length ? total / res.rows.length : 0,
  ]);
  totalRow.getCell(2).numFmt = "#,##0.00";
  avgRow.getCell(2).numFmt = "#,##0.00";
  summary.getColumn(1).font = { bold: true };

  const sheet = wb.addWorksheet("Registros", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Fecha", key: "date", width: 14, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Referencia", key: "ref", width: 18 },
    { header: "Categoría", key: "category", width: 20 },
    { header: "Región", key: "region", width: 16 },
    { header: `Monto (${currency})`, key: "amount", width: 18, style: { numFmt: "#,##0.00" } },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const r of res.rows) {
    const [y, m, d] = (r.date as string).split("-").map(Number);
    sheet.addRow({
      date: new Date(Date.UTC(y, m - 1, d)),
      ref: r.order_ref ?? "",
      category: r.category ?? "",
      region: r.region ?? "",
      amount: Number(r.amount),
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
