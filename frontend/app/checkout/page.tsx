"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, isAuthenticated } from "../utils/auth";
import { API_BASE_URL } from "../data/hamsters";
import Footer from "../components/Footer";
import AddressModal, { SavedAddress } from "../components/AddressModal";

interface ShippingService {
  name: string;
  code: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
  priority: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Address
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);

  // Ongkir
  const [shippingOptions, setShippingOptions] = useState<ShippingService[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<ShippingService | null>(null);

  // Load Cart
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    fetch(`${API_BASE_URL}/api/store/cart/`, {
      headers: { "Authorization": `Token ${getToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!data.items || data.items.length === 0) {
          alert("Keranjang kosong.");
          router.push("/katalog");
        } else {
          setCart(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Calculate ongkir when address changes
  useEffect(() => {
    if (!selectedAddress?.destination_id) {
      setShippingOptions([]);
      setSelectedShipping(null);
      return;
    }

    setLoadingShipping(true);
    setShippingOptions([]);
    setSelectedShipping(null);

    fetch("/api/ongkir/calculate/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination_id: selectedAddress.destination_id,
        weight: 1000,
        courier: "pos:tiki",
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data?.data && Array.isArray(data.data)) {
          const serviceMap: { [key: string]: { courier: string; label: string; priority: number } } = {
            "ons": { courier: "TIKI", label: "ONS", priority: 1 },
            "reg": { courier: "TIKI", label: "REG", priority: 2 },
            "nextday": { courier: "POS Indonesia", label: "Nextday", priority: 3 },
            "pos reguler": { courier: "POS Indonesia", label: "Reguler", priority: 4 },
          };

          const finalResults: ShippingService[] = [];
          data.data.forEach((service: any) => {
            const sName = service.service.toLowerCase();
            const mapping = serviceMap[sName] || (sName.includes("reg") ? serviceMap["pos reguler"] : null);
            if (mapping) {
              finalResults.push({
                name: mapping.courier,
                code: service.code,
                service: mapping.label,
                description: service.description || "",
                cost: parseInt(service.cost),
                etd: service.etd,
                priority: mapping.priority,
              });
            }
          });

          finalResults.sort((a, b) => a.priority - b.priority);
          setShippingOptions(finalResults);
          if (finalResults.length > 0) setSelectedShipping(finalResults[0]);
        }
      })
      .finally(() => setLoadingShipping(false));
  }, [selectedAddress]);

  const handleCheckout = async () => {
    if (!selectedAddress) {
      alert("Mohon pilih alamat pengiriman!");
      return;
    }
    if (!selectedShipping) {
      alert("Mohon pilih layanan pengiriman!");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/store/checkout/`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          address_id: selectedAddress.address_id,
          kurir: `${selectedShipping.name} ${selectedShipping.service} (${selectedShipping.etd})`,
          biaya_ongkir: selectedShipping.cost
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal checkout.");

      if (data.payment_url) {
        if (typeof window !== "undefined" && (window as any).loadJokulCheckout) {
          (window as any).loadJokulCheckout(data.payment_url);
        } else {
          // Fallback if JS script failed to load
          window.location.href = data.payment_url;
        }
      } else {
        alert(data.message);
        router.push("/orders");
      }
    } catch (err: any) {
      alert(err.message);
      setProcessing(false);
    }
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID").format(num);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb]">
      <div className="animate-pulse text-gray-400">Memuat...</div>
    </div>
  );

  const subtotal = cart?.total_harga || 0;
  const biayaPacking = 10000;
  const biayaOngkir = selectedShipping?.cost || 0;
  const totalBayar = subtotal + biayaPacking + biayaOngkir;

  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-extrabold text-[#1a1614]">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">

            {/* ─── Alamat Pengiriman ─── */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#ea8b3a]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                  Alamat Pengiriman
                </h2>
                {selectedAddress && (
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="text-xs font-bold text-[#ea8b3a] hover:underline"
                  >
                    Ubah
                  </button>
                )}
              </div>

              {selectedAddress ? (
                <div
                  onClick={() => setShowAddressModal(true)}
                  className="p-4 rounded-xl border-2 border-[#ea8b3a]/30 bg-orange-50/20 cursor-pointer hover:border-[#ea8b3a]/50 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold text-gray-900 text-sm">{selectedAddress.nama_penerima}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">{selectedAddress.label}</span>
                    {selectedAddress.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ea8b3a] text-white font-bold">Utama</span>}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{selectedAddress.nomor_wa}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {selectedAddress.detail}
                    {selectedAddress.kelurahan && `, ${selectedAddress.kelurahan}`}
                    {selectedAddress.kecamatan && `, ${selectedAddress.kecamatan}`}
                    {selectedAddress.kota && `, ${selectedAddress.kota}`}
                    {selectedAddress.provinsi && `, ${selectedAddress.provinsi}`}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="w-full p-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#ea8b3a] hover:bg-orange-50/30 transition-all cursor-pointer group"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-[#ea8b3a] transition-colors">
                      <svg className="w-6 h-6 text-[#ea8b3a] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <span className="text-sm font-bold text-gray-500 group-hover:text-[#ea8b3a] transition-colors">Pilih Alamat Pengiriman</span>
                  </div>
                </button>
              )}
            </div>

            {/* ─── Opsi Pengiriman ─── */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#ea8b3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                Opsi Pengiriman
              </h2>

              {!selectedAddress ? (
                <div className="p-4 bg-gray-50 text-gray-400 rounded-xl text-sm text-center border border-gray-100">
                  Pilih alamat pengiriman terlebih dahulu.
                </div>
              ) : !selectedAddress.destination_id ? (
                <div className="p-4 bg-amber-50 text-amber-700 rounded-xl text-sm text-center border border-amber-100">
                  Alamat ini belum memiliki data kelurahan. Silakan ubah atau tambah alamat baru.
                </div>
              ) : loadingShipping ? (
                <div className="p-4 bg-gray-50 text-gray-500 rounded-xl text-sm text-center border border-gray-100">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Mencari opsi pengiriman terbaik...
                  </div>
                </div>
              ) : shippingOptions.length === 0 ? (
                <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm text-center">
                  Maaf, tidak ada layanan kurir yang tersedia ke lokasi Anda.
                </div>
              ) : (
                <div className="space-y-3">
                  {shippingOptions.map((opt, i) => (
                    <label
                      key={i}
                      onClick={() => setSelectedShipping(opt)}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedShipping?.name === opt.name && selectedShipping?.service === opt.service
                        ? 'border-[#ea8b3a] bg-orange-50/30'
                        : 'border-gray-100 hover:border-gray-200'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedShipping?.name === opt.name && selectedShipping?.service === opt.service ? 'border-[#ea8b3a]' : 'border-gray-300'
                          }`}>
                          {selectedShipping?.name === opt.name && selectedShipping?.service === opt.service && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#ea8b3a]" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">
                            {opt.name}
                            <span className="ml-1.5 text-[10px] text-[#ea8b3a] font-bold bg-orange-100 px-2 py-0.5 rounded-full">{opt.service}</span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">Estimasi tiba: {opt.etd || "-"}</div>
                        </div>
                      </div>
                      <div className="font-black text-gray-800">Rp{formatRupiah(opt.cost)}</div>
                    </label>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ─── Ringkasan Pesanan ─── */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-8">
              <h2 className="text-lg font-bold mb-4">Ringkasan Pesanan</h2>
              <div className="space-y-4 mb-5">
                {cart?.items.map((item: any) => (
                  <div key={item.cart_item_id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.foto_preview ? (
                          <img src={item.foto_preview} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">🐹</div>
                        )}
                      </div>
                      <div>
                        <div className="text-gray-900 font-bold line-clamp-1">{item.varian}</div>
                        <div className="text-[10px] font-bold text-gray-400 mt-0.5">{item.kode_hamster}</div>
                      </div>
                    </div>
                    <span className="font-black whitespace-nowrap ml-4 text-gray-800">Rp{formatRupiah(item.harga)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-bold text-gray-700">Rp{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Biaya Packing</span>
                  <span className="font-bold text-gray-700">Rp{formatRupiah(biayaPacking)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ongkos Kirim</span>
                  <span className="font-bold text-gray-700">{biayaOngkir > 0 ? `Rp${formatRupiah(biayaOngkir)}` : '-'}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200 my-5" />
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-gray-900 text-lg">Total Bayar</span>
                <span className="font-black text-[#ea8b3a] text-2xl">Rp{formatRupiah(totalBayar)}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing || !selectedAddress || !selectedShipping}
                className="w-full py-4 bg-[#ea8b3a] text-white font-bold text-lg rounded-xl hover:bg-[#dc7030] hover:shadow-lg hover:shadow-orange-200 transition-all disabled:opacity-50 disabled:hover:shadow-none active:scale-[0.98]"
              >
                {processing ? "Memproses Pesanan..." : "Pilih Metode Pembayaran"}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Address Modal */}
      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSelect={(addr) => setSelectedAddress(addr)}
        currentAddressId={selectedAddress?.address_id}
      />
    </div>
  );
}
