"use client";

import { useActionState } from "react";
import { COUNTRIES } from "@/lib/signup";
import { updateProfile } from "./actions";

interface Props {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  jobTitle: string;
}

export default function ProfileForm({ firstName, lastName, phone, country, jobTitle }: Props) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  return (
    <form action={action} className="form">
      <label>
        Nombre
        <input type="text" name="first_name" defaultValue={firstName} autoComplete="given-name" required maxLength={60} />
      </label>
      <label>
        Apellidos
        <input type="text" name="last_name" defaultValue={lastName} autoComplete="family-name" required maxLength={60} />
      </label>
      <label>
        Teléfono
        <input type="tel" name="phone" defaultValue={phone} autoComplete="tel" maxLength={25} placeholder="Opcional" />
      </label>
      <label>
        País
        <select name="country" defaultValue={country} required>
          <option value="" disabled>Elige tu país</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </label>
      <label>
        Cargo
        <input type="text" name="job_title" defaultValue={jobTitle} autoComplete="organization-title" maxLength={80} placeholder="Opcional" />
      </label>

      {state?.error && <p className="form-error" role="alert">{state.error}</p>}
      {state?.ok && <p className="form-saved" role="status">Datos actualizados.</p>}

      <button type="submit" className="btn btn-dark btn-sm" disabled={pending}>
        {pending ? "Guardando…" : "Guardar datos"}
      </button>
    </form>
  );
}
