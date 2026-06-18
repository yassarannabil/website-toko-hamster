import type { NextConfig } from "next";

const PROXY_URL = "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactCompiler: true,
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      }
    ],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/katalog',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: `${PROXY_URL}/media/:path*`
      },
      {
        source: '/admin/:path*',
        destination: `${PROXY_URL}/admin/:path*`
      },
      {
        source: '/static/:path*',
        destination: `${PROXY_URL}/static/:path*`
      }
    ];
  }
};

export default nextConfig;
