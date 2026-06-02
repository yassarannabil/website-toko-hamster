"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Footer from "../components/Footer";
// Trigger rebuild to fix hydration mismatch

interface Region {
  id: number;
  name: string;
  zip_code?: string;
}

interface ShippingService {
  name: string;
  code: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
}

export default function CekOngkirPage() {
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [subdistricts, setSubdistricts] = useState<Region[]>([]);

  const [selectedProvId, setSelectedProvId] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedDistId, setSelectedDistId] = useState("");
  const [selectedSubdistId, setSelectedSubdistId] = useState("");

  const [selectedProvName, setSelectedProvName] = useState("");
  const [selectedCityName, setSelectedCityName] = useState("");
  const [selectedDistName, setSelectedDistName] = useState("");
  const [selectedSubdistName, setSelectedSubdistName] = useState("");

  const [weight, setWeight] = useState(1);
  const [results, setResults] = useState<ShippingService[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingProv, setLoadingProv] = useState(true);
  const [loadingCity, setLoadingCity] = useState(false);
  const [loadingDist, setLoadingDist] = useState(false);
  const [loadingSubdist, setLoadingSubdist] = useState(false);
  
  // Ref untuk auto-scroll
  const resultsRef = useRef<HTMLDivElement>(null);

  // Fetch provinces
  useEffect(() => {
    fetch("/api/ongkir/provinces/")
      .then((res) => res.json())
      .then((data) => {
        // ID Valid sesuai API: 5 (Jabar), 10 (Jakarta), 11 (Banten), 12 (Jateng), 15 (Bali), 18 (Jatim), 19 (Jogja)
        const allowedProvIds = [5, 10, 11, 12, 15, 18, 19];
        const filtered = (data.data || []).filter((p: Region) => allowedProvIds.includes(Number(p.id)));
        const sorted = filtered.sort((a: Region, b: Region) => a.name.localeCompare(b.name));
        setProvinces(sorted);
        setLoadingProv(false);
      })
      .catch(() => setLoadingProv(false));
  }, []);

  // Fetch cities when province changes
  useEffect(() => {
    if (!selectedProvId) {
      setCities([]);
      return;
    }
    setLoadingCity(true);
    setSelectedCityId("");
    setSelectedCityName("");
    setCities([]);

    // Clear downstream
    setSelectedDistId("");
    setSelectedDistName("");
    setDistricts([]);
    setSelectedSubdistId("");
    setSelectedSubdistName("");
    setSubdistricts([]);
    setResults([]);

    fetch(`/api/ongkir/cities/${selectedProvId}/`)
      .then((res) => res.json())
      .then((data) => {
        const sorted = (data.data || []).sort((a: Region, b: Region) => a.name.localeCompare(b.name));
        setCities(sorted);
        setLoadingCity(false);
      })
      .catch(() => setLoadingCity(false));
  }, [selectedProvId]);

  // Fetch districts when city changes
  useEffect(() => {
    if (!selectedCityId) {
      setDistricts([]);
      return;
    }
    setLoadingDist(true);
    setSelectedDistId("");
    setSelectedDistName("");
    setDistricts([]);

    // Clear downstream
    setSelectedSubdistId("");
    setSelectedSubdistName("");
    setSubdistricts([]);
    setResults([]);

    fetch(`/api/ongkir/districts/${selectedCityId}/`)
      .then((res) => res.json())
      .then((data) => {
        const sorted = (data.data || []).sort((a: Region, b: Region) => a.name.localeCompare(b.name));
        setDistricts(sorted);
        setLoadingDist(false);
      })
      .catch(() => setLoadingDist(false));
  }, [selectedCityId]);

  // Fetch subdistricts when district changes
  useEffect(() => {
    if (!selectedDistId) {
      setSubdistricts([]);
      return;
    }
    setLoadingSubdist(true);
    setSelectedSubdistId("");
    setSelectedSubdistName("");
    setSubdistricts([]);
    setResults([]);

    fetch(`/api/ongkir/subdistricts/${selectedDistId}/`)
      .then((res) => res.json())
      .then((data) => {
        const sorted = (data.data || []).sort((a: Region, b: Region) => a.name.localeCompare(b.name));
        setSubdistricts(sorted);
        setLoadingSubdist(false);
      })
      .catch(() => setLoadingSubdist(false));
  }, [selectedDistId]);

  // Clear results when subdistrict changes
  useEffect(() => {
    setResults([]);
  }, [selectedSubdistId]);

  const handleCalculate = async () => {
    // BinderByte domestic cost API supports Kelurahan (Village) or Kecamatan (District) ID
    if (!selectedSubdistId) return;
    setLoading(true);
    setResults([]);

    try {
      const res = await fetch("/api/ongkir/calculate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_id: selectedSubdistId,
          weight: weight * 1000, // RajaOngkir uses grams
          courier: "pos:tiki", // Request POS and TIKI using colon separator
        }),
      });
      const data = await res.json();

      // Parse RajaOngkir V2 results format
      if (data && data.data && Array.isArray(data.data)) {
        // Definisi label dan urutan prioritas
        const serviceMap: { [key: string]: { courier: string; label: string; priority: number } } = {
          "ons": { courier: "TIKI", label: "ONS", priority: 1 },
          "reg": { courier: "TIKI", label: "REG", priority: 2 },
          "nextday": { courier: "POS Indonesia", label: "Nextday", priority: 3 },
          "pos reguler": { courier: "POS Indonesia", label: "Reguler", priority: 4 },
        };

        const finalResults: ShippingService[] = [];

        data.data.forEach((service: any) => {
          const sName = service.service.toLowerCase();
          // Cari apakah layanan ini ada dalam map kita
          const mapping = serviceMap[sName] || (sName.includes("reg") ? serviceMap["pos reguler"] : null);

          if (mapping) {
            finalResults.push({
              name: mapping.courier, // Teks hitam tebal (TIKI / POS Indonesia)
              code: service.code,
              service: mapping.label, // Label oranye tipis (ONS / REG / Nextday / Reguler)
              description: service.description || "",
              cost: parseInt(service.cost),
              etd: service.etd,
              priority: mapping.priority
            } as any);
          }
        });

        // Urutkan berdasarkan prioritas yang sudah ditentukan
        finalResults.sort((a: any, b: any) => a.priority - b.priority);
        setResults(finalResults);
        
        // Auto scroll ke hasil
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID").format(num);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600">
        {/* Background Decor */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
          {/* Link Kembali */}
          <div className="flex justify-start mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Kembali
            </Link>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Cek Ongkir
            </h1>
            <p className="mt-2 text-sm text-brand-100/80 sm:text-base max-w-md mx-auto">
              Cek estimasi biaya pengiriman ke alamat tujuan Anda
            </p>
          </div>
        </div>

        {/* Wave Decoration */}
        <div className="absolute bottom-0 left-0 w-full leading-[0]">
          <svg
            className="relative block w-full h-[40px] text-surface"
            viewBox="0 0 1440 60"
            preserveAspectRatio="none"
            fill="currentColor"
          >
            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,60 L0,60 Z" />
          </svg>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-lg">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
            <h3 className="font-bold text-gray-800 mb-5 text-base">Pilih Tujuan Pengiriman</h3>

            {/* Info Banner */}
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <div className="text-amber-600 mt-0.5">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <strong>Penting:</strong> Saat ini kami hanya melayani pengiriman area <strong>Jawa & Bali</strong> untuk menjamin keselamatan hamster selama perjalanan.
              </p>
            </div>

            {/* Provinsi */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Provinsi</label>
              <select
                value={selectedProvId}
                onChange={(e) => {
                  setSelectedProvId(e.target.value);
                  const prov = provinces.find((p) => String(p.id) === e.target.value);
                  setSelectedProvName(prov?.name || "");
                }}
                disabled={loadingProv}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition text-gray-800 text-sm bg-white disabled:bg-gray-50"
              >
                <option value="">{loadingProv ? "Memuat provinsi..." : "Pilih Provinsi..."}</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Kota / Kabupaten */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Kota / Kabupaten</label>
              <select
                value={selectedCityId}
                onChange={(e) => {
                  setSelectedCityId(e.target.value);
                  const city = cities.find((c) => String(c.id) === e.target.value);
                  setSelectedCityName(city?.name || "");
                }}
                disabled={!selectedProvId || loadingCity}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition text-gray-800 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">{loadingCity ? "Memuat kota..." : "Pilih Kota/Kabupaten..."}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Kecamatan */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Kecamatan</label>
              <select
                value={selectedDistId}
                onChange={(e) => {
                  setSelectedDistId(e.target.value);
                  const dist = districts.find((d) => String(d.id) === e.target.value);
                  setSelectedDistName(dist?.name || "");
                }}
                disabled={!selectedCityId || loadingDist}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition text-gray-800 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">{loadingDist ? "Memuat kecamatan..." : "Pilih Kecamatan..."}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Kelurahan / Desa */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Kelurahan / Desa</label>
              <select
                value={selectedSubdistId}
                onChange={(e) => {
                  setSelectedSubdistId(e.target.value);
                  const subdist = subdistricts.find((s) => String(s.id) === e.target.value);
                  setSelectedSubdistName(subdist?.name || "");
                }}
                disabled={!selectedDistId || loadingSubdist}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition text-gray-800 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">{loadingSubdist ? "Memuat kelurahan..." : "Pilih Kelurahan/Desa..."}</option>
                {subdistricts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Button */}
            <button
              onClick={handleCalculate}
              disabled={!selectedSubdistId || loading}
              className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all duration-200 ${!selectedSubdistId
                ? "bg-gray-300 cursor-not-allowed"
                : loading
                  ? "bg-brand-400 cursor-wait"
                  : "bg-brand-600 hover:bg-brand-700 hover:shadow-lg active:scale-[0.98]"
                }`}
            >
              {loading ? "Menghitung..." : "Cek Ongkir"}
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div 
              ref={resultsRef}
              className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden scroll-mt-6"
            >
              <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-4">
                <h3 className="text-white font-bold text-sm">Estimasi Biaya Pengiriman</h3>
                <p className="text-brand-100/80 text-xs mt-1">
                  BATU → {selectedSubdistName}, {selectedDistName}, {selectedCityName}
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {results.map((svc, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">
                        {svc.name}
                        <span className="ml-2 text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                          {svc.service}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        ⏱ Estimasi: {svc.etd || "-"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-brand-700 text-base">Rp {formatRupiah(svc.cost)}</div>
                      <div className="text-[10px] text-gray-400">/ {weight} kg</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 px-6 py-3 text-center">
                <p className="text-[10px] text-gray-400">* Tarif dapat berubah sewaktu-waktu. Hubungi kami untuk konfirmasi final.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
