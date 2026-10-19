"use client";

import { useActionState } from "react";
import { CURRENCIES } from "@/lib/currencies";
import { updateSettings } from "./actions";

interface Props {
  name: string;
  currency: string;
  rangeDays: number;
  refreshMinutes: number;
}

export default function SettingsForm({ name, currency, rangeDays, refreshMinutes }: Props) {
  const [state, action, pending] = useActionState(updateSettings, undefined);

  return (
    <form action={action} className="form settings-form">
      <label>
        Nombre del espacio
        <input type="text" name="name" defaultValue={name} required maxLength={80} />
      </label>

      <label>
        Moneda
        <select name="currency" defaultValue={currency}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
          ))}
        </select>
      </label>

      <label>
        Rango predeterminado (días)
        <input type="number" name="rangeDays" defaultValue={rangeDays} min={1} max={3650} required />
        <span className="hint">Cuántos días atrás muestra el resumen al abrirlo.</span>
      </label>

      <label>
        Actualización automática (minutos)
        <input type="number" name="refreshMinutes" defaultValue={refreshMinutes} min={0} max={1440} required />
        <span className="hint">Cada cuánto se refrescan los datos del resumen. Usa 0 para desactivarla.</span>
      </label>

      {state?.error && <p className="form-error" role="alert">{state.error}</p>}
      {state?.ok && <p className="form-saved" role="status">Cambios guardados.</p>}

      <button type="submit" className="btn btn-dark" disabled={pending}>
        {pending ? "Guardando…" : "Guardar configuración"}
      </button>
    </form>
  );
}
