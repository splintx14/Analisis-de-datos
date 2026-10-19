import type { Role } from "./roles";

const ROLES: Role[] = ["owner", "admin", "analyst", "data_editor", "viewer", "guest"];
export const isRole = (v: string): v is Role => (ROLES as string[]).includes(v);

// Roles que cada rol puede asignar o invitar.
// Nadie puede crear propietarios; solo el propietario nombra administradores.
export function assignableRoles(actor: Role): Role[] {
  if (actor === "owner") return ["admin", "analyst", "data_editor", "viewer", "guest"];
  if (actor === "admin") return ["analyst", "data_editor", "viewer", "guest"];
  return [];
}

// ¿Puede `actor` cambiar el rol de (o quitar a) alguien que tiene el rol `target`?
export function canManage(actor: Role, target: Role): boolean {
  if (target === "owner") return false;
  if (actor === "owner") return true;
  return actor === "admin" && target !== "admin";
}
