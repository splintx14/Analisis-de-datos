/** @type {import('next').NextConfig} */
const nextConfig = {
  // Paquetes nativos / de servidor que no deben empaquetarse
  serverExternalPackages: ["@node-rs/argon2", "pg"],
};

export default nextConfig;
