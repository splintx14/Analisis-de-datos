// Validaciones del registro y del perfil. Son funciones puras (sin base de datos).

export const COUNTRIES = [
  { code: "AR", name: "Argentina", currency: "ARS" },
  { code: "BO", name: "Bolivia", currency: "BOB" },
  { code: "BR", name: "Brasil", currency: "BRL" },
  { code: "CA", name: "Canadá", currency: "USD" },
  { code: "CL", name: "Chile", currency: "CLP" },
  { code: "CO", name: "Colombia", currency: "COP" },
  { code: "CR", name: "Costa Rica", currency: "CRC" },
  { code: "CU", name: "Cuba", currency: "USD" },
  { code: "EC", name: "Ecuador", currency: "USD" },
  { code: "SV", name: "El Salvador", currency: "USD" },
  { code: "ES", name: "España", currency: "EUR" },
  { code: "US", name: "Estados Unidos", currency: "USD" },
  { code: "FR", name: "Francia", currency: "EUR" },
  { code: "DE", name: "Alemania", currency: "EUR" },
  { code: "GT", name: "Guatemala", currency: "GTQ" },
  { code: "HN", name: "Honduras", currency: "HNL" },
  { code: "IT", name: "Italia", currency: "EUR" },
  { code: "MX", name: "México", currency: "MXN" },
  { code: "NI", name: "Nicaragua", currency: "NIO" },
  { code: "PA", name: "Panamá", currency: "PAB" },
  { code: "PY", name: "Paraguay", currency: "PYG" },
  { code: "PE", name: "Perú", currency: "PEN" },
  { code: "PT", name: "Portugal", currency: "EUR" },
  { code: "PR", name: "Puerto Rico", currency: "USD" },
  { code: "GB", name: "Reino Unido", currency: "GBP" },
  { code: "DO", name: "República Dominicana", currency: "DOP" },
  { code: "UY", name: "Uruguay", currency: "UYU" },
  { code: "VE", name: "Venezuela", currency: "VES" },
  { code: "ZZ", name: "Otro país", currency: "USD" },
] as const;

export const countryByCode = (code: string) => COUNTRIES.find((c) => c.code === code);

// ---------- Texto ----------
const stripAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ---------- Empresa ----------
const LEGAL_SUFFIXES = new Set([
  "sa", "sas", "srl", "sl", "slu", "spa", "ltda", "ltd", "inc", "llc", "corp",
  "corporation", "co", "cia", "cv", "ca", "sc", "sca", "gmbh", "ag", "bv",
  "limitada", "sociedad", "anonima",
]);

// Clave para detectar empresas repetidas: ignora mayúsculas, tildes, signos,
// espacios y la forma legal. "Acme S.A. de C.V." y "ACME" dan la misma clave.
export function companyKey(name: string): string {
  const tokens = stripAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  // "s a" -> "sa", "s r l" -> "srl", "c v" -> "cv"
  const merged: string[] = [];
  let run = "";
  for (const t of tokens) {
    if (t.length === 1 && /[a-z]/.test(t)) {
      run += t;
    } else {
      if (run) merged.push(run);
      run = "";
      merged.push(t);
    }
  }
  if (run) merged.push(run);

  while (merged.length > 1) {
    const last = merged[merged.length - 1];
    if (LEGAL_SUFFIXES.has(last) || last === "de") merged.pop();
    else break;
  }
  return merged.join("");
}

// ---------- Identificación fiscal ----------
export const normalizeTaxId = (s: string) => s.toUpperCase().replace(/[\s.\-_/]/g, "");
export const isValidTaxId = (s: string) => /^[A-Z0-9]{5,20}$/.test(s);

// ---------- Teléfono ----------
export function normalizePhone(s: string): string | null {
  let t = s.trim().replace(/[\s().\-]/g, "");
  if (t.startsWith("00")) t = `+${t.slice(2)}`;
  return /^\+?\d{7,15}$/.test(t) ? t : null;
}

// ---------- Correo ----------
const DISPOSABLE = [
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "temp-mail.org", "yopmail.com", "trashmail.com", "throwawaymail.com",
  "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc",
  "fakeinbox.com", "mintemail.com", "moakt.com",
];

export const emailDomain = (email: string) => email.split("@")[1] ?? "";

export function isDisposable(domain: string): boolean {
  const d = domain.toLowerCase();
  return DISPOSABLE.some((x) => d === x || d.endsWith(`.${x}`));
}

const TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gamil.com": "gmail.com",
  "gmail.con": "gmail.com", "gmail.co": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com", "outlook.con": "outlook.com",
  "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.con": "yahoo.com",
};

// Si el dominio parece un error de tecleo común, propone el correo corregido.
export function typoSuggestion(email: string): string | null {
  const fix = TYPOS[emailDomain(email).toLowerCase()];
  return fix ? `${email.split("@")[0]}@${fix}` : null;
}

export function isEmailShapeValid(email: string): boolean {
  if (email.length > 254) return false;
  const [local, domain, ...rest] = email.split("@");
  if (rest.length > 0 || !local || !domain || local.length > 64) return false;
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  return /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain);
}

// ---------- Contraseña ----------
const COMMON_PASSWORDS = new Set([
  "1234567890", "12345678910", "password12", "password123", "contraseña1",
  "contrasena1", "qwertyuiop", "qwerty12345", "abcdefghij", "1q2w3e4r5t",
  "iloveyou123", "admin12345", "0123456789", "9876543210", "1234512345",
  "passw0rd12", "welcome123", "letmein123", "changeme123",
]);

export function passwordIssue(
  password: string,
  ctx: { email: string; names: string[] },
): string | null {
  if (password.length < 10) return "La contraseña debe tener al menos 10 caracteres.";
  if (password.length > 128) return "La contraseña es demasiado larga (máximo 128).";
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) {
    return "La contraseña debe combinar letras y números.";
  }
  const lower = stripAccents(password).toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return "Esa contraseña es muy común. Elige otra.";
  const local = ctx.email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && lower.includes(local)) return "La contraseña no debe incluir tu correo.";
  for (const n of ctx.names) {
    const key = stripAccents(n).toLowerCase().replace(/\s+/g, "");
    if (key.length >= 4 && lower.includes(key)) return "La contraseña no debe incluir tu nombre.";
  }
  return null;
}

// ---------- Datos personales ----------
const NAME_RE = /^\p{L}[\p{L}\p{M}' .-]*$/u;

function checkPersonName(label: string, v: string, errors: string[]) {
  if (v.length < 2 || v.length > 60) errors.push(`${label}: entre 2 y 60 caracteres.`);
  else if (!NAME_RE.test(v)) errors.push(`${label}: usa solo letras, espacios, guiones o apóstrofes.`);
}

export interface ProfileData {
  firstName: string;
  lastName: string;
  phone: string | null;
  country: string;
  jobTitle: string | null;
}

export function validateProfileFields(raw: Record<string, string>): {
  errors: string[];
  data: ProfileData | null;
} {
  const errors: string[] = [];
  const firstName = (raw.first_name ?? "").trim().replace(/\s+/g, " ");
  const lastName = (raw.last_name ?? "").trim().replace(/\s+/g, " ");
  checkPersonName("Nombre", firstName, errors);
  checkPersonName("Apellidos", lastName, errors);

  const phoneRaw = (raw.phone ?? "").trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) errors.push("Teléfono: escribe entre 7 y 15 dígitos, con o sin código de país.");

  const country = (raw.country ?? "").trim();
  if (!countryByCode(country)) errors.push("Elige tu país.");

  const jobTitle = (raw.job_title ?? "").trim().replace(/\s+/g, " ");
  if (jobTitle.length > 80) errors.push("Cargo: máximo 80 caracteres.");

  if (errors.length > 0) return { errors, data: null };
  return {
    errors,
    data: { firstName, lastName, phone, country, jobTitle: jobTitle || null },
  };
}

// ---------- Registro completo ----------
export interface SignupData extends ProfileData {
  email: string;
  password: string;
  company: string;
  companyKey: string;
  taxId: string | null;
  taxIdKey: string | null;
}

export function validateSignupFields(raw: Record<string, string>): {
  errors: string[];
  data: SignupData | null;
} {
  const profile = validateProfileFields(raw);
  const errors = [...profile.errors];

  const email = (raw.email ?? "").trim().toLowerCase();
  if (!email) {
    errors.push("Escribe tu correo.");
  } else if (!isEmailShapeValid(email)) {
    errors.push("El correo no es válido.");
  } else {
    const suggestion = typoSuggestion(email);
    if (suggestion) errors.push(`¿Quisiste decir ${suggestion}?`);
    else if (isDisposable(emailDomain(email))) {
      errors.push("No aceptamos correos temporales. Usa tu correo personal o de trabajo.");
    }
  }

  const company = (raw.company ?? "").trim().replace(/\s+/g, " ");
  const key = companyKey(company);
  if (company.length < 2 || company.length > 80) errors.push("Empresa: entre 2 y 80 caracteres.");
  else if (key.length < 2) errors.push("Empresa: escribe un nombre válido.");

  const taxRaw = (raw.tax_id ?? "").trim();
  const taxId = taxRaw ? normalizeTaxId(taxRaw) : null;
  if (taxId && !isValidTaxId(taxId)) {
    errors.push("Identificación fiscal: usa entre 5 y 20 letras o números (sin símbolos).");
  }

  const password = raw.password ?? "";
  if ((raw.confirm ?? "") !== password) {
    errors.push("La confirmación no coincide con la contraseña.");
  } else {
    const issue = passwordIssue(password, {
      email,
      names: [profile.data?.firstName ?? (raw.first_name ?? ""), profile.data?.lastName ?? (raw.last_name ?? "")],
    });
    if (issue) errors.push(issue);
  }

  if (errors.length > 0 || !profile.data) return { errors, data: null };
  return {
    errors,
    data: {
      ...profile.data,
      email,
      password,
      company,
      companyKey: key,
      taxId,
      taxIdKey: taxId,
    },
  };
}
