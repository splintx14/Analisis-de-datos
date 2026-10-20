import { Pool } from "pg";

// Un solo pool de conexiones, reutilizado en desarrollo aunque Next recargue el código.
// En internet (Vercel) cada función abre pocas conexiones: la base las agrupa.
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000, // la base gratuita puede tardar unos segundos en despertar
  });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;
