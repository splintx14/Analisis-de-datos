export const CURRENCIES = [
  { code: "USD", name: "Dólar estadounidense" },
  { code: "EUR", name: "Euro" },
  { code: "MXN", name: "Peso mexicano" },
  { code: "COP", name: "Peso colombiano" },
  { code: "ARS", name: "Peso argentino" },
  { code: "CLP", name: "Peso chileno" },
  { code: "PEN", name: "Sol peruano" },
  { code: "BOB", name: "Boliviano" },
  { code: "UYU", name: "Peso uruguayo" },
  { code: "PYG", name: "Guaraní paraguayo" },
  { code: "VES", name: "Bolívar venezolano" },
  { code: "GTQ", name: "Quetzal guatemalteco" },
  { code: "HNL", name: "Lempira hondureño" },
  { code: "NIO", name: "Córdoba nicaragüense" },
  { code: "CRC", name: "Colón costarricense" },
  { code: "DOP", name: "Peso dominicano" },
  { code: "PAB", name: "Balboa panameño" },
  { code: "BRL", name: "Real brasileño" },
  { code: "GBP", name: "Libra esterlina" },
] as const;

export const CURRENCY_CODES: string[] = CURRENCIES.map((c) => c.code);
