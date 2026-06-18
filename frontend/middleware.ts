import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. (Dihapus) Rute /api/ tidak lagi ditangani oleh middleware, melainkan langsung oleh Nginx

  // 2. Dashboard Protection
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('noska_admin_token');
    const isLoginPage = pathname === '/dashboard/login';

    // Jika belum login dan bukan di halaman login -> tendang ke login
    if (!token && !isLoginPage) {
      return NextResponse.redirect(new URL('/dashboard/login', request.url));
    }

    // Jika sudah login tapi malah mau ke halaman login -> arahkan ke dashboard utama
    if (token && isLoginPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
