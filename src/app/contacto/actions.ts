"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { pool } from "@/lib/db";
import { CONTACT_SUBJECTS } from "@/lib/contact";

export type ContactState = { ok?: boolean; error?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre.").max(80, "El nombre es demasiado largo."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Escribe un correo válido.")
    .max(254, "El correo es demasiado largo."),
  subject: z.enum(CONTACT_SUBJECTS, { errorMap: () => ({ message: "Elige un asunto." }) }),
  message: z
    .string()
    .trim()
    .min(10, "El mensaje es muy corto (mínimo 10 caracteres).")
    .max(2000, "El mensaje es demasiado largo (máximo 2000 caracteres)."),
});

const MAX_PER_HOUR = 5;

export async function sendContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // Campo trampa: las personas no lo ven, los bots sí lo rellenan.
  if (String(formData.get("sitio_web") ?? "").trim() !== "") {
    return { ok: true };
  }

  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa el formulario." };
  }
  const { name, email, subject, message } = parsed.data;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  try {
    // Límite sencillo contra abuso: máximo 5 mensajes por hora por IP o correo.
    const recent = await pool.query(
      `SELECT COUNT(*)::int AS n FROM contact_messages
        WHERE (ip = $1 OR email = $2) AND created_at > now() - interval '1 hour'`,
      [ip, email],
    );
    if (recent.rows[0].n >= MAX_PER_HOUR) {
      return { error: "Has enviado varios mensajes seguidos. Inténtalo de nuevo en un rato." };
    }

    await pool.query(
      `INSERT INTO contact_messages (name, email, subject, message, ip)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, email, subject, message, ip],
    );
  } catch (err) {
    console.error(err);
    if ((err as { code?: string }).code === "42P01") {
      return { error: "El formulario todavía no está listo. Inténtalo más tarde." };
    }
    return { error: "No pudimos enviar tu mensaje. Inténtalo de nuevo." };
  }

  return { ok: true };
}
