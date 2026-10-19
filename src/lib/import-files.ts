import ExcelJS from "exceljs";
import Papa from "papaparse";
import { buildParsed, type Cell, type ParsedFile } from "./import-parse";

function cellToValue(v: ExcelJS.CellValue): Cell {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return v;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("").trim() || null;
    if ("result" in v) return cellToValue(v.result as ExcelJS.CellValue);
    if ("text" in v) return String(v.text).trim() || null;
  }
  return null;
}

// Lee la primera hoja de un archivo .xlsx.
export async function parseXlsx(buffer: Buffer): Promise<ParsedFile> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as never);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("El libro no tiene hojas");

  const grid: Cell[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: Cell[] = [];
    for (let c = 1; c <= ws.columnCount; c++) cells.push(cellToValue(row.getCell(c).value));
    grid.push(cells);
  });
  return buildParsed(grid);
}

// Lee un archivo .csv (detecta coma, punto y coma o tabulador).
export function parseCsv(text: string): ParsedFile {
  const clean = text.replace(/^\uFEFF/, "");
  const res = Papa.parse<string[]>(clean, { skipEmptyLines: "greedy" });
  const grid: Cell[][] = res.data.map((r) =>
    r.map((c) => {
      const t = String(c ?? "").trim();
      return t === "" ? null : t;
    }),
  );
  return buildParsed(grid);
}
