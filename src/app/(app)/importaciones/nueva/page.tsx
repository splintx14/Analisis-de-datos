import "../import.css";
import Link from "next/link";
import { requirePermission } from "@/lib/guard";
import UploadForm from "../UploadForm";

export default async function NuevaImportacionPage() {
  await requirePermission("imports.create");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Datos</p>
          <h1>Nueva importación</h1>
          <p className="page-sub">
            Sube un archivo de Excel o CSV. Antes de guardar nada, podrás revisar
            cómo se interpretan las columnas.
          </p>
        </div>
        <Link href="/importaciones" className="btn btn-light btn-sm">Volver</Link>
      </div>

      <section className="card">
        <p className="card-kicker">Paso 1 de 2</p>
        <h2>Elige tu archivo</h2>
        <UploadForm />
      </section>

      <section className="card">
        <p className="card-kicker">Antes de subir</p>
        <h2>Cómo preparar el archivo</h2>
        <ul className="hint-list">
          <li>Formatos: <strong>.xlsx</strong> (se lee la primera hoja) o <strong>.csv</strong>. Máximo 5 MB y 20.000 filas.</li>
          <li>La primera fila debe ser el encabezado con el nombre de cada columna.</li>
          <li>Obligatorias: una columna de <strong>fecha</strong> y una de <strong>monto</strong>. Opcionales: categoría, región y referencia u orden.</li>
          <li>Las fechas pueden venir como 2026-03-15 o 15/03/2026 (día primero). Los montos aceptan formatos como 1234.56, 1.234,56 o $ 1,234.56.</li>
          <li>Si usas una referencia u orden, no se importarán dos veces la misma.</li>
        </ul>
        <p className="card-foot">
          ¿No sabes cómo empezar? <a href="/importaciones/plantilla" download><strong>Descarga una plantilla de ejemplo</strong></a>.
        </p>
      </section>
    </>
  );
}
