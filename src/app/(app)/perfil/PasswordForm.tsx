"use client";

import { useActionState } from "react";
import { changePassword } from "./actions";

export default function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    <form action={action} className="form">
      <label>
        Contraseña actual
        <input type="password" name="current" autoComplete="current-password" required />
      </label>
      <label>
        Nueva contraseña
        <input type="password" name="next" autoComplete="new-password" minLength={10} required />
        <span className="hint">Mínimo 10 caracteres.</span>
      </label>
      <label>
        Repite la nueva contraseña
        <input type="password" name="confirm" autoComplete="new-password" minLength={10} required />
      </label>

      {state?.error && <p className="form-error" role="alert">{state.error}</p>}
      {state?.ok && (
        <p className="form-saved" role="status">
          Contraseña cambiada. Se cerró la sesión en tus otros dispositivos.
        </p>
      )}

      <button type="submit" className="btn btn-dark btn-sm" disabled={pending}>
        {pending ? "Cambiando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
