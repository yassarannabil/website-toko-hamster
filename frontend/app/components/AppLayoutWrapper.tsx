"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";
import { IconKatalog, IconKeranjang, IconPesanan, IconChat, IconSaya } from "./NavIcons";

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
    { name: "Katalog", path: "/katalog", icon: <IconKatalog className="w-6 h-6 sm:w-5 sm:h-5" /> },
    { name: "Keranjang", path: "/cart", icon: <IconKeranjang className="w-6 h-6 sm:w-5 sm:h-5" /> },
    { name: "Pesanan", path: "/orders", icon: <IconPesanan className="w-6 h-6 sm:w-5 sm:h-5" /> },
    { name: "Chat", path: "/chat", icon: <IconChat className="w-6 h-6 sm:w-5 sm:h-5" /> },
    { name: "Saya", path: "/profile", icon: <IconSaya className="w-6 h-6 sm:w-5 sm:h-5" /> }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ───── FIXED TOP HEADER (Desktop Only) ───── */}
      <header className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm transition-all">
        {/* Container */}
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          
          {/* Left: Logo (Desktop) */}
          <div className="flex items-center gap-4">
            <Link href="/katalog" className="font-black tracking-tight text-xl text-brand-600 flex items-center gap-2">
              <span className="hidden md:inline">Noska Hamster</span>
            </Link>
          </div>

          {/* Center/Desktop Nav Links & Right Side combined */}
          <nav className="hidden md:flex items-center gap-8 flex-1 justify-end">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                className={`text-sm font-bold transition-colors flex items-center gap-2 ${
                  pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path))
                    ? "text-brand-600" 
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <span className="flex items-center justify-center">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ───── MAIN CONTENT AREA ───── */}
      {/* 
        Berikan padding top & bottom agar konten tidak tertutup Header/Footer yang fixed. 
        pt-0 (mobile), md:pt-16 (header desktop), pb-20 (mobile footer). Di md, pb-0 karena footer hidden.
      */}
      <main className="flex-1 w-full pt-0 md:pt-16 pb-[72px] md:pb-0 relative overflow-x-hidden">
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
                <span className="flex items-center justify-center drop-shadow-sm mb-0.5">{item.icon}</span>
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
