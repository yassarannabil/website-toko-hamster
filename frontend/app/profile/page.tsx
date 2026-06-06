"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken, isAuthenticated } from "../utils/auth";
import { API_BASE_URL } from "../data/hamsters";
import AddressModal, { SavedAddress } from "../components/AddressModal";
import PageHeader from "../components/PageHeader";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [defaultAddress, setDefaultAddress] = useState<SavedAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);

  const fetchProfileAndAddress = async () => {
    try {
      const [profRes, addrRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/auth/profile/`, { headers: { "Authorization": `Token ${getToken()}` } }),
        fetch(`${API_BASE_URL}/api/auth/addresses/`, { headers: { "Authorization": `Token ${getToken()}` } })
      ]);

      if (profRes.ok) {
        setProfile(await profRes.json());
      }
      if (addrRes.ok) {
        const addresses: SavedAddress[] = await addrRes.json();
        const mainAddr = addresses.find(a => a.is_default) || addresses[0] || null;
        setDefaultAddress(mainAddr);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchProfileAndAddress();
  }, [router]);

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  if (loading) return <div className="flex h-[50vh] items-center justify-center">Memuat...</div>;

  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col">
      <PageHeader title="Profil Saya" />
      <div className="flex-grow max-w-xl w-full mx-auto px-4 py-8">

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

          <div className="space-y-4 relative">
            <div className="absolute top-0 right-0">
              <button
                onClick={() => setShowAddressModal(true)}
                className="text-xs font-bold text-[#ea8b3a] hover:underline"
              >
                Ubah Alamat
              </button>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Nomor WhatsApp</span>
              <span className="font-medium text-gray-800">{defaultAddress?.nomor_wa || profile.wa || "-"}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Alamat Utama</span>
              {defaultAddress ? (
                <div className="text-sm text-gray-700 leading-relaxed mt-1 bg-orange-50/50 p-3 rounded-lg border border-[#ea8b3a]/20">
                  <span className="font-bold block mb-1">{defaultAddress.nama_penerima} <span className="text-[10px] bg-white border border-[#ea8b3a]/30 text-[#ea8b3a] px-2 py-0.5 rounded-full ml-1">{defaultAddress.label}</span></span>
                  {defaultAddress.detail}
                  {defaultAddress.kelurahan && `, ${defaultAddress.kelurahan}`}
                  {defaultAddress.kecamatan && `, ${defaultAddress.kecamatan}`}
                  {defaultAddress.kota && `, ${defaultAddress.kota}`}
                  {defaultAddress.provinsi && `, ${defaultAddress.provinsi}`}
                </div>
              ) : (
                <span className="font-medium text-gray-500 italic">Belum diatur</span>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="w-full py-3.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors shadow-sm"
      >
        Keluar
      </button>

      <AddressModal
        isOpen={showAddressModal}
        onClose={() => {
          setShowAddressModal(false);
          fetchProfileAndAddress(); // Refresh address when modal closes
        }}
        onSelect={(addr) => {
          setDefaultAddress(addr);
          setShowAddressModal(false);
        }}
      />
      </div>
    </div>
  );
}
