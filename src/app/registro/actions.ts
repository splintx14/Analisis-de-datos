"use server";

import { resolve4, resolve6, resolveMx } from "node:dns/promises";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, hashPassword } from "@/lib/auth";
import { CURRENCY_CODES } from "@/lib/currencies";
import { pool } from "@/lib/db";
import { countryByCode, emailDomain, validateSignupFields } from "@/lib/signup";

export type RegisterState =
  | { errors?: string[]; values?: Record<string, string> }
  | undefined;

const FIELDS = [
  "first_name", "last_name", "email", "phone", "country",
  "job_title", "company", "tax_id", "password", "confirm",
] as const;

const MAX_PER_HOUR = 5;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), ms),
    ),
  ]);
}

const isMissing = (e: unknown) => {
  const code = (e as { code?: string }).code;
  return code === "ENOTFOUND" || code === "ENODATA";
};

// ¿El dominio del correo existe y puede recibir mensajes? Si la consulta
// falla por otro motivo (tiempo agotado, red), no se bloquea el registro.
async function domainCanReceiveMail(domain: string): Promise<boolean> {
  const lookups = [
    () => resolveMx(domain).then((r) => r.length > 0),
    () => resolve4(domain).then((r) => r.length > 0),
    () => resolve6(domain).then((r) => r.length > 0),
  ];
  for (const lookup of lookups) {
    try {
      if (await withTimeout(lookup(), 3000)) return true;
    } catch (e) {
      if (!isMissing(e)) return true;
    }
  }
  return false;
}

export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const raw: Record<string, string> = {};
  for (const f of FIELDS) raw[f] = String(formData.get(f) ?? "");

  // Se devuelven los datos escritos (menos las contraseñas) para no obligar a repetirlos.
  const values: Record<string, string> = { ...raw };
  delete values.password;
  delete values.confirm;
  const fail = (...errors: string[]): RegisterState => ({ errors, values });

  // Campo trampa contra bots
  if (String(formData.get("sitio_web") ?? "").trim() !== "") {
    return fail("No se pudo crear la cuenta. Inténtalo de nuevo.");
  }

  const { errors, data } = validateSignupFields(raw);
  if (!data) return fail(...errors);

  if (!(await domainCanReceiveMail(emailDomain(data.email)))) {
    return fail("El dominio de ese correo no existe o no recibe mensajes. Revísalo.");
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  if (ip) {
    const recent = await pool.query(
      `SELECT COUNT(*)::int AS n FROM audit_log
        WHERE action = 'user.registered' AND metadata->>'ip' = $1
          AND created_at > now() - interval '1 hour'`,
      [ip],
    );
    if (recent.rows[0].n >= MAX_PER_HOUR) {
      return fail("Se crearon varias cuentas desde tu conexión. Inténtalo de nuevo más tarde.");
    }
  }

  // Duplicados: se avisa de todo a la vez para que se corrija de una sola vez.
  const dup = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM users WHERE email = $1) AS email_taken,
            EXISTS (SELECT 1 FROM workspaces WHERE name_key = $2) AS company_taken,
            ($3::text IS NOT NULL AND EXISTS (SELECT 1 FROM workspaces WHERE tax_id_key = $3)) AS tax_taken`,
    [data.email, data.companyKey, data.taxIdKey],
  );
  const taken = dup.rows[0];
  const dupErrors: string[] = [];
  if (taken.email_taken) dupErrors.push("Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.");
  if (taken.company_taken) {
    dupErrors.push("Ya existe un espacio con el nombre de esa empresa. Si tu equipo ya usa data.insights, pide que te inviten.");
  }
  if (taken.tax_taken) dupErrors.push("Ya existe un espacio con esa identificación fiscal.");
  if (dupErrors.length > 0) return fail(...dupErrors);

  const passwordHash = await hashPassword(data.password);
  const country = countryByCode(data.country);
  const currency = country && CURRENCY_CODES.includes(country.currency) ? country.currency : "USD";
  const fullName = `${data.firstName} ${data.lastName}`;

  const client = await pool.connect();
  let userId = "";
  try {
    await client.query("BEGIN");
    const user = await client.query(
      `INSERT INTO users (email, name, first_name, last_name, phone, country, job_title, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [data.email, fullName, data.firstName, data.lastName, data.phone, data.country, data.jobTitle, passwordHash],
    );
    userId = user.rows[0].id;

    const ws = await client.query(
      `INSERT INTO workspaces (name, name_key, tax_id, tax_id_key, currency, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [data.company, data.companyKey, data.taxId, data.taxIdKey, currency, userId],
    );
    await client.query(
      "INSERT INTO memberships (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
      [ws.rows[0].id, userId],
    );
    await client.query(
      `INSERT INTO audit_log (workspace_id, user_id, action, metadata)
       VALUES ($1, $2, 'user.registered', $3::jsonb)`,
      [ws.rows[0].id, userId, JSON.stringify({ ip })],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    const e = err as { code?: string; constraint?: string };
    if (e.code === "23505") {
      // Otra persona se registró con los mismos datos justo antes que tú.
      if (e.constraint === "users_email_key") return fail("Ya existe una cuenta con ese correo.");
      if (e.constraint === "workspaces_name_key_idx") return fail("Ya existe un espacio con el nombre de esa empresa.");
      if (e.constraint === "workspaces_tax_id_key_idx") return fail("Ya existe un espacio con esa identificación fiscal.");
    }
    console.error(err);
    return fail("No se pudo crear la cuenta. Inténtalo de nuevo.");
  } finally {
    client.release();
  }

  await createSession(userId);
  redirect("/resumen");
}
