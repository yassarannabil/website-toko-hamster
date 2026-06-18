"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

function formatRupiah(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  const formatted = Math.round(num).toLocaleString("id-ID").replace(/,/g, ".");
  return `Rp ${formatted}`;
}

export default function DashboardHome() {
  const [stats, setStats] = useState({
    menunggu_bayar: 0,
    lengkapi_alamat: 0,
    siap_packing: 0,
    siap_kirim: 0,
    dalam_perjalanan: 0,
    klaim_garansi: 0,
    selesai: 0,
    batal: 0
  });
  
  const [finance, setFinance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem('token');
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        
        const [statsRes, financeRes] = await Promise.all([
          fetch(`${baseUrl}/api/dashboard/stats/`, {
            headers: { 'Authorization': `Token ${token}` }
          }),
          fetch(`${baseUrl}/api/dashboard/finance/summary/?days=30`, {
            headers: { 'Authorization': `Token ${token}` }
          })
        ]);
        
        if (statsRes.ok) setStats(await statsRes.json());
        if (financeRes.ok) setFinance(await financeRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Beranda Dashboard</h1>
      
      {loading ? (
        <div className="text-gray-500 mb-8 animate-pulse">Memuat data dashboard...</div>
      ) : (
        <>
          {/* Executive Financial Summary (30 Days) */}
          {finance && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Link href="/dashboard/finance" className="bg-white rounded-xl shadow-sm border border-green-200 p-4 sm:p-5 hover:shadow-md hover:border-green-300 hover:-translate-y-0.5 transition-all cursor-pointer block relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300 text-green-600">
                   <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/></svg>
                </div>
                <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Laba Bersih</h3>
                <p className="text-xl sm:text-2xl font-black text-green-600">{formatRupiah(finance.net_revenue)}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-2">Bulan ini</p>
              </Link>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Omset Kotor</h3>
                <p className="text-xl sm:text-2xl font-black text-gray-900">{formatRupiah(finance.gross_revenue)}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-2">Bulan ini</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Pengeluaran</h3>
                <p className="text-xl sm:text-2xl font-black text-red-600">-{formatRupiah(finance.total_expense)}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-2">Bulan ini</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Kerugian Refund</h3>
                <p className="text-xl sm:text-2xl font-black text-red-600">-{formatRupiah(finance.refund_loss)}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-2">Bulan ini</p>
              </div>
            </div>
          )}

          <h2 className="text-lg font-bold text-gray-900 mb-4">Status Antrean Pesanan</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            <Link href="/dashboard/transactions?tab=menunggu" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-orange-200 hover:-translate-y-0.5 transition-all cursor-pointer block">
              <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Menunggu Bayar</h3>
              <p className="text-2xl sm:text-3xl font-black text-orange-600">{stats.menunggu_bayar}</p>
            </Link>
            
            <Link href="/dashboard/transactions?tab=siap-packing" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-yellow-200 hover:-translate-y-0.5 transition-all cursor-pointer block">
              <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Siap Packing</h3>
              <p className="text-2xl sm:text-3xl font-black text-yellow-600">{stats.siap_packing}</p>
            </Link>

            <Link href="/dashboard/transactions?tab=siap-kirim" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all cursor-pointer block">
              <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Siap Kirim</h3>
              <p className="text-2xl sm:text-3xl font-black text-blue-600">{stats.siap_kirim}</p>
            </Link>

            <Link href="/dashboard/transactions?tab=dikirim" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-purple-200 hover:-translate-y-0.5 transition-all cursor-pointer block">
              <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Dalam Perjalanan</h3>
              <p className="text-2xl sm:text-3xl font-black text-purple-600">{stats.dalam_perjalanan}</p>
            </Link>

            <Link href="/dashboard/transactions?tab=garansi" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-red-200 hover:-translate-y-0.5 transition-all cursor-pointer block">
              <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Klaim Garansi</h3>
              <p className="text-2xl sm:text-3xl font-black text-red-600">{stats.klaim_garansi}</p>
            </Link>

            <Link href="/dashboard/transactions?tab=selesai" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all cursor-pointer block">
              <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Selesai</h3>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.selesai}</p>
            </Link>

            <Link href="/dashboard/transactions?tab=batal" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 transition-all cursor-pointer block">
              <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Batal</h3>
              <p className="text-2xl sm:text-3xl font-black text-gray-400">{stats.batal}</p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
