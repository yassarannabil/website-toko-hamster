import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
        destination: `${API_URL}/media/:path*`
      },
      {
        source: '/admin/:path*',
        destination: `${API_URL}/admin/:path*`
      },
      {
        source: '/static/:path*',
        destination: `${API_URL}/static/:path*`
      },
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
