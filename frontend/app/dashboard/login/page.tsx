"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Password sederhana (Bisa dipindah ke .env nanti)
    if (password === "adminnoska") {
      // Set cookie berlaku selama 7 hari
      document.cookie = "noska_admin_token=valid; path=/; max-age=" + (7 * 24 * 60 * 60);
      router.push("/dashboard");
    } else {
      setError("Password salah! Silakan coba lagi.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header Decor */}
        <div className="h-2 bg-gradient-to-right from-orange-500 to-amber-500"></div>
        
        <div className="p-6 sm:p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-orange-600 tracking-tighter">NOSKA HAMSTER</h1>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-1">Admin Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Password Admin</label>
              <input
                type="password"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-0 outline-none transition-all font-mono"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100 animate-shake">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all transform active:scale-95"
            >
              Masuk ke Dashboard
            </button>
          </form>

          <p className="text-center text-gray-400 text-xs mt-8">
            Hanya untuk penggunaan internal Noska Hamster.
          </p>
        </div>
      </div>
    </div>
  );
}
