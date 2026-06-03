"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setToken } from "../../utils/auth";
import { API_BASE_URL } from "../../data/hamsters";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal login. Silakan coba lagi.");
      }

      setToken(data.token);
      router.push("/katalog");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb] px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-[#1a1614]">
            Selamat Datang! 🐹
          </h2>
          <p className="mt-2 text-center text-sm text-[#6b5e54]">
            Masuk ke akun Noska Hamster Anda
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1614]">Email Address</label>
              <input
                type="email"
                required
                className="mt-1 block w-full px-4 py-3 bg-[#f7f5f2] border-transparent rounded-xl focus:border-[#ea8b3a] focus:bg-white focus:ring-2 focus:ring-[#ea8b3a]/20 transition-all duration-200 outline-none"
                placeholder="email@contoh.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1614]">Password</label>
              <input
                type="password"
                required
                className="mt-1 block w-full px-4 py-3 bg-[#f7f5f2] border-transparent rounded-xl focus:border-[#ea8b3a] focus:bg-white focus:ring-2 focus:ring-[#ea8b3a]/20 transition-all duration-200 outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-[#ea8b3a] to-[#dc7030] hover:from-[#dc7030] hover:to-[#b65628] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ea8b3a] transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#6b5e54]">
          Belum punya akun?{" "}
          <Link href="/register" className="font-semibold text-[#ea8b3a] hover:text-[#dc7030] transition-colors">
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}
