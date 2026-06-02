import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  images: {
    // Izinkan gambar dari domain mana saja (untuk URL foto dari admin)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
