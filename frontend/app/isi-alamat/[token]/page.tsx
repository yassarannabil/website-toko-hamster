"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// Form state interface
interface AddressForm {
  nama_penerima: string;
  nomor_wa: string;
  provinsi: string;
  kota_kabupaten: string;
  kecamatan: string;
  kelurahan_desa: string;
  detail_alamat: string;
  kode_pos: string;
}

// Data from API
interface TrxData {
  status: string;
  message?: string;
  nomor_wa?: string;
  total_bayar?: number;
  hamsters?: string[];
  keterangan_kurir?: string;
}

// Wilayah Interfaces
interface Region {
  id: string;
  name: string;
}

export default function IsiAlamatPage() {
  const params = useParams();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trxData, setTrxData] = useState<TrxData | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [form, setForm] = useState<AddressForm>({
    nama_penerima: "",
    nomor_wa: "",
    provinsi: "",
    kota_kabupaten: "",
    kecamatan: "",
    kelurahan_desa: "",
    detail_alamat: "",
    kode_pos: "",
  });

  // Region Data States
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [regencies, setRegencies] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [villages, setVillages] = useState<Region[]>([]);

  // Selected Region IDs for fetching children
  const [selectedProvId, setSelectedProvId] = useState("");
  const [selectedRegId, setSelectedRegId] = useState("");
  const [selectedDistId, setSelectedDistId] = useState("");
  const [selectedVillId, setSelectedVillId] = useState("");

  useEffect(() => {
    async function fetchTrx() {
      try {
        const res = await fetch(`/api/transaksi/alamat/${token}`);
        const data = await res.json();

        if (data.status === "already_filled") {
          setIsSuccess(true);
        } else if (res.ok) {
          setTrxData(data);
          // Tidak auto-fill WA
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTrx();
  }, [token]);

  // Fetch Provinces on Load
  useEffect(() => {
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json`)
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(console.error);
  }, []);

  // Fetch Regencies when Province changes
  useEffect(() => {
    if (selectedProvId) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${selectedProvId}.json`)
        .then(res => res.json())
        .then(data => setRegencies(data))
        .catch(console.error);
    } else {
      setRegencies([]);
    }
  }, [selectedProvId]);

  // Fetch Districts when Regency changes
  useEffect(() => {
    if (selectedRegId) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${selectedRegId}.json`)
        .then(res => res.json())
        .then(data => setDistricts(data))
        .catch(console.error);
    } else {
      setDistricts([]);
    }
  }, [selectedRegId]);

  // Fetch Villages when District changes
  useEffect(() => {
    if (selectedDistId) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${selectedDistId}.json`)
        .then(res => res.json())
        .then(data => setVillages(data))
        .catch(console.error);
    } else {
      setVillages([]);
    }
  }, [selectedDistId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProvinsiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedProvId(id);
    setSelectedRegId("");
    setSelectedDistId("");
    setSelectedVillId("");
    setForm(prev => ({
      ...prev,
      provinsi: id ? name : "",
      kota_kabupaten: "",
      kecamatan: "",
      kelurahan_desa: ""
    }));
  };

  const handleKotaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedRegId(id);
    setSelectedDistId("");
    setSelectedVillId("");
    setForm(prev => ({
      ...prev,
      kota_kabupaten: id ? name : "",
      kecamatan: "",
      kelurahan_desa: ""
    }));
  };

  const handleKecamatanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedDistId(id);
    setSelectedVillId("");
    setForm(prev => ({
      ...prev,
      kecamatan: id ? name : "",
      kelurahan_desa: ""
    }));
  };

  const handleKelurahanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedVillId(id);
    setForm(prev => ({ ...prev, kelurahan_desa: id ? name : "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/transaksi/alamat/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setIsSuccess(true);
      } else {
        alert("Terjadi kesalahan saat menyimpan alamat. Silakan coba lagi.");
      }
    } catch (err) {
      alert("Koneksi error. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-text-secondary animate-pulse">Memuat data pesanan...</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-brand-100 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Alamat Berhasil Disimpan!</h1>
          <p className="text-text-secondary">
            Terima kasih telah mengisi alamat pengiriman. Pesanan Anda akan segera kami proses.
          </p>
        </div>
      </div>
    );
  }

  if (!trxData) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <p className="text-red-500">Link tidak valid atau kadaluarsa.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header / Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-brand-100 p-6">
          <h1 className="text-xl font-bold text-text-primary mb-4">Pengisian Alamat Pengiriman</h1>

          <div className="bg-brand-50 p-4 rounded-xl border border-brand-100 mb-6">
            <h2 className="text-sm font-semibold text-brand-800 mb-2">Ringkasan Pesanan</h2>
            <ul className="text-sm text-brand-700 space-y-1 mb-3">
              {trxData.hamsters?.map((h, i) => (
                <li key={i}>• {h}</li>
              ))}
            </ul>
            <div className="flex justify-between items-center pt-3 border-t border-brand-200">
              <span className="text-sm font-medium text-brand-800">Total + Ongkir:</span>
              <span className="text-base font-bold text-brand-900">
                Rp {trxData.total_bayar?.toLocaleString('id-ID')}
              </span>
            </div>
            {trxData.keterangan_kurir && (
              <p className="text-xs text-brand-600 mt-2">📦 {trxData.keterangan_kurir}</p>
            )}
          </div>

          <p className="text-sm text-text-secondary">
            Mohon isi form di bawah ini dengan lengkap dan benar untuk menghindari kesalahan pengiriman.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-brand-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Nama Penerima</label>
            <input required type="text" name="nama_penerima" value={form.nama_penerima} onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
              placeholder="Contoh: Budi Santoso" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Nomor WA Penerima</label>
            <input required type="tel" name="nomor_wa" value={form.nomor_wa} onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
              placeholder="Contoh: 08123456789" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Provinsi</label>
              <select required value={selectedProvId} onChange={handleProvinsiChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm">
                <option value="">Pilih Provinsi...</option>
                {provinces.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Kabupaten/Kota</label>
              <select required value={selectedRegId} onChange={handleKotaChange} disabled={!selectedProvId}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm disabled:opacity-50">
                <option value="">Pilih Kota/Kab...</option>
                {regencies.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Kecamatan</label>
              <select required value={selectedDistId} onChange={handleKecamatanChange} disabled={!selectedRegId}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm disabled:opacity-50">
                <option value="">Pilih Kecamatan...</option>
                {districts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Kelurahan/Desa</label>
              <select required value={selectedVillId} onChange={handleKelurahanChange} disabled={!selectedDistId}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm disabled:opacity-50">
                <option value="">Pilih Kel/Desa...</option>
                {villages.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Kode Pos</label>
            <input required type="number" name="kode_pos" value={form.kode_pos} onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Detail Alamat Lengkap</label>
            <textarea required name="detail_alamat" value={form.detail_alamat} onChange={handleChange} rows={3}
              placeholder="Nama Jalan, Blok, Nomor rumah, RT/RW, Patokan rumah..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none" />
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transition-all active:scale-[0.98] disabled:opacity-70">
            {isSubmitting ? "Menyimpan..." : "Simpan Alamat"}
          </button>
        </form>

      </div>
    </div>
  );
}
