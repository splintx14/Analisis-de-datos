"use client";

import { useActionState } from "react";
import { uploadImport } from "./actions";

export default function UploadForm() {
  const [state, action, pending] = useActionState(uploadImport, undefined);

  return (
    <form action={action} className="upload-form">
      <input
        type="file"
        name="file"
        accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        required
      />
      {state?.error && <p className="form-error" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn-dark" disabled={pending}>
        {pending ? "Leyendo archivo…" : "Subir y revisar"}
      </button>
    </form>
  );
}
