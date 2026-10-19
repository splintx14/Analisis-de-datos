import { redirect } from "next/navigation";
import { getSession } from "./auth";
import { can, type Permission } from "./permissions";

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// Verifica el permiso en el servidor: ocultar un botón no protege nada.
export async function requirePermission(permission: Permission) {
  const session = await requireSession();
  if (!can(session.role, permission)) {
    const canSeeDashboard =
      permission !== "dashboard.view" && can(session.role, "dashboard.view");
    redirect(canSeeDashboard ? "/resumen" : "/perfil");
  }
  return session;
}
