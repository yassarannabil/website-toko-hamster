"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats/');
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Beranda Dashboard</h1>
      
      {loading ? (
        <div className="text-gray-500 mb-8">Memuat data statistik...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          <Link href="/dashboard/transactions?tab=menunggu" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-orange-200 hover:-translate-y-0.5 transition-all cursor-pointer block">
            <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Menunggu Bayar</h3>
            <p className="text-2xl sm:text-3xl font-black text-orange-600">{stats.menunggu_bayar}</p>
          </Link>
          
          <Link href="/dashboard/transactions?tab=alamat" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-amber-200 hover:-translate-y-0.5 transition-all cursor-pointer block">
            <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Lengkapi Alamat</h3>
            <p className="text-2xl sm:text-3xl font-black text-amber-600">{stats.lengkapi_alamat}</p>
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
      )}
    </div>
  );
}
