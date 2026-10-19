"use client";

import { useActionState, useState } from "react";
import { createInvitation } from "./actions";

export default function InviteForm({ roles }: { roles: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState(createInvitation, undefined);
  const [copied, setCopied] = useState(false);

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* si el navegador lo impide, se puede copiar a mano */
    }
  }

  return (
    <div className="invite">
      <form action={action} className="invite-form">
        <label>
          Correo de la persona
          <input type="email" name="email" autoComplete="off" required maxLength={254} placeholder="nombre@empresa.com" />
        </label>
        <label>
          Rol
          <select name="role" defaultValue={roles.find((r) => r.value === "viewer")?.value ?? roles[0]?.value}>
            {roles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-dark btn-sm" disabled={pending}>
          {pending ? "Creando…" : "Crear invitación"}
        </button>
      </form>

      {state?.error && <p className="form-error" role="alert">{state.error}</p>}

      {state?.link && (
        <div className="invite-link" role="status">
          <p>
            Invitación creada para <strong>{state.email}</strong>. Envíale este enlace; vale 7 días y
            <strong> solo se muestra ahora</strong>.
          </p>
          <div className="invite-link-row">
            <input type="text" readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace de invitación" />
            <button type="button" className="btn btn-light btn-sm" onClick={() => copy(state.link!)}>
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
