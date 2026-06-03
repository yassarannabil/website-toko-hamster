"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken, isAuthenticated } from "../utils/auth";
import { API_BASE_URL } from "../data/hamsters";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    
    fetch(`${API_BASE_URL}/api/auth/profile/`, {
      headers: { "Authorization": `Token ${getToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  if (loading) return <div className="flex h-[50vh] items-center justify-center">Memuat...</div>;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold text-[#1a1614] mb-8">Profil Saya 👤</h1>

      {profile && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-2xl font-bold">
              {profile.nama.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile.nama}</h2>
              <p className="text-sm text-gray-500">{profile.email}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="border-t border-gray-100 pt-4">
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Nomor WhatsApp</span>
              <span className="font-medium text-gray-800">{profile.nomor_wa || "-"}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Alamat Utama</span>
              <span className="font-medium text-gray-800">{profile.alamat || "Belum diatur"}</span>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={handleLogout}
        className="w-full py-3.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors shadow-sm"
      >
        Keluar (Logout)
      </button>
    </div>
  );
}
