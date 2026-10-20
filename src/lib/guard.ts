import { redirect } from "next/navigation";
import { getSession } from "./auth";
import { can, type Permission } from "./permissions";

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// Verifica el permiso en el servidor: ocultar un botón no protege nada.
// Si falta el permiso, se lleva a la persona a la primera página que sí puede ver.
export async function requirePermission(permission: Permission) {
  const session = await requireSession();
  if (!can(session.role, permission)) {
    if (permission !== "dashboard.view" && can(session.role, "dashboard.view")) redirect("/resumen");
    if (permission !== "reports.view" && can(session.role, "reports.view")) redirect("/reportes");
    redirect("/perfil");
  }
  return session;
}
