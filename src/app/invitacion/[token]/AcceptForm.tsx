"use client";

import { useActionState } from "react";
import { acceptInvitation } from "../actions";

export default function AcceptForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(acceptInvitation, undefined);

  return (
    <form action={action} className="form">
      <input type="hidden" name="token" value={token} />
      <label>
        Correo
        <input type="email" value={email} readOnly />
      </label>
      <label>
        Tu nombre
        <input type="text" name="name" autoComplete="name" required />
      </label>
      <label>
        Contraseña
        <input type="password" name="password" autoComplete="new-password" minLength={10} required />
        <span className="hint">Mínimo 10 caracteres.</span>
      </label>

      {state?.error && <p className="form-error" role="alert">{state.error}</p>}

      <button type="submit" className="btn btn-dark" disabled={pending}>
        {pending ? "Creando cuenta…" : "Aceptar y entrar"}
      </button>
    </form>
  );
}
