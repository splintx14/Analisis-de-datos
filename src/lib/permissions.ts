import type { Role } from "./roles";

export type Permission =
  | "dashboard.view"
  | "records.view"
  | "records.edit"
  | "imports.view"
  | "imports.create"
  | "users.manage"
  | "settings.manage";

const FULL: Permission[] = [
  "dashboard.view",
  "records.view",
  "records.edit",
  "imports.view",
  "imports.create",
  "users.manage",
  "settings.manage",
];

// Matriz de permisos por rol. Es la única fuente de verdad:
// el menú, las páginas y las acciones del servidor la consultan.
const MATRIX: Record<Role, Permission[]> = {
  owner: FULL,
  admin: FULL,
  analyst: ["dashboard.view", "records.view", "imports.view", "imports.create"],
  data_editor: [
    "dashboard.view",
    "records.view",
    "records.edit",
    "imports.view",
    "imports.create",
  ],
  viewer: ["dashboard.view", "records.view"],
  guest: [],
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard.view": "Ver el resumen y las gráficas",
  "records.view": "Ver los registros",
  "records.edit": "Corregir registros",
  "imports.view": "Ver el historial de importaciones",
  "imports.create": "Importar datos",
  "users.manage": "Gestionar usuarios y roles",
  "settings.manage": "Cambiar la configuración del espacio",
};

export const can = (role: Role, permission: Permission) =>
  MATRIX[role].includes(permission);

export const permissionsOf = (role: Role) => MATRIX[role];

// ---------- Menú ----------
export type IconName =
  | "dashboard"
  | "table"
  | "upload"
  | "users"
  | "user"
  | "settings";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  permission?: Permission; // sin permiso = visible para cualquier usuario con sesión
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: "Analítica",
    items: [
      { href: "/resumen", label: "Resumen", icon: "dashboard", permission: "dashboard.view" },
    ],
  },
  {
    label: "Datos",
    items: [
      { href: "/registros", label: "Registros", icon: "table", permission: "records.view" },
      { href: "/importaciones", label: "Importaciones", icon: "upload", permission: "imports.view" },
    ],
  },
  {
    label: "Equipo",
    items: [
      { href: "/usuarios", label: "Usuarios", icon: "users", permission: "users.manage" },
    ],
  },
  {
    label: "Cuenta",
    items: [
      { href: "/perfil", label: "Mi perfil", icon: "user" },
      { href: "/configuracion", label: "Configuración", icon: "settings", permission: "settings.manage" },
    ],
  },
];

// Solo se muestran los grupos y enlaces que el rol puede usar.
export function navFor(role: Role): NavGroup[] {
  return NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.permission || can(role, i.permission)),
  })).filter((g) => g.items.length > 0);
}
