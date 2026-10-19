"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CONTACT_SUBJECTS } from "@/lib/contact";
import { sendContact } from "./actions";

export default function ContactForm() {
  const [state, action, pending] = useActionState(sendContact, undefined);
  const [length, setLength] = useState(0);

  if (state?.ok) {
    return (
      <div className="form-ok" role="status">
        <h2>¡Gracias! Recibimos tu mensaje.</h2>
        <p className="muted">Te responderemos por correo.</p>
        <Link href="/" className="btn btn-light">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <form action={action} className="contact-form">
      <div className="row">
        <label>
          Nombre
          <input type="text" name="name" autoComplete="name" required maxLength={80} />
        </label>
        <label>
          Correo
          <input type="email" name="email" autoComplete="email" required maxLength={254} />
        </label>
      </div>

      <label>
        Asunto
        <select name="subject" defaultValue="" required>
          <option value="" disabled>Elige un asunto</option>
          {CONTACT_SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label>
        Mensaje
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={2000}
          onChange={(e) => setLength(e.target.value.length)}
        />
        <span className="count">{length} / 2000</span>
      </label>

      {/* Campo trampa contra bots: no lo rellenes */}
      <input className="hp" type="text" name="sitio_web" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      {state?.error && <p className="form-error" role="alert">{state.error}</p>}

      <button type="submit" className="btn btn-dark" disabled={pending}>
        {pending ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
