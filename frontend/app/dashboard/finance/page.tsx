"use client";

import { useState, useEffect } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";

function formatRupiah(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = Math.round(absNum).toLocaleString("id-ID").replace(/,/g, ".");
  return `${isNegative ? '-' : ''}Rp ${formatted}`;
}

export default function FinanceDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [period, setPeriod] = useState<number>(30); // Default 30 days
  const [loading, setLoading] = useState(true);

  const getPeriodLabel = () => {
    if (period === 7) return "Minggu ini";
    if (period === 365) return "Tahun ini";
    return "Bulan ini";
  };

  // Form State
  const [newExpense, setNewExpense] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    kategori: "Pakan",
    keterangan: "",
    nominal: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, chartRes, expRes] = await Promise.all([
        fetch(`/api/dashboard/finance/summary/?days=${period}`),
        fetch(`/api/dashboard/finance/chart/?days=${period}`),
        fetch(`/api/dashboard/finance/expenses/`)
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (chartRes.ok) setChartData(await chartRes.json());
      if (expRes.ok) setExpenses(await expRes.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.keterangan || !newExpense.nominal) return;

    try {
      const res = await fetch("/api/dashboard/finance/expenses/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newExpense,
          nominal: parseInt(newExpense.nominal)
        })
      });
      if (res.ok) {
        setNewExpense({ tanggal: new Date().toISOString().split("T")[0], kategori: "Pakan", keterangan: "", nominal: "" });
        fetchData(); // Refresh data
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && !summary) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Memuat Data Keuangan...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dasbor Keuangan</h1>
          <p className="text-sm text-gray-500 mt-1">Laporan arus kas dan Laba Bersih (True Net Profit)</p>
        </div>
        
        <select 
          value={period} 
          onChange={(e) => setPeriod(parseInt(e.target.value))}
          className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block px-4 py-2.5 shadow-sm"
        >
          <option value={7}>7 Hari Terakhir (Mingguan)</option>
          <option value={30}>30 Hari Terakhir (Bulanan)</option>
          <option value={365}>365 Hari Terakhir (Tahunan)</option>
        </select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
               <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/></svg>
            </div>
            <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Omset Kotor</h3>
            <p className="text-xl sm:text-2xl font-black text-gray-900">{formatRupiah(summary.gross_revenue)}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2">{getPeriodLabel()}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4 sm:p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300 text-green-600">
               <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/></svg>
            </div>
            <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Laba Bersih</h3>
            <p className="text-xl sm:text-2xl font-black text-green-600">{formatRupiah(summary.net_revenue)}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2">{getPeriodLabel()}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Pengeluaran</h3>
            <p className="text-xl sm:text-2xl font-black text-red-600">-{formatRupiah(summary.total_expense)}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2">{getPeriodLabel()}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <h3 className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Kerugian Refund</h3>
            <p className="text-xl sm:text-2xl font-black text-red-600">-{formatRupiah(summary.refund_loss)}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2">{getPeriodLabel()}</p>
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Tren Laba Bersih vs Pengeluaran</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${value/1000}k`} />
              <Tooltip 
                formatter={(value: any) => formatRupiah(value || 0)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" name="Laba Masuk" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" name="Pengeluaran" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Arus Kas Umum (Buku Kas)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Tipe</th>
                  <th className="px-6 py-3">Kategori</th>
                  <th className="px-6 py-3">Keterangan</th>
                  <th className="px-6 py-3 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Belum ada data riwayat kas.</td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{exp.tanggal}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${exp.color === 'green' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                          {exp.tipe}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                          {exp.kategori}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{exp.keterangan}</td>
                      <td className={`px-6 py-4 text-right font-bold ${exp.color === 'green' ? 'text-green-600' : 'text-red-600'}`}>
                        {exp.nominal > 0 ? '+' : ''}{formatRupiah(exp.nominal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Expense Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Catat Pengeluaran Baru</h2>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
              <input 
                type="date"
                required
                value={newExpense.tanggal}
                onChange={(e) => setNewExpense({...newExpense, tanggal: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select 
                value={newExpense.kategori}
                onChange={(e) => setNewExpense({...newExpense, kategori: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-orange-500 focus:border-orange-500 outline-none"
              >
                <option value="Pakan">Pakan</option>
                <option value="Serbuk/Bedding">Serbuk/Bedding</option>
                <option value="Vitamin/Obat">Vitamin/Obat</option>
                <option value="Kardus/Packing">Kardus/Packing</option>
                <option value="Lain-lain">Lain-lain</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan Singkat</label>
              <input 
                type="text" 
                required
                placeholder="Misal: Beli pelet 5kg"
                value={newExpense.keterangan}
                onChange={(e) => setNewExpense({...newExpense, keterangan: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
              <input 
                type="number" 
                required
                min="0"
                placeholder="50000"
                value={newExpense.nominal}
                onChange={(e) => setNewExpense({...newExpense, nominal: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors mt-2"
            >
              + Simpan Catatan
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
