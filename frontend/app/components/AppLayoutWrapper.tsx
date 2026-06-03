"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";

export default function AppLayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Nonaktifkan Wrapper ini di area Admin Dashboard atau Auth
  const isDashboard = pathname.startsWith("/dashboard");
  const isAuth = pathname.startsWith("/login") || pathname.startsWith("/register");

  if (isDashboard || isAuth) {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Beranda", path: "/", icon: "🏠" },
    { name: "Katalog", path: "/katalog", icon: "🐹" },
    { name: "Pesanan", path: "/orders", icon: "📦" },
    { name: "Saya", path: "/profile", icon: "👤" }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ───── FIXED TOP HEADER ───── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm transition-all">
        {/* Container */}
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          
          {/* Left: Back Button (Mobile) & Logo (Desktop) */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()} 
              className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
              aria-label="Kembali"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <Link href="/" className="font-black tracking-tight text-xl text-brand-600 flex items-center gap-2">
              <span className="hidden md:inline">Noska Hamster</span>
            </Link>
          </div>

          {/* Center/Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                className={`text-sm font-bold transition-colors ${
                  pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path))
                    ? "text-brand-600" 
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right: Cart & Chat */}
          <div className="flex items-center gap-1 sm:gap-3">
            <Link 
              href="/cart" 
              className="p-2 sm:px-4 sm:py-2 rounded-xl text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center gap-2 font-bold"
            >
              <span className="text-xl">🛒</span>
              <span className="hidden sm:inline">Keranjang</span>
            </Link>
            <Link 
              href="/chat" 
              className="p-2 sm:px-4 sm:py-2 rounded-xl text-gray-700 hover:bg-wa-green/10 hover:text-wa-green transition-colors flex items-center gap-2 font-bold"
            >
              <span className="text-xl">💬</span>
              <span className="hidden sm:inline">Chat</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ───── MAIN CONTENT AREA ───── */}
      {/* 
        Berikan padding top & bottom agar konten tidak tertutup Header/Footer yang fixed. 
        pt-16 (header), pb-20 (mobile footer). Di md, pb-0 karena footer hidden.
      */}
      <main className="flex-1 w-full pt-16 pb-[72px] md:pb-0 relative overflow-x-hidden">
        {children}
      </main>

      {/* ───── FIXED BOTTOM NAVIGATION (MOBILE ONLY) ───── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_10px_-1px_rgb(0,0,0,0.05)] pb-safe">
        <div className="flex items-center justify-around h-[72px] px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 ${
                  isActive ? "text-brand-600 scale-105" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <span className="text-2xl drop-shadow-sm">{item.icon}</span>
                <span className={`text-[10px] font-bold ${isActive ? "text-brand-600" : "font-semibold"}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
