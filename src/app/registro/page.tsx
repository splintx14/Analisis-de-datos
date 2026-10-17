"use client";

import Link from "next/link";
import { useActionState } from "react";
import Brand from "@/components/Brand";
import { register } from "../actions/auth";

export default function RegistroPage() {
  const [state, action, pending] = useActionState(register, undefined);

  return (
    <main className="auth">
      <Brand />
      <section className="auth-card">
        <h1>Crea tu cuenta</h1>
        <p className="muted">Serás el propietario de tu espacio de trabajo.</p>

        <form action={action} className="form">
          <label>
            Nombre
            <input type="text" name="name" autoComplete="name" required />
          </label>
          <label>
            Correo
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            Contraseña
            <input type="password" name="password" autoComplete="new-password" minLength={10} required />
            <span className="hint">Mínimo 10 caracteres.</span>
          </label>
          <label>
            Nombre del espacio de trabajo
            <input type="text" name="workspace" placeholder="Ej. Mi empresa" required />
          </label>

          {state?.error && <p className="form-error" role="alert">{state.error}</p>}

          <button type="submit" className="btn btn-dark" disabled={pending}>
            {pending ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>

        <p className="muted small">
          ¿Ya tienes cuenta? <Link href="/login">Iniciar sesión</Link>
        </p>
      </section>
    </main>
  );
}
