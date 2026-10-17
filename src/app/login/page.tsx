"use client";

import Link from "next/link";
import { useActionState } from "react";
import Brand from "@/components/Brand";
import { login } from "../actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="auth">
      <Brand />
      <section className="auth-card">
        <h1>Inicia sesión</h1>
        <p className="muted">Entra a tu espacio de trabajo.</p>

        <form action={action} className="form">
          <label>
            Correo
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            Contraseña
            <input type="password" name="password" autoComplete="current-password" required />
          </label>

          {state?.error && <p className="form-error" role="alert">{state.error}</p>}

          <button type="submit" className="btn btn-dark" disabled={pending}>
            {pending ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="muted small">
          ¿No tienes cuenta? <Link href="/registro">Crear cuenta</Link>
        </p>
      </section>
    </main>
  );
}
