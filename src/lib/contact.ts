export const CONTACT_SUBJECTS = [
  "Consulta general",
  "Soporte",
  "Ventas o alianzas",
  "Otro",
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];
