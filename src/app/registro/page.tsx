"use client";

import "./registro.css";
import Link from "next/link";
import { useActionState } from "react";
import Brand from "@/components/Brand";
import { COUNTRIES } from "@/lib/signup";
import { register } from "./actions";

export default function RegistroPage() {
  const [state, action, pending] = useActionState(register, undefined);
  const v = state?.values ?? {};

  return (
    <main className="auth">
      <Brand />
      <section className="auth-card wide">
        <h1>Crea tu cuenta</h1>
        <p className="muted">Serás el propietario del espacio de trabajo de tu empresa.</p>

        <form action={action} className="form">
          <fieldset>
            <legend>Tus datos</legend>
            <div className="form-grid">
              <label>
                Nombre
                <input type="text" name="first_name" defaultValue={v.first_name} autoComplete="given-name" required maxLength={60} />
              </label>
              <label>
                Apellidos
                <input type="text" name="last_name" defaultValue={v.last_name} autoComplete="family-name" required maxLength={60} />
              </label>
              <label>
                Correo
                <input type="email" name="email" defaultValue={v.email} autoComplete="email" required maxLength={254} />
              </label>
              <label>
                Teléfono
                <input type="tel" name="phone" defaultValue={v.phone} autoComplete="tel" placeholder="+57 300 123 4567" maxLength={25} />
                <span className="hint">Opcional.</span>
              </label>
              <label>
                País
                <select name="country" defaultValue={v.country ?? ""} required>
                  <option value="" disabled>Elige tu país</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Cargo
                <input type="text" name="job_title" defaultValue={v.job_title} autoComplete="organization-title" maxLength={80} placeholder="Ej. Gerente de ventas" />
                <span className="hint">Opcional.</span>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Tu empresa</legend>
            <div className="form-grid">
              <label>
                Nombre de la empresa
                <input type="text" name="company" defaultValue={v.company} autoComplete="organization" required maxLength={80} />
              </label>
              <label>
                Identificación fiscal
                <input type="text" name="tax_id" defaultValue={v.tax_id} maxLength={30} placeholder="NIT, RUC, RFC, CIF…" />
                <span className="hint">Opcional. Ayuda a evitar empresas duplicadas.</span>
              </label>
              <p className="hint full">
                Cada empresa tiene un solo espacio. Si tu equipo ya usa data.insights, pide que te inviten
                en lugar de crear otra cuenta.
              </p>
            </div>
          </fieldset>

          <fieldset>
            <legend>Acceso</legend>
            <div className="form-grid">
              <label>
                Contraseña
                <input type="password" name="password" autoComplete="new-password" minLength={10} required />
                <span className="hint">Mínimo 10 caracteres, con letras y números.</span>
              </label>
              <label>
                Repite la contraseña
                <input type="password" name="confirm" autoComplete="new-password" minLength={10} required />
              </label>
            </div>
          </fieldset>

          {/* Campo trampa contra bots: no lo rellenes */}
          <input className="hp" type="text" name="sitio_web" tabIndex={-1} autoComplete="off" aria-hidden="true" />

          {state?.errors && state.errors.length > 0 && (
            <ul className="form-errors" role="alert">
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

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
