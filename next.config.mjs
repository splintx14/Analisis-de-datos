/** @type {import('next').NextConfig} */
const nextConfig = {
  // Paquetes nativos / de servidor que no deben empaquetarse
  serverExternalPackages: ["@node-rs/argon2", "pg", "exceljs"],
  experimental: {
    // Vercel limita cada petición a 4,5 MB, así que los archivos subidos son de hasta 4 MB
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;
