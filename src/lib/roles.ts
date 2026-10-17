export type Role =
  | "owner"
  | "admin"
  | "analyst"
  | "data_editor"
  | "viewer"
  | "guest";

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Propietario",
  admin: "Administrador",
  analyst: "Analista",
  data_editor: "Editor de datos",
  viewer: "Lector",
  guest: "Invitado",
};
