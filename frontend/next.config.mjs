/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['katalog.noska-hamster.shop', 'noska-hamster.shop', '192.168.1.2'],
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
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: 'http://127.0.0.1:8000/media/:path*'
      },
      {
        source: '/admin/:path*',
        destination: 'http://127.0.0.1:8000/admin/:path*'
      },
      {
        source: '/static/:path*',
        destination: 'http://127.0.0.1:8000/static/:path*'
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*'
      }
    ];
  }
};

export default nextConfig;
