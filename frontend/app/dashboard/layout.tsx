"use client";

import Link from 'next/link';
import { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/dashboard/login';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Mobile Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 shadow-sm md:hidden">
        <div>
          <h1 className="text-lg font-black text-orange-600 tracking-tight">NOSKA HAMSTER</h1>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Admin Panel</p>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
        >
          {sidebarOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-black text-orange-600 tracking-tight">NOSKA HAMSTER</h1>
          <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-widest">Admin Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors">
            Beranda
          </Link>
          <Link href="/dashboard/transactions" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors">
            Daftar Pesanan
          </Link>
          <Link href="/dashboard/inventory" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors">
            Stok Live
          </Link>
          <Link href="/dashboard/chat" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors">
            Chat Pelanggan
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={() => {
              document.cookie = "noska_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              window.location.href = "/dashboard/login";
            }}
            className="w-full flex justify-center items-center px-4 py-2 text-sm font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="pt-[68px] md:pt-0">
          <div className="p-4 sm:p-6 md:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
