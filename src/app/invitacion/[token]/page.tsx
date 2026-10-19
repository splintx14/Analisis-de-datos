import Link from "next/link";
import Brand from "@/components/Brand";
import { pool } from "@/lib/db";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { hashToken, TOKEN_RE } from "@/lib/token";
import AcceptForm from "./AcceptForm";

export default async function InvitacionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let invite: { email: string; role: Role; workspace: string } | null = null;
  if (TOKEN_RE.test(token)) {
    const { rows } = await pool.query(
      `SELECT i.email, i.role, w.name AS workspace
         FROM invitations i JOIN workspaces w ON w.id = i.workspace_id
        WHERE i.token_hash = $1 AND i.accepted_at IS NULL AND i.expires_at > now()`,
      [hashToken(token)],
    );
    invite = rows[0] ?? null;
  }

  return (
    <main className="auth">
      <Brand />
      <section className="auth-card">
        {invite ? (
          <>
            <h1>Te invitaron a unirte</h1>
            <p className="muted">
              Entrarás al espacio <strong>{invite.workspace}</strong> como{" "}
              <strong>{ROLE_LABELS[invite.role]}</strong>. Crea tu cuenta para aceptar.
            </p>
            <AcceptForm token={token} email={invite.email} />
          </>
        ) : (
          <>
            <h1>Invitación no válida</h1>
            <p className="muted">
              Este enlace no existe, ya se usó o venció. Pídele a quien te invitó que cree una nueva.
            </p>
            <p className="small">
              ¿Ya tienes cuenta? <Link href="/login">Iniciar sesión</Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
