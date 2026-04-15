import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // @ts-expect-error: Esta propiedad es nueva en Next 16 y aún no existe en las definiciones de tipos oficiales
    allowedDevOrigins: ["http://127.0.0.1:3000", "http://localhost:3000"],
  },
};

export default nextConfig;
