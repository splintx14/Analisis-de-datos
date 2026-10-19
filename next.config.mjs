/** @type {import('next').NextConfig} */
const nextConfig = {
  // Paquetes nativos / de servidor que no deben empaquetarse
  serverExternalPackages: ["@node-rs/argon2", "pg", "exceljs"],
  experimental: {
    // Permite subir archivos de hasta 5 MB en las acciones del servidor
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
