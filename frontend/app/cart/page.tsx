"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken, isAuthenticated } from "../utils/auth";
import { API_BASE_URL } from "../data/hamsters";
import Footer from "../components/Footer";

interface CartItem {
  cart_item_id: number;
  inventory_id: number;
  kode_hamster: string;
  varian: string;
  jenis_kelamin: string;
  harga: number;
  foto_preview: string | null;
  status_ketersediaan: string;
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalHarga, setTotalHarga] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCart = async () => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/store/cart/`, {
        headers: {
          "Authorization": `Token ${getToken()}`
        }
      });

      if (!res.ok) throw new Error("Gagal mengambil data keranjang.");

      const data = await res.json();
      setItems(data.items || []);
      setTotalHarga(data.total_harga || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleRemoveItem = async (cartItemId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/store/cart/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Token ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ cart_item_id: cartItemId })
      });

      if (!res.ok) throw new Error("Gagal menghapus item.");
      fetchCart(); // Refresh cart
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat keranjang...</div>;

  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-extrabold text-[#1a1614] mb-8">Keranjang Belanja</h1>

        {error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[#6b5e54] mb-4">Keranjang Anda masih kosong.</p>
            <Link href="/katalog" className="inline-block px-6 py-3 bg-[#ea8b3a] text-white font-bold rounded-xl hover:bg-[#dc7030] transition-colors">
              Lihat Katalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.cart_item_id} className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden">
                    {item.foto_preview ? (
                      <img src={item.foto_preview} alt={item.kode_hamster} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                    )}
                  </div>
                  <div className="flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-[#1a1614] text-lg">{item.varian}</h3>
                      <p className="text-sm text-[#6b5e54]">{item.jenis_kelamin} • {item.kode_hamster}</p>
                      {item.status_ketersediaan !== "Tersedia" && (
                        <p className="text-xs text-red-500 font-bold mt-1">Stok Habis / Di-hold</p>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold text-[#ea8b3a]">Rp{item.harga.toLocaleString("id-ID")}</span>
                      <button
                        onClick={() => handleRemoveItem(item.cart_item_id)}
                        className="text-sm text-red-500 hover:text-red-700 font-semibold"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ringkasan Belanja */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit sticky top-8">
              <h2 className="text-xl font-bold text-[#1a1614] mb-4">Ringkasan</h2>
              <div className="flex justify-between mb-2">
                <span className="text-[#6b5e54]">Total Harga</span>
                <span className="font-bold text-[#1a1614]">Rp{totalHarga.toLocaleString("id-ID")}</span>
              </div>
              <div className="border-t border-gray-100 my-4"></div>
              <Link
                href="/checkout"
                className="w-full block text-center py-3 bg-gradient-to-r from-[#ea8b3a] to-[#dc7030] text-white font-bold rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
              >
                Lanjut ke Checkout
              </Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
